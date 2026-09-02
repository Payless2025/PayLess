// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {PolicyWallet} from "../src/PolicyWallet.sol";

/**
 * The vectors marked TS_VECTOR were produced by the TypeScript side
 * (lib/x402/permit2.ts permitDigest / uptoDigest) with identical inputs.
 * Two independent implementations agreeing on the digest is what proves the
 * contract will validate the very hashes Permit2 asks about in production —
 * the same cross-check the TS side already runs against viem.
 */

interface Vm {
    function etch(address target, bytes calldata code) external;
    function sign(uint256 pk, bytes32 digest) external returns (uint8, bytes32, bytes32);
    function addr(uint256 pk) external returns (address);
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
}

contract MockPermit2 {
    // The REAL domain separator of Permit2 on chain 4663, so digests here are
    // digests there.
    function DOMAIN_SEPARATOR() external pure returns (bytes32) {
        return 0x448684463b1f7965c1ec7c249cee11520df24c07242efc2b20f6e54c85614fad;
    }
}

contract MockUSDG {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function mint(address to, uint256 v) external { balanceOf[to] += v; }
    function approve(address s, uint256 v) external returns (bool) { allowance[msg.sender][s] = v; return true; }
    function transfer(address to, uint256 v) external returns (bool) {
        balanceOf[msg.sender] -= v; balanceOf[to] += v; return true;
    }
    function transferFrom(address f, address t, uint256 v) external returns (bool) {
        allowance[f][msg.sender] -= v; balanceOf[f] -= v; balanceOf[t] += v; return true;
    }
}

contract PolicyWalletTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    bytes4 constant MAGIC = 0x1626ba7e;
    bytes4 constant NOT_MAGIC = 0xffffffff;

    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address constant EXACT_PROXY = 0x402085c248EeA27D92E8b30b2C58ed07f9E20001;
    address constant UPTO_PROXY = 0x4020A4f3b7b90ccA423B9fabCc0CE57C6C240002;
    address constant SELLER = 0x426f8846B5011d5aCf659FE5bFBC5fdA6123f759;
    address constant FACILITATOR = 0x758223512c9b88af3eE5985C38276C8728808129;

    // TS_VECTOR: lib/x402/permit2.ts with token=USDG amount=10000 nonce=7
    // deadline=1790000000 to=SELLER validAfter=0 (facilitator above for upto)
    bytes32 constant TS_EXACT_DIGEST =
        0xcf9e006ecb3fdb7b9bb07e21b2017fdfe604566896c2bd2cbf5881eb46767290;
    bytes32 constant TS_UPTO_DIGEST =
        0xd5a8dfd558f17488a5f215eb59adc7df853ca72293e54f50dbc913edd98579a9;

    uint256 constant SESSION_PK = 0xA11CE;
    uint256 constant WRONG_PK = 0xB0B;

    PolicyWallet wallet;

    function setUp() public {
        // The digest vectors embed the real USDG address, and the constructor
        // now calls approve on the token — so the real address gets mock code.
        vm.etch(USDG, address(new MockUSDG()).code);
        wallet = new PolicyWallet(
            address(new MockPermit2()),
            EXACT_PROXY,
            UPTO_PROXY,
            USDG,
            address(this),        // operator: the test
            vm.addr(SESSION_PK),
            20000,                // maxPerCall: 0.02 USDG
            1 hours
        );
        wallet.setRecipient(SELLER, true);
        wallet.setFacilitator(FACILITATOR, true);
        vm.warp(1789999000); // just under the vector's deadline
    }

    function blob(uint8 scheme, uint256 amount, address to, address facilitator, uint256 pk, bytes32 digest)
        internal returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encode(
            scheme, USDG, amount, uint256(7), uint256(1790000000),
            to, facilitator, uint256(0), abi.encodePacked(r, s, v)
        );
    }

    // ------------------------------------------------------------ happy path
    function test_exact_matchesTypescriptDigestAndValidates() public {
        bytes memory sig = blob(0, 10000, SELLER, address(0), SESSION_PK, TS_EXACT_DIGEST);
        assert(wallet.isValidSignature(TS_EXACT_DIGEST, sig) == MAGIC);
    }

    function test_upto_matchesTypescriptDigestAndValidates() public {
        bytes memory sig = blob(1, 10000, SELLER, FACILITATOR, SESSION_PK, TS_UPTO_DIGEST);
        assert(wallet.isValidSignature(TS_UPTO_DIGEST, sig) == MAGIC);
    }

    // ------------------------------------------------- the load-bearing line
    function test_fieldsNotMatchingHashAreWorthless() public {
        // Policy-clean fields, but presented against a different hash: the
        // digest equality must catch it, or the policy is decoration.
        bytes32 otherHash = keccak256("something permit2 is actually executing");
        bytes memory sig = blob(0, 10000, SELLER, address(0), SESSION_PK, otherHash);
        assert(wallet.isValidSignature(otherHash, sig) == NOT_MAGIC);
    }

    // ---------------------------------------------------------------- policy
    function test_rejectsOverPerCallCap() public {
        // 25000 > 20000 cap. Digest recomputes fine; policy says no.
        bytes32 digest = realDigest(0, 25000, SELLER, address(0));
        bytes memory sig = blob(0, 25000, SELLER, address(0), SESSION_PK, digest);
        assert(wallet.isValidSignature(digest, sig) == NOT_MAGIC);
    }

    function test_rejectsUnlistedRecipient() public {
        address stranger = address(0xDEAD);
        bytes32 digest = realDigest(0, 10000, stranger, address(0));
        bytes memory sig = blob(0, 10000, stranger, address(0), SESSION_PK, digest);
        assert(wallet.isValidSignature(digest, sig) == NOT_MAGIC);
    }

    function test_rejectsUnlistedFacilitatorOnUpto() public {
        address rogue = address(0xBEEF);
        bytes32 digest = realDigest(1, 10000, SELLER, rogue);
        bytes memory sig = blob(1, 10000, SELLER, rogue, SESSION_PK, digest);
        assert(wallet.isValidSignature(digest, sig) == NOT_MAGIC);
    }

    function test_rejectsFarFutureDeadline() public {
        vm.warp(1790000000 - 2 hours - 1); // deadline now further than maxTtl away
        bytes memory sig = blob(0, 10000, SELLER, address(0), SESSION_PK, TS_EXACT_DIGEST);
        assert(wallet.isValidSignature(TS_EXACT_DIGEST, sig) == NOT_MAGIC);
    }

    function test_rejectsWrongSigner() public {
        bytes memory sig = blob(0, 10000, SELLER, address(0), WRONG_PK, TS_EXACT_DIGEST);
        assert(wallet.isValidSignature(TS_EXACT_DIGEST, sig) == NOT_MAGIC);
    }

    function test_revocationIsImmediate() public {
        bytes memory sig = blob(0, 10000, SELLER, address(0), SESSION_PK, TS_EXACT_DIGEST);
        assert(wallet.isValidSignature(TS_EXACT_DIGEST, sig) == MAGIC);
        wallet.setSessionKey(address(0));
        assert(wallet.isValidSignature(TS_EXACT_DIGEST, sig) == NOT_MAGIC);
    }

    function test_rejectsForeignToken() public {
        // Same shape, different token: the wallet speaks one token only.
        address fake = address(0xFA4E);
        bytes32 digest = realDigestToken(fake, 10000);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SESSION_PK, digest);
        bytes memory sig = abi.encode(
            uint8(0), fake, uint256(10000), uint256(7), uint256(1790000000),
            SELLER, address(0), uint256(0), abi.encodePacked(r, s, v)
        );
        assert(wallet.isValidSignature(digest, sig) == NOT_MAGIC);
    }

    // -------------------------------------------------------------- operator
    function test_refillPullsExactlyTheFloatOncePerDay() public {
        MockUSDG usdg = new MockUSDG();
        PolicyWallet w = new PolicyWallet(
            address(new MockPermit2()), EXACT_PROXY, UPTO_PROXY, address(usdg),
            address(this), vm.addr(SESSION_PK), 20000, 1 hours
        );
        usdg.mint(address(this), 1_000_000);
        usdg.approve(address(w), 1_000_000);
        w.setDailyFloat(50000);

        w.refill();
        assert(usdg.balanceOf(address(w)) == 50000);

        vm.expectRevert(PolicyWallet.RefillNotDue.selector);
        w.refill();

        vm.warp(block.timestamp + 1 days);
        w.refill();
        assert(usdg.balanceOf(address(w)) == 100000);
    }

    function test_strangersOperateNothing() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(PolicyWallet.NotOperator.selector);
        wallet.setSessionKey(address(0xBAD));
    }

    function test_withdrawIsTheEscapeHatch() public {
        MockUSDG usdg = new MockUSDG();
        usdg.mint(address(wallet), 12345);
        wallet.withdraw(address(usdg), SELLER, 12345);
        assert(usdg.balanceOf(SELLER) == 12345);
    }

    // ------------------------------------------------------- digest helpers
    // Mirrors the contract's derivation for cases where the vector must vary.
    // The TS_VECTOR tests above are the cross-language proof; these only vary
    // fields around it.
    bytes32 constant DOMAIN = 0x448684463b1f7965c1ec7c249cee11520df24c07242efc2b20f6e54c85614fad;

    function realDigest(uint8 scheme, uint256 amount, address to, address facilitator)
        internal pure returns (bytes32)
    {
        return realDigestFull(scheme, USDG, amount, to, facilitator);
    }

    function realDigestToken(address token, uint256 amount) internal pure returns (bytes32) {
        return realDigestFull(0, token, amount, SELLER, address(0));
    }

    function realDigestFull(uint8 scheme, address token, uint256 amount, address to, address facilitator)
        internal pure returns (bytes32)
    {
        bytes32 permissions = keccak256(abi.encode(
            keccak256("TokenPermissions(address token,uint256 amount)"), token, amount
        ));
        bytes32 witness;
        bytes32 typehash;
        address spender;
        if (scheme == 0) {
            witness = keccak256(abi.encode(
                keccak256("Witness(address to,uint256 validAfter)"), to, uint256(0)
            ));
            typehash = keccak256(
                "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,uint256 validAfter)"
            );
            spender = EXACT_PROXY;
        } else {
            witness = keccak256(abi.encode(
                keccak256("Witness(address to,address facilitator,uint256 validAfter)"), to, facilitator, uint256(0)
            ));
            typehash = keccak256(
                "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,address facilitator,uint256 validAfter)"
            );
            spender = UPTO_PROXY;
        }
        bytes32 structHash = keccak256(abi.encode(
            typehash, permissions, spender, uint256(7), uint256(1790000000), witness
        ));
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN, structHash));
    }
}

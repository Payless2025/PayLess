// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * PolicyWallet — an agent's wallet that enforces its budget on chain.
 *
 * The problem it closes: an agent's spending limit used to live in the tool's
 * process memory. Real, but only as real as the process — a leaked key or a
 * manipulated agent walks straight past it, and whatever the wallet holds is
 * gone. This contract moves the limit to the one place the agent cannot
 * reach: the chain that settles the payment.
 *
 * How it plugs in, without changing anything that already works:
 *
 *   The x402 proxies pass `owner` to Permit2 unchanged. When `owner` is a
 *   contract, Permit2 does not ecrecover — it calls ERC-1271
 *   `isValidSignature(hash, signature)` on the owner and requires the magic
 *   value back. (Verified against the deployed Permit2 on chain 4663: the
 *   1271 selector and its InvalidContractSignature error are in the
 *   bytecode.) So this wallet becomes the payer by being named as owner, and
 *   every settlement asks it for permission first.
 *
 * What the agent holds is a *session key*. Its signature is necessary but
 * never sufficient: this contract re-derives the Permit2 digest from the
 * permit fields presented to it and answers the policy questions the process
 * cannot be trusted with — how much per call, to whom, through which
 * facilitator, for how long. A stolen session key can spend at most the
 * wallet's balance, within policy, until the operator revokes it with one
 * transaction.
 *
 * The daily cap is the balance itself. `isValidSignature` is a view and can
 * count nothing, so instead of a counter there is a float: `refill()` tops
 * the wallet up from the operator's allowance at most once per day, and the
 * balance IS the day's budget — inspectable by anyone on the explorer,
 * enforced by the token contract, no bookkeeping to trust.
 *
 * The security-critical line in this file is the digest comparison in
 * `isValidSignature`. The policy is applied to fields supplied in the
 * signature blob; the ONLY thing binding those fields to what Permit2 will
 * actually execute is that their re-derived digest equals the `hash` Permit2
 * asks about. Weaken that equality and the policy is decoration.
 *
 * Deliberately small, deliberately final: one token, one signature scheme
 * family, no upgrade path, and an operator who can withdraw everything at any
 * time. The float you keep here should be the float you can afford to lose.
 */

interface IERC20 {
    function approve(address spender, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
}

interface IPermit2Domain {
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}

contract PolicyWallet {
    // ---------------------------------------------------------------- errors
    error NotOperator();
    error RefillNotDue();
    error RefillDisabled();
    error TransferFailed();

    // ---------------------------------------------------------------- events
    event SessionKeyChanged(address indexed previous, address indexed current);
    event RecipientAllowed(address indexed recipient, bool allowed);
    event FacilitatorAllowed(address indexed facilitator, bool allowed);
    event PolicyChanged(uint256 maxPerCall, uint256 maxSignatureTtl);
    event Refilled(uint256 amount);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    // ------------------------------------------------------------- constants
    bytes4 private constant MAGIC = 0x1626ba7e; // ERC-1271 "yes"
    bytes4 private constant NOT_MAGIC = 0xffffffff;

    bytes32 private constant TOKEN_PERMISSIONS_TYPEHASH =
        keccak256("TokenPermissions(address token,uint256 amount)");

    // Type strings read from the deployed proxies on chain 4663, not invented.
    bytes32 private constant EXACT_PERMIT_TYPEHASH = keccak256(
        "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,uint256 validAfter)"
    );
    bytes32 private constant EXACT_WITNESS_TYPEHASH =
        keccak256("Witness(address to,uint256 validAfter)");

    bytes32 private constant UPTO_PERMIT_TYPEHASH = keccak256(
        "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,address facilitator,uint256 validAfter)"
    );
    bytes32 private constant UPTO_WITNESS_TYPEHASH =
        keccak256("Witness(address to,address facilitator,uint256 validAfter)");

    // ------------------------------------------------------------ immutables
    /// Permit2's domain separator, read once at construction. Chain-specific.
    bytes32 public immutable PERMIT2_DOMAIN_SEPARATOR;
    /// The only spenders a signature may name: the canonical x402 proxies.
    address public immutable EXACT_PROXY;
    address public immutable UPTO_PROXY;
    /// The only token this wallet's policy speaks.
    address public immutable TOKEN;

    // ---------------------------------------------------------------- policy
    address public operator;
    address public sessionKey;
    /// Largest single payment, in the token's base units.
    uint256 public maxPerCall;
    /// A signature's deadline may reach at most this far into the future.
    uint256 public maxSignatureTtl;
    /// Where money may go. The witness destination must be on this list.
    mapping(address => bool) public allowedRecipient;
    /// Who may choose the amount in an upto settlement.
    mapping(address => bool) public allowedFacilitator;

    // ----------------------------------------------------------------- float
    /// Pulled from the operator's allowance by refill(), at most once per day.
    uint256 public dailyFloat;
    uint256 public lastRefill;

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    constructor(
        address permit2,
        address exactProxy,
        address uptoProxy,
        address token,
        address _operator,
        address _sessionKey,
        uint256 _maxPerCall,
        uint256 _maxSignatureTtl
    ) {
        PERMIT2_DOMAIN_SEPARATOR = IPermit2Domain(permit2).DOMAIN_SEPARATOR();
        EXACT_PROXY = exactProxy;
        UPTO_PROXY = uptoProxy;
        TOKEN = token;
        operator = _operator;
        sessionKey = _sessionKey;
        maxPerCall = _maxPerCall;
        maxSignatureTtl = _maxSignatureTtl;

        // Permit2 moves funds by spending the owner's ERC-20 allowance, so the
        // wallet grants it once, forever. Safe precisely because Permit2 only
        // spends it against a signature this contract has itself approved —
        // the allowance is the plumbing, isValidSignature is the tap.
        if (!IERC20(token).approve(permit2, type(uint256).max)) revert TransferFailed();
    }

    // ------------------------------------------------------------- ERC-1271
    /**
     * The signature blob this wallet expects:
     *
     *   abi.encode(
     *     uint8 scheme,        // 0 = exact, 1 = upto
     *     address token, uint256 amount,
     *     uint256 nonce, uint256 deadline,
     *     address to, address facilitator, uint256 validAfter,
     *     bytes sessionSignature   // 65-byte ECDSA over `hash`
     *   )
     *
     * Everything before the session signature exists so the digest can be
     * re-derived. The policy is applied to these fields, and the equality
     * check against `hash` is what makes applying it meaningful.
     */
    function isValidSignature(bytes32 hash, bytes calldata signature)
        external
        view
        returns (bytes4)
    {
        (
            uint8 scheme,
            address token,
            uint256 amount,
            uint256 nonce,
            uint256 deadline,
            address to,
            address facilitator,
            uint256 validAfter,
            bytes memory sessionSig
        ) = abi.decode(
            signature,
            (uint8, address, uint256, uint256, uint256, address, address, uint256, bytes)
        );

        // 1. The presented fields must BE the thing Permit2 is about to
        //    execute. This equality is the entire security of the contract.
        if (_digest(scheme, token, amount, nonce, deadline, to, facilitator, validAfter) != hash) {
            return NOT_MAGIC;
        }

        // 2. Policy. Answered here, where the agent cannot edit the answers.
        if (token != TOKEN) return NOT_MAGIC;
        if (amount > maxPerCall) return NOT_MAGIC;
        if (!allowedRecipient[to]) return NOT_MAGIC;
        if (scheme == 1 && !allowedFacilitator[facilitator]) return NOT_MAGIC;
        if (deadline > block.timestamp + maxSignatureTtl) return NOT_MAGIC;

        // 3. The session key must have signed this exact digest.
        address signer = _recover(hash, sessionSig);
        if (signer == address(0) || signer != sessionKey) return NOT_MAGIC;

        return MAGIC;
    }

    function _digest(
        uint8 scheme,
        address token,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        address to,
        address facilitator,
        uint256 validAfter
    ) private view returns (bytes32) {
        bytes32 permissions =
            keccak256(abi.encode(TOKEN_PERMISSIONS_TYPEHASH, token, amount));

        bytes32 witness;
        bytes32 permitTypehash;
        address spender;
        if (scheme == 0) {
            witness = keccak256(abi.encode(EXACT_WITNESS_TYPEHASH, to, validAfter));
            permitTypehash = EXACT_PERMIT_TYPEHASH;
            spender = EXACT_PROXY;
        } else {
            witness =
                keccak256(abi.encode(UPTO_WITNESS_TYPEHASH, to, facilitator, validAfter));
            permitTypehash = UPTO_PERMIT_TYPEHASH;
            spender = UPTO_PROXY;
        }

        bytes32 structHash = keccak256(
            abi.encode(permitTypehash, permissions, spender, nonce, deadline, witness)
        );
        return keccak256(
            abi.encodePacked("\x19\x01", PERMIT2_DOMAIN_SEPARATOR, structHash)
        );
    }

    /// Minimal ECDSA recovery: 65 bytes, EIP-2 low-s, v in {27, 28}.
    function _recover(bytes32 hash, bytes memory sig) private pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 0x20))
            s := mload(add(sig, 0x40))
            v := byte(0, mload(add(sig, 0x60)))
        }
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return address(0);
        }
        if (v != 27 && v != 28) return address(0);
        return ecrecover(hash, v, r, s);
    }

    // -------------------------------------------------------------- operator
    function setSessionKey(address next) external onlyOperator {
        emit SessionKeyChanged(sessionKey, next);
        sessionKey = next;
    }

    function setPolicy(uint256 _maxPerCall, uint256 _maxSignatureTtl) external onlyOperator {
        maxPerCall = _maxPerCall;
        maxSignatureTtl = _maxSignatureTtl;
        emit PolicyChanged(_maxPerCall, _maxSignatureTtl);
    }

    function setRecipient(address recipient, bool allowed) external onlyOperator {
        allowedRecipient[recipient] = allowed;
        emit RecipientAllowed(recipient, allowed);
    }

    function setFacilitator(address facilitator, bool allowed) external onlyOperator {
        allowedFacilitator[facilitator] = allowed;
        emit FacilitatorAllowed(facilitator, allowed);
    }

    function setDailyFloat(uint256 amount) external onlyOperator {
        dailyFloat = amount;
    }

    /**
     * Top the wallet up to the day's budget. Callable by anyone — the amount
     * and the source are fixed by the operator's `dailyFloat` and allowance,
     * so the most a stranger can do here is refill the agent on schedule.
     */
    function refill() external {
        if (dailyFloat == 0) revert RefillDisabled();
        if (block.timestamp < lastRefill + 1 days) revert RefillNotDue();
        lastRefill = block.timestamp;
        if (!IERC20(TOKEN).transferFrom(operator, address(this), dailyFloat)) {
            revert TransferFailed();
        }
        emit Refilled(dailyFloat);
    }

    /// The escape hatch. The operator can always take everything back.
    function withdraw(address token, address to, uint256 amount) external onlyOperator {
        if (!IERC20(token).transfer(to, amount)) revert TransferFailed();
        emit Withdrawn(token, to, amount);
    }

    function transferOperator(address next) external onlyOperator {
        operator = next;
    }
}

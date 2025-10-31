from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="payless-sdk",
    version="1.0.0",
    author="Payless",
    author_email="support@payless.com",
    description="Official Payless SDK for Python - Accept crypto payments with x402 protocol",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Payless2025/PayLess",
    project_urls={
        "Bug Tracker": "https://github.com/Payless2025/PayLess/issues",
        "Documentation": "https://payless.gitbook.io/payless-documentation",
        "Source Code": "https://github.com/Payless2025/PayLess/tree/master/sdk/python",
    },
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.31.0",
        "base58>=2.1.1",
        "PyNaCl>=1.5.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=23.0.0",
            "mypy>=1.0.0",
        ],
    },
    keywords="payless x402 crypto payments solana usdc blockchain micropayments api",
)


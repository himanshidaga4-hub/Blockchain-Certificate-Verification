# PDEU CertiChain: Blockchain-Based Academic Certificate Verification System

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![University](https://img.shields.io/badge/University-Pandit%20Deendayal%20Energy%20University-orange.svg)](https://pdeu.ac.in)
[![Web Crypto](https://img.shields.io/badge/Cryptography-SHA--256%20%7C%20ECDSA-green.svg)](https://w3c.github.io/webcrypto/)
[![W3C Verifiable Credentials](https://img.shields.io/badge/Standard-W3C%20VC%20JSON--LD-purple.svg)](https://www.w3.org/TR/vc-data-model/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**PDEU CertiChain** is an enterprise-grade, decentralized platform designed for **Pandit Deendayal Energy University (PDEU, Gandhinagar, Gujarat)** for issuing, notarizing, and verifying academic degrees, transcripts, and credentials on the blockchain. It eliminates diploma fraud through cryptographic SHA-256 document fingerprinting, decentralized identifiers (DIDs), Merkle Tree batch notarization, and tamper-evident smart contracts.

---

## 🌟 Key Architecture & Capabilities

### 1. 🔍 4-Way Public Verifier Portal
- **Instant Search**: Verify credentials by PDEU Serial ID (`PDEU-2025-CE-1042`) or raw SHA-256 cryptographic hash (`0x...`).
- **PDF & Document Drag & Drop**: Computes cryptographic SHA-256 fingerprint in client-side zero-knowledge and queries the blockchain.
- **Live Optical QR Scanner**: Point smartphone or webcam at any certificate QR code for immediate on-chain authentication.
- **W3C Verifiable Credentials (JSON-LD)**: Validates ECDSA cryptographic signatures against PDEU university DID public keys (`did:certichain:pdeu.ac.in`).
- **5-Step Cryptographic Audit Trail**: Visual breakdown of Document Integrity, PDEU Accreditation Authority, Blockchain Consensus Block, and Revocation Status.
- **🧪 Interactive Tamper Testing Sandbox**: Real-time simulation allowing verifiers to modify student name, grade, or branch by 1 character to visually witness instant hash divergence and cryptographic fraud detection.

### 2. 🏛️ PDEU University / Issuer Portal
- **Accredited Institution Management**: Pandit Deendayal Energy University (PDEU) with private key signing.
- **Single Degree Notarization**: Real-time side-by-side PDEU certificate render preview, metadata canonicalization (RFC 8785), ECDSA digital signing, and automated blockchain mining.
- **🌳 Merkle Tree Batch Issuance**: Notarize hundreds of PDEU student diplomas in a single gas-efficient transaction using cryptographic Merkle Root proofs.
- **On-Chain Revocation Control**: Immutable revocation recording with custom audit reasons (e.g. course re-audit, academic misconduct).

### 3. 🎓 Student Academic Locker & Credential Passport
- **Digital Credential Passport**: View all degrees and diplomas issued under student enrollment ID (e.g. `PDEU-21BCE042`).
- **Verifiable PDF Export**: Download high-resolution PDEU certificate parchment with embedded QR codes, metallic gold seals, and cryptographic ledger strips.
- **1-Click Shareable Verification Link**: Share direct verification URLs with recruiters and employers.
- **W3C Standard JSON-LD Export**: Download machine-readable verifiable credentials for sovereign identity wallets.

### 4. 🧊 Blockchain Explorer & Smart Contract Console
- **Live Block Feed**: Inspect mined blocks, PoA consensus metrics, gas consumption, and Merkle tree roots.
- **Solidity Smart Contract Inspector**: Full source code and ABI specification for `CertiChainRegistry.sol`.
- **Live Contract Event Stream**: Real-time feed of `CertificateIssued`, `BatchIssued`, and `CertificateRevoked` events.
- **Cryptographic Chain Auditor**: 1-click verification of blockchain SHA-256 hash continuity.

---

## 📁 System Architecture & Directory Structure

```
project/
├── index.html                   # Single-Page Web Application Shell (PDEU Theme)
├── README.md                    # Project Documentation
├── contracts/
│   └── CertiChainRegistry.sol   # Solidity Smart Contract (EVM / Sepolia)
├── css/
│   ├── main.css                 # Theme, Dark Mode, Navbar, Utilities
│   ├── certificate.css          # PDEU Energy Gold Parchment, Guilloché Borders, Seals
│   └── components.css           # Verifier, Tamper Sandbox, Explorer, Modals
└── js/
    ├── crypto/
    │   ├── sha256.js            # SHA-256 & RFC 8785 Canonicalizer
    │   ├── merkleTree.js        # Merkle Tree generator & proof verifier
    │   └── signatures.js        # ECDSA signing & W3C VC JSON-LD formatter
    ├── blockchain/
    │   ├── blockchainEngine.js  # In-browser simulated cryptographic node
    │   ├── smartContract.js     # Virtual EVM state machine & event dispatcher
    │   └── web3Service.js       # Ethers.js & MetaMask wallet provider
    ├── modules/
    │   ├── issuer.js            # PDEU issuance & revocation logic
    │   ├── student.js           # Student locker & credential passport
    │   ├── verifier.js          # 4-Way verification & tamper sandbox
    │   ├── certificatePdf.js    # Client-side PDF export & QR code renderer
    │   └── explorer.js          # Ledger metrics, block feed & contract code
    ├── data/
    │   └── mockData.js          # PDEU Schools, Departments & pre-loaded demo certificates
    └── app.js                   # Main application orchestrator & sound synthesis
```

---

## 🚀 How to Run

In PowerShell / Terminal:
```powershell
start index.html
```
Or open [**`index.html`**](file:///d:/antigravity/New%20folder/project/index.html) directly in any browser.

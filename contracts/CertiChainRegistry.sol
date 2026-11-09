// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CertiChainRegistry
 * @dev Decentralized Academic Certificate & Credential Verification Registry
 * Supports Single Certificate Notarization, Merkle Root Batch Verification,
 * Soulbound Credential Issuance, and On-Chain Revocation with Auditing.
 */
contract CertiChainRegistry {
    // Contract Owner / System Admin
    address public owner;

    // Institution Structure
    struct Institution {
        string name;
        string did;             // Decentralized Identifier (e.g. did:certichain:mit)
        string officialEmail;
        string website;
        bool isAuthorized;
        uint256 registeredAt;
    }

    // Certificate Record Structure
    struct CertificateRecord {
        bytes32 certHash;       // SHA-256 hash of the canonical certificate data / PDF
        string certId;          // Unique Serial / Public ID (e.g. MIT-2026-CS-8842)
        string studentName;     // Student Full Name
        string studentId;       // Student University ID
        string degree;          // e.g. "Bachelor of Science in Computer Science"
        string major;           // e.g. "Artificial Intelligence & Distributed Systems"
        string cgpa;            // e.g. "3.95 / 4.00" (Summa Cum Laude)
        uint256 graduationDate; // Timestamp of graduation
        address issuerAddress;  // Wallet address of the issuing institution
        string ipfsMetadataUri; // IPFS URI for extended metadata / encrypted transcript
        uint256 issuedAt;       // Timestamp when notarized on-chain
        bool isRevoked;         // Revocation flag
        string revocationReason;// Reason for revocation if applicable
        uint256 revokedAt;      // Timestamp of revocation
        bytes32 merkleRoot;     // Merkle Root if issued as part of a batch (0 if single)
    }

    // Batch Record for Merkle Tree batch notarization
    struct BatchRecord {
        bytes32 merkleRoot;
        string batchName;
        uint256 totalCertificates;
        address issuerAddress;
        uint256 issuedAt;
        string ipfsBatchUri;
    }

    // Mappings
    mapping(address => Institution) public institutions;
    mapping(bytes32 => CertificateRecord) public certificatesByHash;
    mapping(string => bytes32) public certIdToHash;
    mapping(bytes32 => BatchRecord) public batchesByRoot;
    
    // Arrays for enumeration and explorer
    bytes32[] public allCertHashes;
    bytes32[] public allBatchRoots;
    address[] public authorizedInstitutionsList;

    // Events
    event InstitutionAuthorized(address indexed institutionAddress, string name, string did);
    event InstitutionDeauthorized(address indexed institutionAddress);
    event CertificateIssued(
        bytes32 indexed certHash,
        string indexed certId,
        address indexed issuerAddress,
        string studentName,
        string degree,
        uint256 issuedAt
    );
    event BatchIssued(
        bytes32 indexed merkleRoot,
        string batchName,
        uint256 totalCertificates,
        address indexed issuerAddress,
        uint256 issuedAt
    );
    event CertificateRevoked(
        bytes32 indexed certHash,
        string certId,
        address indexed issuerAddress,
        string reason,
        uint256 revokedAt
    );

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "CertiChain: Only contract owner can execute");
        _;
    }

    modifier onlyAuthorizedInstitution() {
        require(
            institutions[msg.sender].isAuthorized,
            "CertiChain: Caller is not an authorized academic institution"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Authorize an academic institution to issue certificates
     */
    function authorizeInstitution(
        address _instAddress,
        string memory _name,
        string memory _did,
        string memory _email,
        string memory _website
    ) external onlyOwner {
        require(_instAddress != address(0), "CertiChain: Invalid address");
        require(!institutions[_instAddress].isAuthorized, "CertiChain: Already authorized");

        institutions[_instAddress] = Institution({
            name: _name,
            did: _did,
            officialEmail: _email,
            website: _website,
            isAuthorized: true,
            registeredAt: block.timestamp
        });

        authorizedInstitutionsList.push(_instAddress);
        emit InstitutionAuthorized(_instAddress, _name, _did);
    }

    /**
     * @notice Deauthorize an academic institution
     */
    function deauthorizeInstitution(address _instAddress) external onlyOwner {
        require(institutions[_instAddress].isAuthorized, "CertiChain: Institution not authorized");
        institutions[_instAddress].isAuthorized = false;
        emit InstitutionDeauthorized(_instAddress);
    }

    /**
     * @notice Issue and notarize a single academic certificate
     */
    function issueCertificate(
        bytes32 _certHash,
        string memory _certId,
        string memory _studentName,
        string memory _studentId,
        string memory _degree,
        string memory _major,
        string memory _cgpa,
        uint256 _graduationDate,
        string memory _ipfsMetadataUri
    ) external onlyAuthorizedInstitution {
        require(_certHash != bytes32(0), "CertiChain: Invalid certificate hash");
        require(certificatesByHash[_certHash].issuedAt == 0, "CertiChain: Certificate already exists");
        require(certIdToHash[_certId] == bytes32(0), "CertiChain: Certificate ID already in use");

        certificatesByHash[_certHash] = CertificateRecord({
            certHash: _certHash,
            certId: _certId,
            studentName: _studentName,
            studentId: _studentId,
            degree: _degree,
            major: _major,
            cgpa: _cgpa,
            graduationDate: _graduationDate,
            issuerAddress: msg.sender,
            ipfsMetadataUri: _ipfsMetadataUri,
            issuedAt: block.timestamp,
            isRevoked: false,
            revocationReason: "",
            revokedAt: 0,
            merkleRoot: bytes32(0)
        });

        certIdToHash[_certId] = _certHash;
        allCertHashes.push(_certHash);

        emit CertificateIssued(_certHash, _certId, msg.sender, _studentName, _degree, block.timestamp);
    }

    /**
     * @notice Issue a batch of certificates notarized by their Merkle Tree Root
     */
    function issueBatch(
        bytes32 _merkleRoot,
        string memory _batchName,
        uint256 _totalCertificates,
        string memory _ipfsBatchUri
    ) external onlyAuthorizedInstitution {
        require(_merkleRoot != bytes32(0), "CertiChain: Invalid Merkle Root");
        require(batchesByRoot[_merkleRoot].issuedAt == 0, "CertiChain: Batch already notarized");

        batchesByRoot[_merkleRoot] = BatchRecord({
            merkleRoot: _merkleRoot,
            batchName: _batchName,
            totalCertificates: _totalCertificates,
            issuerAddress: msg.sender,
            issuedAt: block.timestamp,
            ipfsBatchUri: _ipfsBatchUri
        });

        allBatchRoots.push(_merkleRoot);
        emit BatchIssued(_merkleRoot, _batchName, _totalCertificates, msg.sender, block.timestamp);
    }

    /**
     * @notice Revoke a previously issued certificate with reason
     */
    function revokeCertificate(bytes32 _certHash, string memory _reason) external {
        CertificateRecord storage record = certificatesByHash[_certHash];
        require(record.issuedAt != 0, "CertiChain: Certificate does not exist");
        require(!record.isRevoked, "CertiChain: Certificate already revoked");
        require(
            record.issuerAddress == msg.sender || msg.sender == owner,
            "CertiChain: Only issuing institution or owner can revoke"
        );

        record.isRevoked = true;
        record.revocationReason = _reason;
        record.revokedAt = block.timestamp;

        emit CertificateRevoked(_certHash, record.certId, msg.sender, _reason, block.timestamp);
    }

    /**
     * @notice Verify a certificate by its hash
     */
    function verifyCertificate(bytes32 _certHash)
        external
        view
        returns (
            bool exists,
            bool isValid,
            CertificateRecord memory record,
            Institution memory issuer
        )
    {
        record = certificatesByHash[_certHash];
        if (record.issuedAt == 0) {
            return (false, false, record, issuer);
        }

        issuer = institutions[record.issuerAddress];
        bool active = (!record.isRevoked && issuer.isAuthorized);
        return (true, active, record, issuer);
    }

    /**
     * @notice Verify inclusion of a certificate in a batch via Merkle Proof
     */
    function verifyMerkleProof(
        bytes32 _leafHash,
        bytes32[] memory _proof,
        bytes32 _merkleRoot
    ) public pure returns (bool) {
        bytes32 computedHash = _leafHash;

        for (uint256 i = 0; i < _proof.length; i++) {
            bytes32 proofElement = _proof[i];

            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == _merkleRoot;
    }

    /**
     * @notice Get counts for dashboard statistics
     */
    function getStats() external view returns (
        uint256 totalCertificates,
        uint256 totalBatches,
        uint256 totalInstitutions
    ) {
        return (
            allCertHashes.length,
            allBatchRoots.length,
            authorizedInstitutionsList.length
        );
    }
}

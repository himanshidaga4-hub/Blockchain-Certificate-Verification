/**
 * CertiChain Smart Contract Virtual State Machine
 * Executes business logic corresponding to CertiChainRegistry.sol on the simulated ledger.
 */
class CertiChainContract {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.storageKey = 'certichain_contract_state_v1';
    this.contractAddress = '0x71C8A1f36402ecA7b09A8e907C16F0B2d3D52A0b';
    this.owner = '0xSystemDeployerAdminAddress';
    this.institutions = {};
    this.certificatesByHash = {};
    this.certIdToHash = {};
    this.batchesByRoot = {};
    this.events = [];
    this.init();
  }

  async init() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.institutions = parsed.institutions || {};
        this.certificatesByHash = parsed.certificatesByHash || {};
        this.certIdToHash = parsed.certIdToHash || {};
        this.batchesByRoot = parsed.batchesByRoot || {};
        this.events = parsed.events || [];
        if (Object.keys(this.institutions).length > 0) {
          return;
        }
      } catch (e) {
        console.warn('Failed to load contract state:', e);
      }
    }

    // Populate Initial Authorized Universities and Demo Certificates
    await this.seedInitialData();
  }

  async seedInitialData() {
    // 1. Authorize Institutions
    for (const inst of MOCK_DATA.institutions) {
      this.institutions[inst.address.toLowerCase()] = {
        id: inst.id,
        name: inst.name,
        shortName: inst.shortName,
        did: inst.did,
        officialEmail: inst.email,
        website: inst.website,
        address: inst.address,
        isAuthorized: true,
        registeredAt: 1704067200000,
        publicKey: inst.publicKey,
        logo: inst.logo,
        themeColor: inst.themeColor,
        accentColor: inst.accentColor
      };
    }

    // 2. Issue Pre-Loaded Initial Certificates
    for (const cert of MOCK_DATA.initialCertificates) {
      const issuer = MOCK_DATA.institutions.find(i => i.id === cert.issuerId);
      if (!issuer) continue;

      // Deterministic canonical hash calculation
      const canonicalData = {
        certId: cert.certId,
        studentName: cert.studentName,
        studentId: cert.studentId,
        degree: cert.degree,
        major: cert.major,
        cgpa: cert.cgpa,
        graduationDate: cert.graduationDate,
        issuerAddress: issuer.address
      };
      
      const certHash = await CryptoEngine.sha256(canonicalData);
      const signature = await SignatureEngine.signCertificateHash(certHash, { privateKeyHex: issuer.privateKey });

      // Transaction notarization
      const tx = {
        from: issuer.address,
        to: this.contractAddress,
        method: 'issueCertificate',
        params: { certHash, certId: cert.certId, studentName: cert.studentName, degree: cert.degree },
        timestamp: cert.issuedAt,
        gasUsed: 68420
      };

      const mined = await this.blockchain.submitTransaction(tx);

      const record = {
        ...cert,
        certHash,
        signature,
        issuerAddress: issuer.address,
        txHash: mined.txHash,
        blockNumber: mined.blockNumber,
        blockHash: mined.blockHash,
        merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000'
      };

      this.certificatesByHash[certHash.toLowerCase()] = record;
      this.certIdToHash[cert.certId.toUpperCase()] = certHash.toLowerCase();

      this.events.unshift({
        event: 'CertificateIssued',
        certHash,
        certId: cert.certId,
        issuerAddress: issuer.address,
        studentName: cert.studentName,
        degree: cert.degree,
        blockNumber: mined.blockNumber,
        txHash: mined.txHash,
        timestamp: cert.issuedAt
      });
    }

    this.save();
  }

  /**
   * Issue single certificate on-chain
   */
  async issueCertificate(certData, issuerProfile) {
    const canonicalPayload = {
      certId: certData.certId,
      studentName: certData.studentName,
      studentId: certData.studentId,
      degree: certData.degree,
      major: certData.major,
      cgpa: certData.cgpa,
      graduationDate: certData.graduationDate,
      issuerAddress: issuerProfile.address
    };

    const certHash = await CryptoEngine.sha256(canonicalPayload);
    
    if (this.certificatesByHash[certHash.toLowerCase()]) {
      throw new Error(`Certificate with hash ${certHash.substring(0, 10)}... already exists on-chain.`);
    }
    if (this.certIdToHash[certData.certId.toUpperCase()]) {
      throw new Error(`Certificate ID ${certData.certId} is already registered on blockchain.`);
    }

    const signature = await SignatureEngine.signCertificateHash(certHash, issuerProfile);

    const tx = {
      from: issuerProfile.address,
      to: this.contractAddress,
      method: 'issueCertificate',
      params: {
        certHash,
        certId: certData.certId,
        studentName: certData.studentName,
        degree: certData.degree
      },
      timestamp: Date.now(),
      gasUsed: 71200
    };

    const receipt = await this.blockchain.submitTransaction(tx);

    const record = {
      ...certData,
      certHash,
      signature,
      issuerAddress: issuerProfile.address,
      issuerId: issuerProfile.id,
      issuedAt: receipt.timestamp,
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      isRevoked: false,
      revocationReason: '',
      revokedAt: 0,
      merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000'
    };

    this.certificatesByHash[certHash.toLowerCase()] = record;
    this.certIdToHash[certData.certId.toUpperCase()] = certHash.toLowerCase();

    this.events.unshift({
      event: 'CertificateIssued',
      certHash,
      certId: certData.certId,
      issuerAddress: issuerProfile.address,
      studentName: certData.studentName,
      degree: certData.degree,
      blockNumber: receipt.blockNumber,
      txHash: receipt.txHash,
      timestamp: receipt.timestamp
    });

    this.save();
    return record;
  }

  /**
   * Batch Issue Certificates using Merkle Tree
   */
  async issueBatchCertificates(certList, batchName, issuerProfile) {
    const leafHashes = [];
    const preparedCerts = [];

    for (const cert of certList) {
      const canonicalPayload = {
        certId: cert.certId,
        studentName: cert.studentName,
        studentId: cert.studentId,
        degree: cert.degree,
        major: cert.major,
        cgpa: cert.cgpa,
        graduationDate: cert.graduationDate,
        issuerAddress: issuerProfile.address
      };
      const hash = await CryptoEngine.sha256(canonicalPayload);
      leafHashes.push(hash);
      preparedCerts.push({ cert, hash, canonicalPayload });
    }

    const tree = new MerkleTree(leafHashes);
    const merkleRoot = tree.getRoot();

    const tx = {
      from: issuerProfile.address,
      to: this.contractAddress,
      method: 'issueBatch',
      params: {
        merkleRoot,
        batchName,
        totalCertificates: certList.length
      },
      timestamp: Date.now(),
      gasUsed: 125000
    };

    const receipt = await this.blockchain.submitTransaction(tx);

    // Save batch record
    this.batchesByRoot[merkleRoot.toLowerCase()] = {
      merkleRoot,
      batchName,
      totalCertificates: certList.length,
      issuerAddress: issuerProfile.address,
      issuedAt: receipt.timestamp,
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber
    };

    // Save individual certificates with their respective Merkle Proofs
    const issuedResults = [];
    for (let i = 0; i < preparedCerts.length; i++) {
      const { cert, hash } = preparedCerts[i];
      const proof = tree.getProof(i);
      const signature = await SignatureEngine.signCertificateHash(hash, issuerProfile);

      const record = {
        ...cert,
        certHash: hash,
        signature,
        merkleRoot,
        merkleProof: proof,
        issuerAddress: issuerProfile.address,
        issuerId: issuerProfile.id,
        issuedAt: receipt.timestamp,
        txHash: receipt.txHash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        isRevoked: false,
        revocationReason: '',
        revokedAt: 0
      };

      this.certificatesByHash[hash.toLowerCase()] = record;
      this.certIdToHash[cert.certId.toUpperCase()] = hash.toLowerCase();
      issuedResults.push(record);
    }

    this.events.unshift({
      event: 'BatchIssued',
      merkleRoot,
      batchName,
      totalCertificates: certList.length,
      issuerAddress: issuerProfile.address,
      blockNumber: receipt.blockNumber,
      txHash: receipt.txHash,
      timestamp: receipt.timestamp
    });

    this.save();
    return { batch: this.batchesByRoot[merkleRoot.toLowerCase()], certificates: issuedResults };
  }

  /**
   * Revoke certificate on-chain
   */
  async revokeCertificate(certHash, reason, callerAddress) {
    const cert = this.certificatesByHash[certHash.toLowerCase()];
    if (!cert) {
      throw new Error("Certificate does not exist on blockchain.");
    }
    if (cert.isRevoked) {
      throw new Error("Certificate has already been revoked.");
    }

    const tx = {
      from: callerAddress || cert.issuerAddress,
      to: this.contractAddress,
      method: 'revokeCertificate',
      params: { certHash, reason },
      timestamp: Date.now(),
      gasUsed: 49000
    };

    const receipt = await this.blockchain.submitTransaction(tx);

    cert.isRevoked = true;
    cert.revocationReason = reason;
    cert.revokedAt = receipt.timestamp;

    this.events.unshift({
      event: 'CertificateRevoked',
      certHash,
      certId: cert.certId,
      issuerAddress: callerAddress || cert.issuerAddress,
      reason,
      blockNumber: receipt.blockNumber,
      txHash: receipt.txHash,
      timestamp: receipt.timestamp
    });

    this.save();
    return receipt;
  }

  /**
   * Comprehensive On-Chain Verification Query
   */
  verifyCertificate(certHashOrId) {
    let hash = certHashOrId.trim();
    if (!hash.startsWith('0x')) {
      // Check if it's a CertId lookup
      const resolved = this.certIdToHash[hash.toUpperCase()];
      if (resolved) {
        hash = resolved;
      }
    }

    const record = this.certificatesByHash[hash.toLowerCase()];
    if (!record) {
      return {
        exists: false,
        isValid: false,
        status: 'NOT_FOUND',
        message: 'Certificate not found in blockchain registry.'
      };
    }

    const issuer = this.institutions[record.issuerAddress.toLowerCase()];
    const isIssuerAuthorized = issuer ? issuer.isAuthorized : false;

    if (record.isRevoked) {
      return {
        exists: true,
        isValid: false,
        status: 'REVOKED',
        message: 'This certificate was officially REVOKED on blockchain.',
        record,
        issuer
      };
    }

    if (!isIssuerAuthorized) {
      return {
        exists: true,
        isValid: false,
        status: 'UNAUTHORIZED_ISSUER',
        message: 'Issuing institution is no longer authorized on the network.',
        record,
        issuer
      };
    }

    return {
      exists: true,
      isValid: true,
      status: 'VERIFIED_AUTHENTIC',
      message: 'Cryptographically Verified & Active on CertiChain Blockchain.',
      record,
      issuer
    };
  }

  getAllCertificates() {
    return Object.values(this.certificatesByHash);
  }

  getInstitution(addressOrId) {
    const list = Object.values(this.institutions);
    return list.find(i => 
      i.address.toLowerCase() === addressOrId.toLowerCase() || 
      i.id.toLowerCase() === addressOrId.toLowerCase()
    );
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        institutions: this.institutions,
        certificatesByHash: this.certificatesByHash,
        certIdToHash: this.certIdToHash,
        batchesByRoot: this.batchesByRoot,
        events: this.events
      }));
    } catch (e) {
      console.warn('LocalStorage contract save failed:', e);
    }
  }
}

window.CertiChainContract = CertiChainContract;
window.contract = new CertiChainContract(window.blockchain);

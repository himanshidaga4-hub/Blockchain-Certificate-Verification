/**
 * Blockchain Explorer & Smart Contract Console Controller
 * Live Block feed, Transaction Inspector, Smart Contract ABI/Source viewer, and Chain Validator.
 */
class ExplorerModule {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateMetrics();
    this.renderBlocksList();
    this.renderEventsStream();
    this.loadContractCode();

    // Listen to newly mined blocks
    window.blockchain.onBlockMined((block) => {
      this.updateMetrics();
      this.renderBlocksList();
      this.renderEventsStream();
    });
  }

  bindEvents() {
    const searchForm = document.getElementById('explorer-search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('explorer-search-input').value.trim();
        if (query) this.searchExplorer(query);
      });
    }

    const resetBtn = document.getElementById('reset-chain-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the blockchain ledger and restore initial demo state?')) {
          window.blockchain.resetToDemo();
        }
      });
    }

    const validateBtn = document.getElementById('validate-chain-btn');
    if (validateBtn) {
      validateBtn.addEventListener('click', () => this.runChainIntegrityCheck());
    }

    // Sub-tab toggles in Explorer
    const navTabs = document.querySelectorAll('.explorer-subnav-btn');
    navTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        navTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.target;
        document.querySelectorAll('.explorer-subpane').forEach(p => p.classList.toggle('active', p.id === target));
      });
    });
  }

  updateMetrics() {
    const totalBlocksEl = document.getElementById('explorer-metric-blocks');
    const totalTxsEl = document.getElementById('explorer-metric-txs');
    const totalCertsEl = document.getElementById('explorer-metric-certs');
    const chainHealthEl = document.getElementById('explorer-metric-health');

    const chain = window.blockchain.chain;
    const totalTxs = chain.reduce((acc, b) => acc + (b.transactions ? b.transactions.length : 0), 0);
    const totalCerts = Object.keys(window.contract.certificatesByHash).length;

    if (totalBlocksEl) totalBlocksEl.textContent = chain.length;
    if (totalTxsEl) totalTxsEl.textContent = totalTxs;
    if (totalCertsEl) totalCertsEl.textContent = totalCerts;
    if (chainHealthEl) chainHealthEl.textContent = '100% OPERATIONAL';
  }

  renderBlocksList() {
    const container = document.getElementById('explorer-blocks-container');
    if (!container) return;

    const chain = [...window.blockchain.chain].reverse();

    container.innerHTML = chain.map(block => `
      <div class="block-card" onclick="window.explorerModule.openBlockDetails(${block.index})">
        <div class="block-card-header">
          <div class="d-flex align-items-center gap-2">
            <span class="block-cube-icon">🧊</span>
            <span class="block-num font-mono">Block #${block.index}</span>
          </div>
          <span class="block-time text-muted text-xs">${new Date(block.timestamp).toLocaleTimeString()}</span>
        </div>
        
        <div class="block-card-body">
          <div class="block-meta-row">
            <span class="meta-label">Transactions</span>
            <span class="badge bg-cyan text-dark font-bold">${block.transactions.length} Tx${block.transactions.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="block-meta-row">
            <span class="meta-label">Gas Used</span>
            <span class="font-mono text-muted">${block.gasUsed.toLocaleString()}</span>
          </div>
          <div class="block-hash-preview">
            <span class="text-xs text-muted">Hash: </span>
            <span class="font-mono text-cyan text-xs">${block.hash.substring(0, 14)}...${block.hash.substring(56)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderEventsStream() {
    const tbody = document.getElementById('explorer-events-tbody');
    if (!tbody) return;

    const events = window.contract.events;
    if (!events || events.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">No events recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = events.slice(0, 20).map(ev => `
      <tr>
        <td>
          <span class="badge ${ev.event === 'CertificateIssued' ? 'bg-success' : (ev.event === 'BatchIssued' ? 'bg-primary' : 'bg-danger')}">
            ${ev.event}
          </span>
        </td>
        <td class="font-mono text-xs text-cyan" title="${ev.txHash}">${ev.txHash ? ev.txHash.substring(0, 12) + '...' : '0xGenesis'}</td>
        <td class="font-mono text-xs">${ev.blockNumber !== undefined ? 'Block #' + ev.blockNumber : '-'}</td>
        <td>
          <strong>${ev.studentName || ev.batchName || ev.certId || '-'}</strong>
          ${ev.reason ? `<div class="text-xs text-danger">Reason: ${ev.reason}</div>` : ''}
        </td>
        <td class="text-muted text-xs">${new Date(ev.timestamp).toLocaleTimeString()}</td>
      </tr>
    `).join('');
  }

  openBlockDetails(blockIndex) {
    const block = window.blockchain.chain.find(b => b.index === blockIndex);
    if (!block) return;

    const modalEl = document.getElementById('block-details-modal');
    if (!modalEl) return;

    document.getElementById('block-modal-index').textContent = block.index;
    document.getElementById('block-modal-hash').textContent = block.hash;
    document.getElementById('block-modal-prev-hash').textContent = block.previousHash;
    document.getElementById('block-modal-merkle-root').textContent = block.merkleRoot;
    document.getElementById('block-modal-timestamp').textContent = new Date(block.timestamp).toLocaleString();
    document.getElementById('block-modal-miner').textContent = block.miner;
    document.getElementById('block-modal-gas').textContent = block.gasUsed.toLocaleString();

    const txsListEl = document.getElementById('block-modal-txs-list');
    if (txsListEl) {
      if (block.transactions.length === 0) {
        txsListEl.innerHTML = `<div class="text-muted p-2">No transactions in this block.</div>`;
      } else {
        txsListEl.innerHTML = block.transactions.map((tx, idx) => `
          <div class="tx-item-box mb-2 p-2 rounded bg-dark border border-secondary">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="font-mono text-cyan text-xs">${tx.txHash}</span>
              <span class="badge bg-purple">${tx.method || 'Transfer'}</span>
            </div>
            <div class="text-xs text-muted">From: <span class="font-mono">${tx.from}</span></div>
            <div class="text-xs text-muted">To: <span class="font-mono">${tx.to}</span></div>
            ${tx.params ? `<pre class="text-xs text-light mt-1 mb-0 bg-black p-1 rounded font-mono">${JSON.stringify(tx.params, null, 2)}</pre>` : ''}
          </div>
        `).join('');
      }
    }

    modalEl.classList.add('active');
  }

  searchExplorer(query) {
    query = query.trim().toLowerCase();

    // 1. Check if block number
    if (!isNaN(query) && parseInt(query) >= 0 && parseInt(query) < window.blockchain.chain.length) {
      this.openBlockDetails(parseInt(query));
      return;
    }

    // 2. Check if Block Hash
    const blockMatch = window.blockchain.chain.find(b => b.hash.toLowerCase() === query);
    if (blockMatch) {
      this.openBlockDetails(blockMatch.index);
      return;
    }

    // 3. Check if Tx Hash
    for (const b of window.blockchain.chain) {
      const txMatch = b.transactions.find(t => t.txHash && t.txHash.toLowerCase() === query);
      if (txMatch) {
        this.openBlockDetails(b.index);
        return;
      }
    }

    // 4. Check if Certificate
    const certMatch = window.contract.certificatesByHash[query] || window.contract.certIdToHash[query.toUpperCase()];
    if (certMatch) {
      if (window.app) {
        window.app.switchTab('verifier');
        window.verifierModule.verifyByHash(query);
      }
      return;
    }

    if (window.app) {
      window.app.showToast(`No block, transaction, or certificate found for "${query}"`, 'info');
    }
  }

  runChainIntegrityCheck() {
    const statusEl = document.getElementById('chain-integrity-result');
    const result = window.blockchain.validateChain();

    if (result.valid) {
      if (window.app) {
        window.app.playSound('success');
        window.app.showToast('Blockchain cryptographic audit PASSED 100%! All SHA-256 blocks & hashes valid.', 'success');
      }
      if (statusEl) {
        statusEl.innerHTML = `<span class="text-success">✓ Chain Audit Passed: All ${window.blockchain.chain.length} blocks immutably linked with zero tampering.</span>`;
      }
    } else {
      if (window.app) {
        window.app.playSound('error');
        window.app.showToast(`Integrity check failed: ${result.error}`, 'error');
      }
      if (statusEl) {
        statusEl.innerHTML = `<span class="text-danger">❌ Chain Error: ${result.error}</span>`;
      }
    }
  }

  loadContractCode() {
    const codeEl = document.getElementById('solidity-code-display');
    if (codeEl) {
      codeEl.textContent = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CertiChainRegistry
 * @dev Decentralized Academic Certificate & Credential Verification Registry
 * Supports Single Certificate Notarization, Merkle Root Batch Verification,
 * Soulbound Credential Issuance, and On-Chain Revocation with Auditing.
 */
contract CertiChainRegistry {
    address public owner;

    struct Institution {
        string name;
        string did;             // Decentralized Identifier
        string officialEmail;
        string website;
        bool isAuthorized;
        uint256 registeredAt;
    }

    struct CertificateRecord {
        bytes32 certHash;       // SHA-256 hash of canonical certificate data
        string certId;          // Unique Serial ID (e.g. MIT-2026-CS-8842)
        string studentName;
        string studentId;
        string degree;
        string major;
        string cgpa;
        uint256 graduationDate;
        address issuerAddress;
        string ipfsMetadataUri;
        uint256 issuedAt;
        bool isRevoked;
        string revocationReason;
        uint256 revokedAt;
        bytes32 merkleRoot;
    }

    mapping(address => Institution) public institutions;
    mapping(bytes32 => CertificateRecord) public certificatesByHash;
    mapping(string => bytes32) public certIdToHash;

    event CertificateIssued(bytes32 indexed certHash, string indexed certId, address indexed issuerAddress, string studentName, string degree, uint256 issuedAt);
    event CertificateRevoked(bytes32 indexed certHash, string certId, address indexed issuerAddress, string reason, uint256 revokedAt);

    function issueCertificate(bytes32 _certHash, string memory _certId, string memory _studentName, string memory _studentId, string memory _degree, string memory _major, string memory _cgpa, uint256 _graduationDate, string memory _ipfsMetadataUri) external;
    function revokeCertificate(bytes32 _certHash, string memory _reason) external;
    function verifyCertificate(bytes32 _certHash) external view returns (bool exists, bool isValid, CertificateRecord memory record, Institution memory issuer);
}`;
    }
  }
}

window.ExplorerModule = ExplorerModule;

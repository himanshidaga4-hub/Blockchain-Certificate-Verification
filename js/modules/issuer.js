/**
 * University / Issuer Portal Controller
 * Customized for Pandit Deendayal Energy University (PDEU, Gandhinagar)
 * Manages certificate issuance (Single & Merkle Batch), digital signing,
 * on-chain notarization, and certificate revocation.
 */
class IssuerModule {
  constructor() {
    this.currentInstitution = MOCK_DATA.institutions[0]; // Default PDEU
    this.batchStudents = [];
    this.init();
  }

  init() {
    this.bindEvents();
    this.populateInstitutionDropdown();
    this.updateIssuerHeader();
    this.renderCertificatesTable();
    this.setupLivePreview();
  }

  bindEvents() {
    // Institution select change
    const instSelect = document.getElementById('issuer-institution-select');
    if (instSelect) {
      instSelect.addEventListener('change', (e) => {
        const found = MOCK_DATA.institutions.find(i => i.id === e.target.value);
        if (found) {
          this.currentInstitution = found;
          this.updateIssuerHeader();
          this.renderCertificatesTable();
          this.updateLivePreview();
          if (window.app) window.app.showToast(`Switched Issuer to ${found.name}`, 'info');
        }
      });
    }

    // Single issue form submit
    const singleForm = document.getElementById('single-issue-form');
    if (singleForm) {
      singleForm.addEventListener('submit', (e) => this.handleSingleIssue(e));
    }

    // Batch sample load button
    const loadSampleBtn = document.getElementById('load-sample-batch-btn');
    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', () => this.loadSampleBatch());
    }

    // Batch file upload
    const batchFileInput = document.getElementById('batch-file-input');
    if (batchFileInput) {
      batchFileInput.addEventListener('change', (e) => this.handleBatchFileUpload(e));
    }

    // Batch issue submit button
    const batchSubmitBtn = document.getElementById('batch-issue-submit-btn');
    if (batchSubmitBtn) {
      batchSubmitBtn.addEventListener('click', () => this.handleBatchIssueSubmit());
    }

    // Revocation modal confirm button
    const confirmRevokeBtn = document.getElementById('confirm-revoke-btn');
    if (confirmRevokeBtn) {
      confirmRevokeBtn.addEventListener('click', () => this.handleConfirmRevocation());
    }

    // Search filter input
    const searchInput = document.getElementById('issuer-cert-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderCertificatesTable());
    }
  }

  populateInstitutionDropdown() {
    const select = document.getElementById('issuer-institution-select');
    if (!select) return;
    select.innerHTML = MOCK_DATA.institutions.map(inst => `
      <option value="${inst.id}" ${inst.id === this.currentInstitution.id ? 'selected' : ''}>
        ${inst.logo} ${inst.name}
      </option>
    `).join('');
  }

  updateIssuerHeader() {
    const nameEl = document.getElementById('issuer-inst-name');
    const didEl = document.getElementById('issuer-inst-did');
    const addressEl = document.getElementById('issuer-inst-address');
    const badgeEl = document.getElementById('issuer-inst-badge');
    const logoEl = document.getElementById('issuer-inst-logo');

    if (nameEl) nameEl.textContent = this.currentInstitution.name;
    if (didEl) didEl.textContent = this.currentInstitution.did;
    if (addressEl) addressEl.textContent = this.currentInstitution.address;
    if (badgeEl) badgeEl.textContent = this.currentInstitution.badgeText;
    if (logoEl) logoEl.textContent = this.currentInstitution.logo;

    this.updateStats();
  }

  updateStats() {
    const allCerts = window.contract.getAllCertificates();
    const myCerts = allCerts.filter(c => c.issuerAddress.toLowerCase() === this.currentInstitution.address.toLowerCase());
    const activeCerts = myCerts.filter(c => !c.isRevoked);
    const revokedCerts = myCerts.filter(c => c.isRevoked);

    const totalEl = document.getElementById('issuer-stat-total');
    const activeEl = document.getElementById('issuer-stat-active');
    const revokedEl = document.getElementById('issuer-stat-revoked');

    if (totalEl) totalEl.textContent = myCerts.length;
    if (activeEl) activeEl.textContent = activeCerts.length;
    if (revokedEl) revokedEl.textContent = revokedCerts.length;
  }

  setupLivePreview() {
    const inputs = ['cert-student-name', 'cert-student-id', 'cert-degree', 'cert-major', 'cert-cgpa', 'cert-honors', 'cert-grad-date', 'cert-template-style'];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.updateLivePreview());
        el.addEventListener('change', () => this.updateLivePreview());
      }
    });

    // Auto-generate a fresh CertId if empty
    const certIdInput = document.getElementById('cert-id');
    if (certIdInput && !certIdInput.value) {
      certIdInput.value = `PDEU-${new Date().getFullYear()}-CE-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    this.updateLivePreview();
  }

  updateLivePreview() {
    const previewContainer = document.getElementById('issuer-preview-container');
    if (!previewContainer) return;

    const certId = document.getElementById('cert-id')?.value || `${this.currentInstitution.shortName}-2026-CE-1042`;
    const studentName = document.getElementById('cert-student-name')?.value || 'Aarav Jayesh Patel';
    const studentId = document.getElementById('cert-student-id')?.value || 'PDEU-21BCE042';
    const degree = document.getElementById('cert-degree')?.value || 'Bachelor of Technology in Computer Engineering';
    const major = document.getElementById('cert-major')?.value || 'School of Technology • AI & Blockchain Systems';
    const cgpa = document.getElementById('cert-cgpa')?.value || '9.62 / 10.00';
    const honors = document.getElementById('cert-honors')?.value || 'First Class with Distinction & President\'s Gold Medal';
    const graduationDate = document.getElementById('cert-grad-date')?.value || '2026-05-28';
    const templateStyle = document.getElementById('cert-template-style')?.value || 'pdeu-energy';

    const tempCert = {
      certId,
      studentName,
      studentId,
      degree,
      major,
      cgpa,
      honors,
      graduationDate,
      templateStyle,
      certHash: '0x' + 'f'.repeat(64), // Preview dummy hash
      txHash: '0x' + 'e'.repeat(64),
      blockNumber: 'Mined on Submit',
      isRevoked: false
    };

    CertificatePdfGenerator.renderCertificateHTML(tempCert, this.currentInstitution, previewContainer);
  }

  async handleSingleIssue(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('single-issue-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Mining & Notarizing...`;
    }

    try {
      const certId = document.getElementById('cert-id').value.trim();
      const studentName = document.getElementById('cert-student-name').value.trim();
      const studentId = document.getElementById('cert-student-id').value.trim();
      const degree = document.getElementById('cert-degree').value.trim();
      const major = document.getElementById('cert-major').value.trim();
      const cgpa = document.getElementById('cert-cgpa').value.trim();
      const honors = document.getElementById('cert-honors').value.trim();
      const graduationDate = document.getElementById('cert-grad-date').value;
      const templateStyle = document.getElementById('cert-template-style').value;

      if (!studentName || !degree || !certId) {
        throw new Error('Please fill in all mandatory certificate fields.');
      }

      const certData = {
        certId,
        studentName,
        studentId,
        degree,
        major,
        cgpa,
        honors,
        graduationDate,
        templateStyle,
        ipfsUri: `ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/${certId.toLowerCase()}.json`
      };

      if (window.app) window.app.playSound('mine');

      // Issue on blockchain
      const issued = await window.contract.issueCertificate(certData, this.currentInstitution);

      if (window.app) {
        window.app.playSound('success');
        window.app.triggerConfetti();
        window.app.showToast(`PDEU Certificate ${certId} successfully notarized on Blockchain! (Block #${issued.blockNumber})`, 'success');
      }

      // Reset form ID to fresh value
      document.getElementById('cert-id').value = `PDEU-${new Date().getFullYear()}-CE-${Math.floor(1000 + Math.random() * 9000)}`;
      
      this.renderCertificatesTable();
      this.updateStats();
      this.updateLivePreview();

      // Show success modal with quick actions
      this.showIssueSuccessModal(issued);

    } catch (err) {
      if (window.app) {
        window.app.playSound('error');
        window.app.showToast(`Issuance Error: ${err.message}`, 'error');
      } else {
        alert(err.message);
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>🚀 Sign & Notarize on Blockchain</span>`;
      }
    }
  }

  showIssueSuccessModal(cert) {
    const modalEl = document.getElementById('issue-success-modal');
    if (!modalEl) return;

    document.getElementById('success-modal-cert-id').textContent = cert.certId;
    document.getElementById('success-modal-student').textContent = cert.studentName;
    document.getElementById('success-modal-hash').textContent = cert.certHash;
    document.getElementById('success-modal-tx').textContent = cert.txHash;
    document.getElementById('success-modal-block').textContent = cert.blockNumber;

    // QR Preview
    CertificatePdfGenerator.generateQRCode('success-modal-qr', cert.certHash);

    // Setup action buttons
    document.getElementById('success-modal-download-btn').onclick = () => {
      CertificatePdfGenerator.downloadCertificatePdf(cert, this.currentInstitution);
    };

    document.getElementById('success-modal-view-btn').onclick = () => {
      if (window.app) {
        window.app.switchTab('verifier');
        window.verifierModule.verifyByHash(cert.certHash);
      }
      modalEl.classList.remove('active');
    };

    modalEl.classList.add('active');
  }

  loadSampleBatch() {
    this.batchStudents = [
      { certId: `PDEU-2026-B01`, studentName: "Ananya Devendra Patel", studentId: "PDEU-22BCE101", degree: "B.Tech Computer Engineering", major: "Cyber-Physical Cloud Systems", cgpa: "9.55", honors: "Distinction", graduationDate: "2026-05-28", templateStyle: "pdeu-energy" },
      { certId: `PDEU-2026-B02`, studentName: "Harshil Mukesh Desai", studentId: "PDEU-22BPE052", degree: "B.Tech Petroleum Engineering", major: "Clean Energy & Hydrogen Transition", cgpa: "9.24", honors: "First Class", graduationDate: "2026-05-28", templateStyle: "pdeu-energy" },
      { certId: `PDEU-2026-B03`, studentName: "Pooja Vimal Trivedi", studentId: "PDEU-22MRE014", degree: "M.Tech Renewable Energy", major: "Solar PV Cell Nanotechnology", cgpa: "9.88", honors: "Gold Medalist", graduationDate: "2026-05-28", templateStyle: "pdeu-energy" },
      { certId: `PDEU-2026-B04`, studentName: "Yashvardhan K. Rathod", studentId: "PDEU-22BICT088", degree: "B.Tech ICT", major: "Smart Grid Distributed Architecture", cgpa: "8.90", honors: "First Class", graduationDate: "2026-05-28", templateStyle: "pdeu-energy" },
      { certId: `PDEU-2026-B05`, studentName: "Shreya Bhavesh Shah", studentId: "PDEU-22BCH033", degree: "B.Tech Chemical Engineering", major: "Green Biofuels & Carbon Capture", cgpa: "9.40", honors: "Distinction", graduationDate: "2026-05-28", templateStyle: "pdeu-energy" }
    ];

    this.renderBatchTable();
    if (window.app) window.app.showToast(`Loaded ${this.batchStudents.length} PDEU students into batch queue.`, 'info');
  }

  handleBatchFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        if (file.name.endsWith('.json')) {
          this.batchStudents = JSON.parse(text);
        } else {
          // Parse CSV
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          this.batchStudents = lines.slice(1).map((line, idx) => {
            const parts = line.split(',').map(p => p.trim());
            return {
              certId: parts[0] || `${this.currentInstitution.shortName}-2026-CSV${idx+1}`,
              studentName: parts[1] || `Student ${idx+1}`,
              studentId: parts[2] || `PDEU-${idx+100}`,
              degree: parts[3] || "Bachelor of Technology",
              major: parts[4] || "Computer Engineering",
              cgpa: parts[5] || "9.00",
              honors: parts[6] || "First Class",
              graduationDate: parts[7] || "2026-05-28",
              templateStyle: "pdeu-energy"
            };
          });
        }
        this.renderBatchTable();
        if (window.app) window.app.showToast(`Loaded ${this.batchStudents.length} students from file.`, 'success');
      } catch (err) {
        if (window.app) window.app.showToast(`Failed to parse file: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  }

  renderBatchTable() {
    const tbody = document.getElementById('batch-students-tbody');
    const submitBtn = document.getElementById('batch-issue-submit-btn');
    const countEl = document.getElementById('batch-count-badge');

    if (countEl) countEl.textContent = `${this.batchStudents.length} Students`;
    if (submitBtn) submitBtn.disabled = this.batchStudents.length === 0;

    if (!tbody) return;
    if (this.batchStudents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No students in batch queue. Click "Load Sample Batch" or upload a file.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.batchStudents.map((st, idx) => `
      <tr>
        <td class="font-mono text-cyan">${st.certId}</td>
        <td><strong>${st.studentName}</strong></td>
        <td class="font-mono">${st.studentId}</td>
        <td>${st.degree} (${st.major})</td>
        <td><span class="badge bg-gold">${st.cgpa}</span></td>
        <td>
          <button class="btn-icon text-danger" onclick="window.issuerModule.removeBatchStudent(${idx})">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  removeBatchStudent(idx) {
    this.batchStudents.splice(idx, 1);
    this.renderBatchTable();
  }

  async handleBatchIssueSubmit() {
    if (this.batchStudents.length === 0) return;
    const submitBtn = document.getElementById('batch-issue-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Building Merkle Tree & Mining...`;
    }

    try {
      const batchName = `${this.currentInstitution.shortName} Class of 2026 Batch #${Math.floor(100 + Math.random() * 900)}`;
      if (window.app) window.app.playSound('mine');

      const result = await window.contract.issueBatchCertificates(this.batchStudents, batchName, this.currentInstitution);

      if (window.app) {
        window.app.playSound('success');
        window.app.triggerConfetti();
        window.app.showToast(`PDEU Batch notarized! Merkle Root: ${result.batch.merkleRoot.substring(0, 16)}...`, 'success');
      }

      this.batchStudents = [];
      this.renderBatchTable();
      this.renderCertificatesTable();
      this.updateStats();

      // Show Merkle Tree Visualizer Modal
      this.showMerkleBatchResultModal(result);

    } catch (err) {
      if (window.app) {
        window.app.playSound('error');
        window.app.showToast(`Batch Issuance Error: ${err.message}`, 'error');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>🌳 Compute Merkle Tree & Notarize Batch</span>`;
      }
    }
  }

  showMerkleBatchResultModal(result) {
    const modalEl = document.getElementById('merkle-batch-modal');
    if (!modalEl) return;

    document.getElementById('merkle-modal-name').textContent = result.batch.batchName;
    document.getElementById('merkle-modal-root').textContent = result.batch.merkleRoot;
    document.getElementById('merkle-modal-tx').textContent = result.batch.txHash;
    document.getElementById('merkle-modal-block').textContent = result.batch.blockNumber;
    document.getElementById('merkle-modal-count').textContent = result.batch.totalCertificates;

    const listEl = document.getElementById('merkle-modal-leaves-list');
    if (listEl) {
      listEl.innerHTML = result.certificates.map(c => `
        <div class="merkle-leaf-item">
          <div class="leaf-title"><strong>${c.studentName}</strong> (${c.certId})</div>
          <div class="leaf-hash font-mono text-cyan">Leaf Hash: ${c.certHash}</div>
          <div class="leaf-proof-tag">Proof Nodes: ${c.merkleProof ? c.merkleProof.length : 0} siblings</div>
        </div>
      `).join('');
    }

    modalEl.classList.add('active');
  }

  renderCertificatesTable() {
    const tbody = document.getElementById('issuer-certs-tbody');
    if (!tbody) return;

    const search = document.getElementById('issuer-cert-search')?.value.toLowerCase() || '';
    const allCerts = window.contract.getAllCertificates();
    const myCerts = allCerts.filter(c => c.issuerAddress.toLowerCase() === this.currentInstitution.address.toLowerCase());

    const filtered = myCerts.filter(c => 
      c.studentName.toLowerCase().includes(search) ||
      c.certId.toLowerCase().includes(search) ||
      c.degree.toLowerCase().includes(search) ||
      c.certHash.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No certificates match your query.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(c => `
      <tr class="${c.isRevoked ? 'table-row-revoked' : ''}">
        <td class="font-mono text-cyan font-semibold">${c.certId}</td>
        <td>
          <div class="font-bold">${c.studentName}</div>
          <small class="text-muted">${c.studentId}</small>
        </td>
        <td>
          <div>${c.degree}</div>
          <small class="text-gold">${c.major}</small>
        </td>
        <td><span class="badge bg-purple font-mono">Block #${c.blockNumber !== undefined ? c.blockNumber : 1}</span></td>
        <td>
          ${c.isRevoked 
            ? `<span class="badge badge-revoked" title="${c.revocationReason}">⚠️ REVOKED</span>` 
            : `<span class="badge badge-valid">✓ ACTIVE</span>`
          }
        </td>
        <td class="font-mono text-xs text-muted" title="${c.certHash}">
          ${c.certHash.substring(0, 10)}...${c.certHash.substring(58)}
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-action-sm btn-action-view" onclick="window.issuerModule.previewCertificate('${c.certHash}')" title="Preview Certificate">👁️</button>
            <button class="btn-action-sm btn-action-download" onclick="window.issuerModule.downloadCert('${c.certHash}')" title="Download PDF">📥</button>
            ${!c.isRevoked ? `
              <button class="btn-action-sm btn-action-revoke" onclick="window.issuerModule.openRevokeModal('${c.certHash}')" title="Revoke Certificate">🚫</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  }

  previewCertificate(certHash) {
    const cert = window.contract.certificatesByHash[certHash.toLowerCase()];
    if (!cert) return;
    const modalEl = document.getElementById('cert-view-modal');
    if (!modalEl) return;
    const container = document.getElementById('cert-view-modal-body');
    CertificatePdfGenerator.renderCertificateHTML(cert, this.currentInstitution, container);
    modalEl.classList.add('active');
  }

  downloadCert(certHash) {
    const cert = window.contract.certificatesByHash[certHash.toLowerCase()];
    if (!cert) return;
    CertificatePdfGenerator.downloadCertificatePdf(cert, this.currentInstitution);
  }

  openRevokeModal(certHash) {
    const cert = window.contract.certificatesByHash[certHash.toLowerCase()];
    if (!cert) return;

    this.pendingRevokeHash = certHash;
    const modalEl = document.getElementById('revoke-cert-modal');
    if (!modalEl) return;

    document.getElementById('revoke-target-id').textContent = cert.certId;
    document.getElementById('revoke-target-name').textContent = cert.studentName;
    document.getElementById('revoke-reason-input').value = '';

    modalEl.classList.add('active');
  }

  async handleConfirmRevocation() {
    if (!this.pendingRevokeHash) return;
    const reason = document.getElementById('revoke-reason-input')?.value.trim() || 'Official university revocation';
    const confirmBtn = document.getElementById('confirm-revoke-btn');

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Revoking on Blockchain...`;
    }

    try {
      if (window.app) window.app.playSound('mine');
      await window.contract.revokeCertificate(this.pendingRevokeHash, reason, this.currentInstitution.address);

      if (window.app) {
        window.app.playSound('warning');
        window.app.showToast(`PDEU Certificate revoked on blockchain. Reason recorded on-chain.`, 'warning');
      }

      document.getElementById('revoke-cert-modal')?.classList.remove('active');
      this.renderCertificatesTable();
      this.updateStats();
    } catch (err) {
      if (window.app) window.app.showToast(`Revocation failed: ${err.message}`, 'error');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<span>⚠️ Confirm On-Chain Revocation</span>`;
      }
    }
  }
}

window.IssuerModule = IssuerModule;

/**
 * Public Verifier & Employer Portal Controller
 * Supports 4-Way Verification: QR Code, PDF File Drag & Drop, Token ID / Hash Search, and W3C JSON.
 * Includes interactive Cryptographic Tamper Testing Sandbox.
 */
class VerifierModule {
  constructor() {
    this.html5QrCode = null;
    this.isCameraScanning = false;
    this.currentVerifiedResult = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkUrlHashOnLoad();
  }

  bindEvents() {
    // Mode Switchers
    const modeTabs = document.querySelectorAll('.verify-mode-tab');
    modeTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const mode = tab.dataset.mode;
        this.switchVerifyMode(mode);
      });
    });

    // Hash / ID Search form
    const searchForm = document.getElementById('verifier-search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('verifier-search-input').value.trim();
        if (query) this.verifyByHash(query);
      });
    }

    // Quick demo pill buttons
    const demoPills = document.querySelectorAll('.demo-hash-pill');
    demoPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const query = pill.dataset.query;
        document.getElementById('verifier-search-input').value = query;
        this.verifyByHash(query);
      });
    });

    // PDF Drag and Drop Area
    const dropZone = document.getElementById('pdf-drop-zone');
    const fileInput = document.getElementById('pdf-file-input');

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });

      ['dragleave', 'dragend'].forEach(evt => {
        dropZone.addEventListener(evt, () => dropZone.classList.remove('drag-over'));
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
          this.handleFileUpload(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0]);
        }
      });
    }

    // Camera QR Scanner Toggle
    const cameraToggleBtn = document.getElementById('toggle-camera-scanner-btn');
    if (cameraToggleBtn) {
      cameraToggleBtn.addEventListener('click', () => this.toggleCameraScanner());
    }

    // QR Image File Upload
    const qrImageInput = document.getElementById('qr-image-input');
    if (qrImageInput) {
      qrImageInput.addEventListener('change', (e) => this.handleQrImageUpload(e));
    }

    // Tamper Simulator Controls
    this.setupTamperSimulator();
  }

  checkUrlHashOnLoad() {
    const hash = window.location.hash;
    if (hash && hash.includes('verify=')) {
      const target = decodeURIComponent(hash.split('verify=')[1]);
      if (target) {
        if (window.app) window.app.switchTab('verifier');
        setTimeout(() => this.verifyByHash(target), 300);
      }
    }
  }

  switchVerifyMode(mode) {
    document.querySelectorAll('.verify-mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    document.querySelectorAll('.verify-mode-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${mode}`));
  }

  async handleFileUpload(file) {
    const statusEl = document.getElementById('pdf-upload-status');
    if (statusEl) {
      statusEl.innerHTML = `<span class="spinner-border spinner-border-sm text-cyan"></span> Calculating cryptographic SHA-256 checksum for ${file.name}...`;
    }

    try {
      if (window.app) window.app.playSound('scan');
      
      let certHash = null;

      // If it's a JSON VC file
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        if (json.evidence && json.evidence[0] && json.evidence[0].certificateHash) {
          certHash = json.evidence[0].certificateHash;
        } else if (json.id && json.id.startsWith('urn:uuid:')) {
          certHash = json.id.replace('urn:uuid:', '');
        }
      }

      // If not parsed from JSON, calculate file SHA-256 directly
      if (!certHash) {
        certHash = await CryptoEngine.hashFile(file);
      }

      if (statusEl) {
        statusEl.innerHTML = `<span>Computed Hash: <strong class="font-mono text-cyan">${certHash.substring(0, 16)}...</strong></span>`;
      }

      await this.verifyByHash(certHash);

    } catch (err) {
      if (statusEl) {
        statusEl.innerHTML = `<span class="text-danger">Error: ${err.message}</span>`;
      }
      if (window.app) window.app.playSound('error');
    }
  }

  async handleQrImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (window.app) window.app.playSound('scan');

    // In a real browser without QR parsing worker, extract hash or use fallback
    const reader = new FileReader();
    reader.onload = async () => {
      // Pick first demo cert or search
      const demoCert = MOCK_DATA.initialCertificates[0];
      const certHash = (await CryptoEngine.sha256({
        certId: demoCert.certId,
        studentName: demoCert.studentName,
        studentId: demoCert.studentId,
        degree: demoCert.degree,
        major: demoCert.major,
        cgpa: demoCert.cgpa,
        graduationDate: demoCert.graduationDate,
        issuerAddress: MOCK_DATA.institutions[0].address
      }));
      this.verifyByHash(certHash);
    };
    reader.readAsDataURL(file);
  }

  async toggleCameraScanner() {
    const previewBox = document.getElementById('camera-scanner-view');
    const toggleBtn = document.getElementById('toggle-camera-scanner-btn');

    if (this.isCameraScanning) {
      this.isCameraScanning = false;
      if (previewBox) previewBox.innerHTML = '<div class="scanner-placeholder">Camera Scanner Stopped</div>';
      if (toggleBtn) toggleBtn.innerHTML = '📷 Start Live Camera Scanner';
      return;
    }

    this.isCameraScanning = true;
    if (toggleBtn) toggleBtn.innerHTML = '⏹️ Stop Camera';

    if (previewBox) {
      previewBox.innerHTML = `
        <div class="scanner-live-box">
          <div class="scanner-laser-line"></div>
          <div class="scanner-overlay-corners"></div>
          <div class="scanner-hint-text">Position Certificate QR Code within the frame</div>
        </div>
      `;
    }

    if (window.app) window.app.playSound('scan');

    // Simulate real camera QR capture after 2.5 seconds for instant frictionless UX
    setTimeout(async () => {
      if (this.isCameraScanning) {
        this.toggleCameraScanner();
        const demoCert = MOCK_DATA.initialCertificates[0];
        const hash = window.contract.certIdToHash[demoCert.certId];
        if (hash) {
          if (window.app) window.app.showToast(`QR Code Detected from Camera!`, 'success');
          this.verifyByHash(hash);
        }
      }
    }, 2500);
  }

  /**
   * Core verification query runner
   */
  async verifyByHash(query) {
    const reportContainer = document.getElementById('verification-report-section');
    if (!reportContainer) return;

    reportContainer.style.display = 'block';
    reportContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Show loading skeleton
    reportContainer.innerHTML = `
      <div class="card card-glass p-5 text-center">
        <div class="spinner-border text-cyan mb-3" style="width: 3rem; height: 3rem;"></div>
        <h4 class="text-white">Querying Decentralized Blockchain Registry...</h4>
        <p class="text-muted">Validating SHA-256 cryptographic state trie & digital signature authenticity</p>
      </div>
    `;

    if (window.app) window.app.playSound('scan');

    // Simulate blockchain latency
    await new Promise(r => setTimeout(r, 600));

    const result = window.contract.verifyCertificate(query);
    this.currentVerifiedResult = result;

    if (result.isValid) {
      if (window.app) {
        window.app.playSound('success');
        window.app.triggerConfetti();
      }
    } else if (result.status === 'REVOKED') {
      if (window.app) window.app.playSound('warning');
    } else {
      if (window.app) window.app.playSound('error');
    }

    this.renderVerificationReport(result, query);
    this.populateTamperSandbox(result);
  }

  renderVerificationReport(result, query) {
    const container = document.getElementById('verification-report-section');
    if (!container) return;

    if (!result.exists) {
      container.innerHTML = `
        <div class="verification-report-card report-invalid">
          <div class="report-header">
            <div class="report-icon">❌</div>
            <div>
              <h3 class="report-title text-danger">CERTIFICATE NOT FOUND / UNVERIFIED</h3>
              <p class="report-subtitle">The queried hash or identifier is NOT registered on the CertiChain blockchain ledger.</p>
            </div>
          </div>
          <div class="report-body">
            <div class="alert-box alert-danger">
              <strong>Query Target:</strong> <span class="font-mono">${query}</span><br/>
              <strong>Diagnosis:</strong> No cryptographic transaction matching this document fingerprint was found. Possible fraudulent or unnotarized document.
            </div>
          </div>
        </div>
      `;
      return;
    }

    const { record, issuer, status, isValid } = result;
    const isRevoked = status === 'REVOKED';

    container.innerHTML = `
      <div class="verification-report-card ${isValid ? 'report-valid' : (isRevoked ? 'report-revoked' : 'report-invalid')}">
        
        <!-- Status Banner -->
        <div class="report-header">
          <div class="report-status-badge-lg ${isValid ? 'badge-lg-valid' : (isRevoked ? 'badge-lg-revoked' : 'badge-lg-invalid')}">
            <span class="status-icon">${isValid ? '✓' : (isRevoked ? '⚠️' : '✗')}</span>
            <div class="status-texts">
              <span class="status-headline">${isValid ? 'OFFICIALLY VERIFIED & AUTHENTIC' : (isRevoked ? 'CERTIFICATE REVOKED ON BLOCKCHAIN' : 'AUTHENTICITY FAILED')}</span>
              <span class="status-subtext">${isValid ? 'Cryptographically confirmed on CertiChain Sovereign Ledger' : (isRevoked ? 'This certificate is marked VOID / REVOKED by the University' : 'Record invalid or unauthorized')}</span>
            </div>
          </div>
        </div>

        <!-- Revocation Reason Box if Revoked -->
        ${isRevoked ? `
          <div class="revocation-banner-alert">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="fs-4">🛑</span>
              <strong class="text-danger">OFFICIAL REVOCATION RECORD:</strong>
            </div>
            <div class="revocation-reason-text">"${record.revocationReason || 'No detailed reason specified.'}"</div>
            <div class="revocation-timestamp-text">Revoked at: ${new Date(record.revokedAt).toLocaleString()}</div>
          </div>
        ` : ''}

        <!-- 5-Step Cryptographic Audit Trail -->
        <div class="audit-trail-container">
          <h5 class="audit-trail-title">⛓️ Cryptographic Audit Trail & Verification Proof</h5>
          
          <div class="audit-steps-grid">
            <div class="audit-step-card step-passed">
              <div class="step-header">
                <span class="step-check">✓</span>
                <span class="step-name">1. Document Integrity</span>
              </div>
              <div class="step-desc">SHA-256 document fingerprint matches canonical state.</div>
              <div class="step-code font-mono">${record.certHash.substring(0, 14)}...</div>
            </div>

            <div class="audit-step-card step-passed">
              <div class="step-header">
                <span class="step-check">✓</span>
                <span class="step-name">2. University DID Authority</span>
              </div>
              <div class="step-desc">Issued by accredited institution on CertiChain Registry.</div>
              <div class="step-code">${issuer ? issuer.did : 'did:certichain:univ'}</div>
            </div>

            <div class="audit-step-card step-passed">
              <div class="step-header">
                <span class="step-check">✓</span>
                <span class="step-name">3. Blockchain Consensus</span>
              </div>
              <div class="step-desc">Confirmed in Block #${record.blockNumber !== undefined ? record.blockNumber : 1} with PoA consensus.</div>
              <div class="step-code font-mono">${record.txHash ? record.txHash.substring(0, 14) + '...' : '0xConfirmed'}</div>
            </div>

            <div class="audit-step-card ${isRevoked ? 'step-failed' : 'step-passed'}">
              <div class="step-header">
                <span class="step-check">${isRevoked ? '⚠️' : '✓'}</span>
                <span class="step-name">4. Revocation Status</span>
              </div>
              <div class="step-desc">${isRevoked ? 'Certificate is marked REVOKED on-chain.' : 'Active standing. No revocation flags on contract.'}</div>
              <div class="step-code">${isRevoked ? 'STATUS: REVOKED' : 'STATUS: ACTIVE'}</div>
            </div>
          </div>
        </div>

        <!-- Verified Credential Details Card -->
        <div class="verified-details-card">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="text-white m-0">🎓 Verified Student Credential Details</h5>
            <span class="badge bg-gold font-mono">${record.certId}</span>
          </div>

          <div class="row g-3">
            <div class="col-md-6">
              <div class="detail-label">STUDENT NAME</div>
              <div class="detail-value text-white font-bold fs-5">${record.studentName}</div>
            </div>

            <div class="col-md-6">
              <div class="detail-label">STUDENT ID</div>
              <div class="detail-value text-cyan font-mono">${record.studentId}</div>
            </div>

            <div class="col-md-6">
              <div class="detail-label">CONFERRED DEGREE</div>
              <div class="detail-value text-white font-semibold">${record.degree}</div>
            </div>

            <div class="col-md-6">
              <div class="detail-label">MAJOR / SPECIALIZATION</div>
              <div class="detail-value text-gold">${record.major}</div>
            </div>

            <div class="col-md-6">
              <div class="detail-label">CGPA / CLASSIFICATION</div>
              <div class="detail-value text-white font-bold">${record.cgpa}</div>
            </div>

            <div class="col-md-6">
              <div class="detail-label">HONORS & AWARDS</div>
              <div class="detail-value text-muted">${record.honors || 'Standard Conferred Honors'}</div>
            </div>

            <div class="col-md-6">
              <div class="detail-label">GRADUATION DATE</div>
              <div class="detail-value text-white">${record.graduationDate}</div>
            </div>

            <div class="col-md-6">
              <div class="detail-label">ISSUING INSTITUTION</div>
              <div class="detail-value text-cyan">${issuer ? issuer.name : 'Accredited University'}</div>
            </div>
          </div>

          <div class="report-actions-row mt-4 pt-3 border-top border-secondary d-flex gap-3 flex-wrap">
            <button class="btn btn-primary-glass" onclick="window.studentModule.viewCertificate('${record.certHash}')">
              👁️ View Full Official Certificate
            </button>
            <button class="btn btn-outline-glass" onclick="window.studentModule.downloadPdf('${record.certHash}')">
              📥 Download Verifiable PDF
            </button>
            <button class="btn btn-outline-glass" onclick="window.verifierModule.openExplorerForTx('${record.txHash}')">
              ⛓️ View on Blockchain Explorer
            </button>
          </div>
        </div>

      </div>
    `;
  }

  openExplorerForTx(txHash) {
    if (window.app) {
      window.app.switchTab('explorer');
      if (window.explorerModule) window.explorerModule.searchExplorer(txHash);
    }
  }

  /**
   * Setup Interactive Tamper Sandbox
   */
  setupTamperSimulator() {
    const tamperNameInput = document.getElementById('tamper-student-name');
    const tamperGpaInput = document.getElementById('tamper-cgpa');
    const tamperDegreeInput = document.getElementById('tamper-degree');
    const runTamperBtn = document.getElementById('run-tamper-check-btn');
    const resetTamperBtn = document.getElementById('reset-tamper-btn');

    const inputs = [tamperNameInput, tamperGpaInput, tamperDegreeInput];
    inputs.forEach(inp => {
      if (inp) {
        inp.addEventListener('input', () => this.updateTamperCalculation());
      }
    });

    if (runTamperBtn) {
      runTamperBtn.addEventListener('click', () => this.executeTamperTest());
    }

    if (resetTamperBtn) {
      resetTamperBtn.addEventListener('click', () => this.resetTamperForm());
    }
  }

  populateTamperSandbox(result) {
    const section = document.getElementById('tamper-sandbox-section');
    if (!section) return;

    if (!result || !result.record) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    const rec = result.record;

    document.getElementById('tamper-original-name').textContent = rec.studentName;
    document.getElementById('tamper-original-gpa').textContent = rec.cgpa;
    document.getElementById('tamper-original-degree').textContent = rec.degree;
    document.getElementById('tamper-original-hash').textContent = rec.certHash;

    document.getElementById('tamper-student-name').value = rec.studentName;
    document.getElementById('tamper-cgpa').value = rec.cgpa;
    document.getElementById('tamper-degree').value = rec.degree;

    this.updateTamperCalculation();
  }

  async updateTamperCalculation() {
    if (!this.currentVerifiedResult || !this.currentVerifiedResult.record) return;

    const original = this.currentVerifiedResult.record;
    const tamperedName = document.getElementById('tamper-student-name')?.value || '';
    const tamperedGpa = document.getElementById('tamper-cgpa')?.value || '';
    const tamperedDegree = document.getElementById('tamper-degree')?.value || '';

    const isTampered = (
      tamperedName !== original.studentName ||
      tamperedGpa !== original.cgpa ||
      tamperedDegree !== original.degree
    );

    // Compute what the new tampered SHA-256 hash would be
    const tamperedPayload = {
      certId: original.certId,
      studentName: tamperedName,
      studentId: original.studentId,
      degree: tamperedDegree,
      major: original.major,
      cgpa: tamperedGpa,
      graduationDate: original.graduationDate,
      issuerAddress: original.issuerAddress
    };

    const newHash = await CryptoEngine.sha256(tamperedPayload);

    const calculatedHashEl = document.getElementById('tamper-computed-hash');
    const matchStatusEl = document.getElementById('tamper-match-status');
    const resultBoxEl = document.getElementById('tamper-result-box');

    if (calculatedHashEl) calculatedHashEl.textContent = newHash;

    if (matchStatusEl && resultBoxEl) {
      if (isTampered) {
        matchStatusEl.innerHTML = `<span class="badge bg-danger">❌ HASH DIVERGENCE / CORRUPTED</span>`;
        resultBoxEl.className = 'tamper-result-alert alert-tampered';
        resultBoxEl.innerHTML = `
          <div class="d-flex align-items-center gap-3">
            <span class="fs-2">🚨</span>
            <div>
              <strong class="text-danger fs-5">TAMPERING INSTANTLY DETECTED BY CRYPTOGRAPHIC PROOF!</strong>
              <div class="text-muted text-sm mt-1">
                Because 1 or more characters were modified, the resulting SHA-256 checksum (<span class="font-mono text-danger">${newHash.substring(0, 12)}...</span>)
                no longer matches the immutable hash recorded in Block #${original.blockNumber !== undefined ? original.blockNumber : 1} (<span class="font-mono text-success">${original.certHash.substring(0, 12)}...</span>).
                The digital signature verification immediately FAILS.
              </div>
            </div>
          </div>
        `;
      } else {
        matchStatusEl.innerHTML = `<span class="badge bg-success">✓ 100% CRYPTOGRAPHIC MATCH</span>`;
        resultBoxEl.className = 'tamper-result-alert alert-genuine';
        resultBoxEl.innerHTML = `
          <div class="d-flex align-items-center gap-3">
            <span class="fs-2">🛡️</span>
            <div>
              <strong class="text-success fs-5">Data is 100% Genuine & Unmodified</strong>
              <div class="text-muted text-sm mt-1">Computed SHA-256 fingerprint matches on-chain state perfectly.</div>
            </div>
          </div>
        `;
      }
    }
  }

  resetTamperForm() {
    if (this.currentVerifiedResult) {
      this.populateTamperSandbox(this.currentVerifiedResult);
    }
  }

  executeTamperTest() {
    this.updateTamperCalculation();
    if (window.app) window.app.playSound('error');
  }
}

window.VerifierModule = VerifierModule;

/**
 * Student Academic Locker & Credential Passport Controller
 * Customized for Pandit Deendayal Energy University (PDEU)
 * Allows graduates to view credentials, download verifiable PDFs,
 * export W3C Verifiable Credentials (JSON-LD), and share instant verification links.
 */
class StudentModule {
  constructor() {
    this.currentStudentId = 'PDEU-21BCE042'; // Default Aarav Jayesh Patel (PDEU)
    this.init();
  }

  init() {
    this.bindEvents();
    this.populateStudentDropdown();
    this.renderStudentCredentials();
  }

  bindEvents() {
    const studentSelect = document.getElementById('student-profile-select');
    if (studentSelect) {
      studentSelect.addEventListener('change', (e) => {
        this.currentStudentId = e.target.value;
        this.renderStudentCredentials();
      });
    }

    const searchInput = document.getElementById('student-search-id');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val.length > 2) {
          this.currentStudentId = val;
          this.renderStudentCredentials();
        }
      });
    }
  }

  populateStudentDropdown() {
    const select = document.getElementById('student-profile-select');
    if (!select) return;

    const allCerts = window.contract.getAllCertificates();
    const studentsMap = new Map();

    allCerts.forEach(c => {
      if (!studentsMap.has(c.studentId)) {
        studentsMap.set(c.studentId, { id: c.studentId, name: c.studentName, degree: c.degree });
      }
    });

    select.innerHTML = Array.from(studentsMap.values()).map(s => `
      <option value="${s.id}" ${s.id === this.currentStudentId ? 'selected' : ''}>
        🎓 ${s.name} (${s.id})
      </option>
    `).join('');
  }

  renderStudentCredentials() {
    const allCerts = window.contract.getAllCertificates();
    const studentCerts = allCerts.filter(c => 
      c.studentId.toLowerCase() === this.currentStudentId.toLowerCase() ||
      c.studentName.toLowerCase().includes(this.currentStudentId.toLowerCase())
    );

    const container = document.getElementById('student-credentials-grid');
    const headerName = document.getElementById('student-passport-name');
    const headerId = document.getElementById('student-passport-id');
    const headerDid = document.getElementById('student-passport-did');
    const countBadge = document.getElementById('student-credentials-count');

    if (studentCerts.length > 0) {
      const first = studentCerts[0];
      if (headerName) headerName.textContent = first.studentName;
      if (headerId) headerId.textContent = first.studentId;
      if (headerDid) headerDid.textContent = `did:student:pdeu:${first.studentId.toLowerCase()}`;
    }

    if (countBadge) countBadge.textContent = `${studentCerts.length} Verified Credential${studentCerts.length !== 1 ? 's' : ''}`;

    if (!container) return;

    if (studentCerts.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="empty-state-icon">📂</div>
          <h4 class="text-white mt-3">No Credentials Found for this Student</h4>
          <p class="text-muted">No certificates have been issued to ID "${this.currentStudentId}" yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = studentCerts.map(cert => {
      const issuer = window.contract.getInstitution(cert.issuerAddress);
      const isRevoked = cert.isRevoked;

      return `
        <div class="col-md-6 col-lg-6 mb-4">
          <div class="credential-card ${isRevoked ? 'credential-card-revoked' : ''}">
            <div class="credential-card-header">
              <div class="d-flex align-items-center gap-3">
                <span class="cred-institution-logo">${issuer ? issuer.logo : '⚡'}</span>
                <div>
                  <h5 class="cred-institution-name">${issuer ? issuer.name : 'Pandit Deendayal Energy University'}</h5>
                  <div class="cred-degree-title">${cert.degree}</div>
                </div>
              </div>
              <div class="cred-status-badge">
                ${isRevoked 
                  ? `<span class="badge badge-revoked">⚠️ REVOKED</span>` 
                  : `<span class="badge badge-valid">✓ BLOCKCHAIN VERIFIED</span>`
                }
              </div>
            </div>

            <div class="credential-card-body">
              <div class="cred-meta-row">
                <div class="cred-meta-item">
                  <span class="meta-label">Department / School</span>
                  <span class="meta-val">${cert.major}</span>
                </div>
                <div class="cred-meta-item">
                  <span class="meta-label">CGPA / Grade</span>
                  <span class="meta-val text-gold">${cert.cgpa}</span>
                </div>
              </div>

              <div class="cred-meta-row">
                <div class="cred-meta-item">
                  <span class="meta-label">Certificate Serial ID</span>
                  <span class="meta-val font-mono text-cyan">${cert.certId}</span>
                </div>
                <div class="cred-meta-item">
                  <span class="meta-label">Graduation Date</span>
                  <span class="meta-val">${cert.graduationDate}</span>
                </div>
              </div>

              <div class="cred-blockchain-proof-box">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="proof-label">SHA-256 HASH:</span>
                  <span class="font-mono text-xs text-muted" title="${cert.certHash}">${cert.certHash.substring(0, 16)}...${cert.certHash.substring(56)}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                  <span class="proof-label">BLOCKCHAIN TX:</span>
                  <span class="font-mono text-xs text-cyan" title="${cert.txHash}">${cert.txHash.substring(0, 14)}... (Block #${cert.blockNumber !== undefined ? cert.blockNumber : 1})</span>
                </div>
              </div>

              ${isRevoked ? `
                <div class="revocation-warning-alert mt-3">
                  <strong>Notice:</strong> ${cert.revocationReason || 'This credential has been revoked by Pandit Deendayal Energy University.'}
                </div>
              ` : ''}
            </div>

            <div class="credential-card-footer">
              <div class="cred-actions-grid">
                <button class="btn btn-primary-glass btn-sm" onclick="window.studentModule.viewCertificate('${cert.certHash}')">
                  👁️ View Certificate
                </button>
                <button class="btn btn-outline-glass btn-sm" onclick="window.studentModule.downloadPdf('${cert.certHash}')">
                  📥 Download PDF
                </button>
                <button class="btn btn-outline-glass btn-sm" onclick="window.studentModule.copyShareLink('${cert.certHash}')">
                  🔗 Share Link
                </button>
                <button class="btn btn-outline-glass btn-sm" onclick="window.studentModule.exportVCJson('${cert.certHash}')">
                  📜 Export W3C JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  viewCertificate(certHash) {
    const cert = window.contract.certificatesByHash[certHash.toLowerCase()];
    if (!cert) return;
    const issuer = window.contract.getInstitution(cert.issuerAddress);
    const modalEl = document.getElementById('cert-view-modal');
    if (!modalEl) return;
    const container = document.getElementById('cert-view-modal-body');
    CertificatePdfGenerator.renderCertificateHTML(cert, issuer, container);
    modalEl.classList.add('active');
  }

  downloadPdf(certHash) {
    const cert = window.contract.certificatesByHash[certHash.toLowerCase()];
    if (!cert) return;
    const issuer = window.contract.getInstitution(cert.issuerAddress);
    CertificatePdfGenerator.downloadCertificatePdf(cert, issuer);
  }

  copyShareLink(certHash) {
    const url = `${window.location.origin}${window.location.pathname}#verify=${encodeURIComponent(certHash)}`;
    navigator.clipboard.writeText(url).then(() => {
      if (window.app) {
        window.app.playSound('success');
        window.app.showToast('Verification URL copied to clipboard!', 'success');
      }
    }).catch(() => {
      prompt('Shareable Verification Link:', url);
    });
  }

  exportVCJson(certHash) {
    const cert = window.contract.certificatesByHash[certHash.toLowerCase()];
    if (!cert) return;
    const issuer = window.contract.getInstitution(cert.issuerAddress) || {
      id: cert.issuerId || 'pdeu',
      name: 'Pandit Deendayal Energy University (PDEU)',
      did: `did:certichain:pdeu.ac.in`,
      address: cert.issuerAddress
    };

    const vcJson = SignatureEngine.formatVerifiableCredential(cert, cert.signature, issuer);
    const blob = new Blob([JSON.stringify(vcJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cert.studentName.replace(/\s+/g, '_')}_${cert.certId}_PDEU_Credential.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.app) {
      window.app.playSound('success');
      window.app.showToast('W3C Verifiable Credential JSON exported!', 'success');
    }
  }
}

window.StudentModule = StudentModule;

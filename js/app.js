/**
 * CertiChain Main Application Orchestrator
 * Manages Tab Navigation, Sound Effects, Confetti, Toast Notifications, and Module Initialization.
 */
class CertiChainApp {
  constructor() {
    this.currentTab = 'verifier'; // Default landing on Verifier for immediate demo WOW factor
    this.soundEnabled = true;
    this.audioCtx = null;
    this.init();
  }

  async init() {
    this.setupAudio();
    this.bindGlobalEvents();
    this.initModules();
    this.updateGlobalHeaderStats();
    
    // Check initial hash route
    if (window.location.hash.includes('verify=')) {
      this.switchTab('verifier');
    } else if (window.location.hash.includes('issuer')) {
      this.switchTab('issuer');
    } else if (window.location.hash.includes('student')) {
      this.switchTab('student');
    } else if (window.location.hash.includes('explorer')) {
      this.switchTab('explorer');
    }
  }

  setupAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  playSound(type) {
    if (!this.soundEnabled || !this.audioCtx) return;

    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'mine') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.3);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'success') {
        // High dual-tone chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(1046.50, now + 0.2); // C6
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'scan') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'warning') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.setValueAtTime(260, now + 0.15);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {}
  }

  bindGlobalEvents() {
    // Navigation Tabs
    const navItems = document.querySelectorAll('.nav-tab-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Sound toggle button
    const soundToggle = document.getElementById('sound-toggle-btn');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        this.soundEnabled = !this.soundEnabled;
        soundToggle.textContent = this.soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
        soundToggle.classList.toggle('btn-sound-muted', !this.soundEnabled);
      });
    }

    // Connect Wallet Button
    const walletBtn = document.getElementById('connect-wallet-btn');
    if (walletBtn) {
      walletBtn.addEventListener('click', () => this.handleWalletConnect());
    }

    // Modal Close buttons
    document.querySelectorAll('.modal-close-btn, .modal-backdrop-dismiss').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.custom-modal');
        if (modal) modal.classList.remove('active');
      });
    });

    // Close modal on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.custom-modal.active').forEach(m => m.classList.remove('active'));
      }
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update Nav
    document.querySelectorAll('.nav-tab-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabName);
    });

    // Update Panes
    document.querySelectorAll('.app-tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabName}`);
    });

    // Refresh active tab views
    if (tabName === 'issuer' && window.issuerModule) {
      window.issuerModule.renderCertificatesTable();
      window.issuerModule.updateStats();
    } else if (tabName === 'student' && window.studentModule) {
      window.studentModule.renderStudentCredentials();
    } else if (tabName === 'explorer' && window.explorerModule) {
      window.explorerModule.updateMetrics();
      window.explorerModule.renderBlocksList();
    }
  }

  initModules() {
    window.issuerModule = new IssuerModule();
    window.studentModule = new StudentModule();
    window.verifierModule = new VerifierModule();
    window.explorerModule = new ExplorerModule();
  }

  updateGlobalHeaderStats() {
    const blockCountEl = document.getElementById('header-block-height');
    if (blockCountEl) {
      blockCountEl.textContent = `Block #${window.blockchain.chain.length - 1}`;
    }

    window.blockchain.onBlockMined((block) => {
      if (blockCountEl) {
        blockCountEl.textContent = `Block #${block.index}`;
        blockCountEl.classList.add('pulse-cyan');
        setTimeout(() => blockCountEl.classList.remove('pulse-cyan'), 1000);
      }
    });
  }

  async handleWalletConnect() {
    const btn = document.getElementById('connect-wallet-btn');
    if (!btn) return;

    try {
      btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Connecting...`;
      const wallet = await window.web3Service.connectWallet();

      const shortAddr = wallet.account.substring(0, 6) + '...' + wallet.account.substring(38);
      btn.innerHTML = `🟢 <span class="font-mono">${shortAddr}</span> (${wallet.network})`;
      btn.classList.add('btn-wallet-connected');

      this.playSound('success');
      this.showToast(`Connected to ${wallet.network} (${shortAddr})`, 'success');
    } catch (e) {
      btn.innerHTML = `🦊 Connect Web3 Wallet`;
      this.playSound('error');
      this.showToast(`Wallet connection failed: ${e.message}`, 'error');
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  triggerConfetti() {
    const colors = ['#00f2fe', '#4facfe', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const count = 60;
    
    for (let i = 0; i < count; i++) {
      const conf = document.createElement('div');
      conf.className = 'confetti-piece';
      conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      conf.style.left = `${Math.random() * 100}vw`;
      conf.style.top = '-20px';
      conf.style.transform = `rotate(${Math.random() * 360}deg)`;
      conf.style.animationDuration = `${1.5 + Math.random() * 2}s`;
      conf.style.animationDelay = `${Math.random() * 0.3}s`;

      document.body.appendChild(conf);
      setTimeout(() => conf.remove(), 3500);
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CertiChainApp();
});

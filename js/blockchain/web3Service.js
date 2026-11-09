/**
 * Web3 & MetaMask Wallet Integration Service
 * Bridges CertiChain with real Ethereum/EVM testnets (Sepolia, Polygon Amoy, Hardhat)
 */
class Web3Service {
  constructor() {
    this.account = null;
    this.chainId = null;
    this.provider = null;
    this.signer = null;
    this.isConnected = false;
    this.contractAddress = '0x71C8A1f36402ecA7b09A8e907C16F0B2d3D52A0b';
    this.listeners = [];
  }

  hasMetaMask() {
    return typeof window.ethereum !== 'undefined';
  }

  async connectWallet() {
    if (!this.hasMetaMask()) {
      // Simulate Web3 Wallet connection for demo testing if MetaMask is not installed
      this.account = '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7'; // MIT authorized address
      this.chainId = '0xaa36a7'; // Sepolia
      this.isConnected = true;
      this.notify();
      return {
        account: this.account,
        network: 'Sepolia (Simulated Web3 Mode)',
        simulated: true
      };
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.account = accounts[0];
      this.chainId = await window.ethereum.request({ method: 'eth_chainId' });
      this.isConnected = true;

      window.ethereum.on('accountsChanged', (newAccounts) => {
        this.account = newAccounts[0] || null;
        this.isConnected = !!this.account;
        this.notify();
      });

      window.ethereum.on('chainChanged', (newChainId) => {
        this.chainId = newChainId;
        this.notify();
      });

      this.notify();
      return {
        account: this.account,
        network: this.getNetworkName(this.chainId),
        simulated: false
      };
    } catch (err) {
      console.error('Wallet connection rejected:', err);
      throw err;
    }
  }

  disconnectWallet() {
    this.account = null;
    this.isConnected = false;
    this.notify();
  }

  getNetworkName(chainId) {
    const networks = {
      '0x1': 'Ethereum Mainnet',
      '0xaa36a7': 'Sepolia Testnet',
      '0x13882': 'Polygon Amoy',
      '0x89': 'Polygon Mainnet',
      '0x539': 'Hardhat / Anvil Local'
    };
    return networks[chainId] || `EVM Chain (${chainId})`;
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => {
      try { cb({ isConnected: this.isConnected, account: this.account, chainId: this.chainId }); } catch (e) {}
    });
  }
}

window.web3Service = new Web3Service();

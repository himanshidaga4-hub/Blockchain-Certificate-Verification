/**
 * Merkle Tree Implementation for Batch Certificate Verification
 * Compliant with OpenZeppelin MerkleProof.sol and CertiChainRegistry.sol standards.
 */
class MerkleTree {
  /**
   * @param {string[]} leafHashes Array of hex-encoded 32-byte hashes (leaves)
   */
  constructor(leafHashes = []) {
    this.leaves = leafHashes.map(hash => this._formatHex(hash));
    this.layers = [];
    if (this.leaves.length > 0) {
      this._buildTree();
    }
  }

  _formatHex(hex) {
    if (!hex) return '';
    hex = hex.trim();
    if (!hex.startsWith('0x')) hex = '0x' + hex;
    return hex.toLowerCase();
  }

  /**
   * Hash a pair of child nodes deterministically
   */
  static hashPair(a, b) {
    // Sort pair to prevent second-preimage attack (matches standard Solidity Merkle proof)
    const sorted = [a, b].sort();
    const combined = sorted[0].replace('0x', '') + sorted[1].replace('0x', '');
    return CryptoEngine._sha256Fallback(CryptoEngine._hexToAscii(combined));
  }

  /**
   * Build complete tree layers up to root
   */
  _buildTree() {
    this.layers = [this.leaves];

    let currentLayer = this.leaves;
    while (currentLayer.length > 1) {
      const nextLayer = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        if (i + 1 < currentLayer.length) {
          // Pair of elements
          const a = currentLayer[i];
          const b = currentLayer[i + 1];
          const parentHash = '0x' + MerkleTree.hashPair(a, b);
          nextLayer.push(parentHash);
        } else {
          // Odd element without pair promotes upward
          nextLayer.push(currentLayer[i]);
        }
      }
      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }
  }

  /**
   * Get the Merkle Root (top of tree)
   */
  getRoot() {
    if (this.layers.length === 0 || this.layers[this.layers.length - 1].length === 0) {
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
    return this.layers[this.layers.length - 1][0];
  }

  /**
   * Generate Merkle Proof for a leaf at index or matching hash
   */
  getProof(leafOrIndex) {
    let index = typeof leafOrIndex === 'number' 
      ? leafOrIndex 
      : this.leaves.indexOf(this._formatHex(leafOrIndex));

    if (index === -1) {
      throw new Error('Leaf not found in Merkle Tree');
    }

    const proof = [];
    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isRightNode = index % 2 === 1;
      const pairIndex = isRightNode ? index - 1 : index + 1;

      if (pairIndex < layer.length) {
        proof.push({
          position: isRightNode ? 'left' : 'right',
          data: layer[pairIndex]
        });
      }
      index = Math.floor(index / 2);
    }
    return proof;
  }

  /**
   * Verify a Merkle proof against a root
   * @param {string} leaf
   * @param {Array<{position: string, data: string}|string>} proof
   * @param {string} root
   */
  static verify(leaf, proof, root) {
    let computedHash = leaf.toLowerCase();
    if (!computedHash.startsWith('0x')) computedHash = '0x' + computedHash;
    const targetRoot = root.toLowerCase();

    for (const proofElement of proof) {
      const sibling = (typeof proofElement === 'string' ? proofElement : proofElement.data).toLowerCase();
      computedHash = '0x' + MerkleTree.hashPair(computedHash, sibling);
    }

    return computedHash === targetRoot;
  }
}

// Helper for hex to byte conversion
CryptoEngine._hexToAscii = function(hex) {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
};

window.MerkleTree = MerkleTree;

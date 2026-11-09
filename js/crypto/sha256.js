/**
 * Cryptographic Utility for SHA-256 Hashing & Canonicalization
 * Supports both Web Crypto API (SubtleCrypto) and pure JS fallback for guaranteed reliability.
 */
class CryptoEngine {
  /**
   * Pure JS SHA-256 Implementation (RFC 6234 compliant fallback)
   */
  static _sha256Fallback(ascii) {
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';

    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;
    
    let hash = CryptoEngine._sha256Fallback.h = CryptoEngine._sha256Fallback.h || [];
    const k = CryptoEngine._sha256Fallback.k = CryptoEngine._sha256Fallback.k || [];
    let primeCounter = k[lengthProperty];

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 300; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    
    hash = hash.slice(0);
    
    words[asciiBitLength >> 5] |= 0x80 << (24 - asciiBitLength % 32);
    words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;
    
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i % 4) * 8);
    }
    
    const w = [];
    for (i = 0; i < words[lengthProperty]; i += 16) {
      const oldHash = hash.slice(0);
      for (j = 0; j < 64; j++) {
        const w15 = w[j - 15], w2 = w[j - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7]
          + (CryptoEngine._rightRotate(e, 6) ^ CryptoEngine._rightRotate(e, 11) ^ CryptoEngine._rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[j]
          + (w[j] = (j < 16) ? words[j + i] : (
            w[j - 16]
            + (CryptoEngine._rightRotate(w15, 7) ^ CryptoEngine._rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[j - 7]
            + (CryptoEngine._rightRotate(w2, 17) ^ CryptoEngine._rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0
        );
        const temp2 = (CryptoEngine._rightRotate(a, 2) ^ CryptoEngine._rightRotate(a, 13) ^ CryptoEngine._rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
        hash.pop();
      }
      for (j = 0; j < 8; j++) {
        hash[j] = (hash[j] + oldHash[j]) | 0;
      }
    }
    
    for (i = 0; i < 8; i++) {
      for (j = 3; j >= 0; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  static _rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  /**
   * Deterministically hash any string or byte data using SHA-256
   * @param {string|Uint8Array} input
   * @returns {Promise<string>} Hex-encoded SHA-256 hash (with 0x prefix optional)
   */
  static async sha256(input) {
    if (typeof input === 'object' && !(input instanceof Uint8Array) && !(input instanceof ArrayBuffer)) {
      input = CryptoEngine.canonicalize(input);
    }
    
    try {
      if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = typeof input === 'string' ? encoder.encode(input) : input;
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {
      console.warn('WebCrypto subtle digest fallback:', e);
    }
    
    const str = typeof input === 'string' ? input : new TextDecoder().decode(input);
    return '0x' + CryptoEngine._sha256Fallback(str);
  }

  /**
   * Hash a file (Blob, File, or ArrayBuffer)
   * @param {File|Blob|ArrayBuffer} fileOrBuffer 
   * @returns {Promise<string>}
   */
  static async hashFile(fileOrBuffer) {
    let arrayBuffer;
    if (fileOrBuffer instanceof ArrayBuffer) {
      arrayBuffer = fileOrBuffer;
    } else if (fileOrBuffer instanceof Blob || fileOrBuffer instanceof File) {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else {
      throw new Error('Unsupported file format for hashing');
    }

    if (window.crypto && window.crypto.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const uint8 = new Uint8Array(arrayBuffer);
    let binaryStr = '';
    for (let i = 0; i < uint8.length; i++) {
      binaryStr += String.fromCharCode(uint8[i]);
    }
    return '0x' + CryptoEngine._sha256Fallback(binaryStr);
  }

  /**
   * Produce a deterministic canonical JSON string (RFC 8785 JSON Canonicalization Scheme)
   * Prevents key-order variance from altering cryptographic hashes.
   */
  static canonicalize(obj) {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map(item => CryptoEngine.canonicalize(item)).join(',') + ']';
    }
    const sortedKeys = Object.keys(obj).sort();
    const result = [];
    for (const key of sortedKeys) {
      if (obj[key] !== undefined && typeof obj[key] !== 'function') {
        result.push(JSON.stringify(key) + ':' + CryptoEngine.canonicalize(obj[key]));
      }
    }
    return '{' + result.join(',') + '}';
  }

  /**
   * Generate a random 32-byte Hex string (e.g. for TxHash or nonce)
   */
  static randomBytes32() {
    const bytes = new Uint8Array(32);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 32; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate an Ethereum-style address from a public key or seed
   */
  static generateAddress(seed = '') {
    const raw = seed || Math.random().toString() + Date.now();
    const hash = CryptoEngine._sha256Fallback(raw);
    return '0x' + hash.substring(24, 64);
  }
}

window.CryptoEngine = CryptoEngine;

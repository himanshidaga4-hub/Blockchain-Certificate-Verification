/**
 * Mock Data for CertiChain System
 * Customized for Pandit Deendayal Energy University (PDEU, Gandhinagar)
 */
const MOCK_DATA = {
  institutions: [
    {
      id: "pdeu",
      name: "Pandit Deendayal Energy University (PDEU)",
      shortName: "PDEU",
      did: "did:certichain:pdeu.ac.in",
      address: "0x78D6a2419F2e6840B8d184084F59A85954B52084",
      email: "examinations@pdeu.ac.in",
      website: "https://pdeu.ac.in",
      logo: "⚡",
      themeColor: "#0b2545",
      accentColor: "#f59e0b",
      badgeText: "NAAC 'A++' ACCREDITED UNIVERSITY",
      isAuthorized: true,
      publicKey: "0x04e198cf459d892e3b6c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9e",
      privateKey: "0x7777777777777777777777777777777777777777777777777777777777777777"
    },
    {
      id: "mit",
      name: "Massachusetts Institute of Technology (MIT)",
      shortName: "MIT",
      did: "did:certichain:mit.edu",
      address: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      email: "registrar@mit.edu",
      website: "https://mit.edu",
      logo: "🏛️",
      themeColor: "#8a1b29",
      accentColor: "#f59e0b",
      badgeText: "VERIFIED ACCREDITED ISSUER",
      isAuthorized: true,
      publicKey: "0x04a298bf349c891e2b5c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
      privateKey: "0x1111111111111111111111111111111111111111111111111111111111111111"
    },
    {
      id: "stanford",
      name: "Stanford University",
      shortName: "Stanford",
      did: "did:certichain:stanford.edu",
      address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      email: "credentials@stanford.edu",
      website: "https://stanford.edu",
      logo: "🌲",
      themeColor: "#8c1515",
      accentColor: "#e67e22",
      badgeText: "VERIFIED ACCREDITED ISSUER",
      isAuthorized: true,
      publicKey: "0x04b398cf459d892e3b6c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9b",
      privateKey: "0x2222222222222222222222222222222222222222222222222222222222222222"
    },
    {
      id: "oxford",
      name: "University of Oxford",
      shortName: "Oxford",
      did: "did:certichain:ox.ac.uk",
      address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      email: "verifications@ox.ac.uk",
      website: "https://ox.ac.uk",
      logo: "👑",
      themeColor: "#002147",
      accentColor: "#d4af37",
      badgeText: "VERIFIED ACCREDITED ISSUER",
      isAuthorized: true,
      publicKey: "0x04c498df569e893e4b7c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0c",
      privateKey: "0x3333333333333333333333333333333333333333333333333333333333333333"
    }
  ],

  initialCertificates: [
    {
      certId: "PDEU-2025-CE-1042",
      studentName: "Aarav Jayesh Patel",
      studentId: "PDEU-21BCE042",
      degree: "Bachelor of Technology in Computer Engineering",
      major: "School of Technology • Artificial Intelligence & Blockchain Systems",
      cgpa: "9.62 / 10.00",
      honors: "First Class with Distinction & President's Gold Medal",
      graduationDate: "2025-05-28",
      issuerId: "pdeu",
      templateStyle: "pdeu-energy",
      issuedAt: 1748400000000,
      isRevoked: false,
      revocationReason: "",
      revokedAt: 0,
      ipfsUri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/pdeu-1042.json"
    },
    {
      certId: "PDEU-2025-PETRO-2091",
      studentName: "Diya Rajesh Sharma",
      studentId: "PDEU-21BPE091",
      degree: "Bachelor of Technology in Petroleum Engineering",
      major: "School of Energy Technology • Reservoir Simulation & Clean Hydrogen",
      cgpa: "9.45 / 10.00",
      honors: "First Class with Distinction & Director's Honor Roll",
      graduationDate: "2025-05-28",
      issuerId: "pdeu",
      templateStyle: "pdeu-energy",
      issuedAt: 1748450000000,
      isRevoked: false,
      revocationReason: "",
      revokedAt: 0,
      ipfsUri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/pdeu-2091.json"
    },
    {
      certId: "PDEU-2024-RE-3054",
      studentName: "Rohan Siddharth Mehta",
      studentId: "PDEU-22MRE054",
      degree: "Master of Technology in Renewable Energy Engineering",
      major: "Department of Solar & Wind Energy • Grid Storage Architectures",
      cgpa: "9.80 / 10.00",
      honors: "University Gold Medalist & Best Dissertation Award",
      graduationDate: "2024-11-15",
      issuerId: "pdeu",
      templateStyle: "pdeu-energy",
      issuedAt: 1731650000000,
      isRevoked: false,
      revocationReason: "",
      revokedAt: 0,
      ipfsUri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/pdeu-3054.json"
    },
    {
      certId: "PDEU-2024-ICT-4412",
      studentName: "Karan Vikramaditya Joshi",
      studentId: "PDEU-20BICT112",
      degree: "Bachelor of Technology in Information & Communication Technology",
      major: "School of Technology • Cyber-Physical Energy Security",
      cgpa: "7.85 / 10.00",
      honors: "First Class",
      graduationDate: "2024-06-20",
      issuerId: "pdeu",
      templateStyle: "pdeu-energy",
      issuedAt: 1718850000000,
      isRevoked: true,
      revocationReason: "Revoked due to administrative course credential re-audit and academic curriculum reassessment.",
      revokedAt: 1726000000000,
      ipfsUri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/pdeu-4412.json"
    }
  ]
};

window.MOCK_DATA = MOCK_DATA;

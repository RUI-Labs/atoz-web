export function isValidZcashMainnetAddress(address: string): boolean {
  // Transparent addresses: t1 (P2PKH) or t3 (P2SH) — 35 chars
  // Unified addresses: u1 — variable length, typically 200+ chars
  return /^t[13][a-zA-Z0-9]{33}$/.test(address) || /^u1[a-z0-9]{50,}$/.test(address);
}

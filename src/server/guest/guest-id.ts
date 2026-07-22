/**
 * Guest learner ids — edge-safe (Web Crypto).
 * Shape: `g` + 32 hex chars. Distinct from auth ids (32 hex, no prefix).
 */

export function createGuestLearnerId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return `g${hex}`;
}

export function isGuestLearnerId(id: string): boolean {
  return /^g[a-f0-9]{32}$/.test(id);
}

export function isSafeLearnerId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length >= 8 && id.length <= 64;
}

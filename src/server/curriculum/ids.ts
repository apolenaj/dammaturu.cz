import { createHash } from "node:crypto";

/**
 * Deterministic UUID (v5-like) from namespace + slug — idempotent seeds.
 */
export function deterministicUuid(namespace: string, key: string): string {
  const hash = createHash("sha256")
    .update(`${namespace}:${key}`)
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5-ish
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

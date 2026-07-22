import path from "node:path";

/**
 * Resolve a path and ensure it stays inside `root` (default: process.cwd()).
 * Prevents path traversal via `..` or absolute escapes.
 */
export function assertPathInsideRoot(
  candidate: string,
  root = process.cwd(),
): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  const rel = path.relative(resolvedRoot, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Neplatná cesta");
  }
  return resolved;
}

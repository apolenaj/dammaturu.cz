/**
 * Local JSON under `data/` is fine in local/dev, but Vercel serverless
 * has a read-only filesystem (except ephemeral `/tmp`). Never treat FS as
 * durable storage when running on Vercel.
 */

export function canPersistLocalFs(): boolean {
  if (process.env.LEARNER_FS_PERSIST === "0") return false;
  if (process.env.LEARNER_FS_PERSIST === "1") return true;
  // Vercel sets VERCEL=1 in all serverless / edge build runtimes.
  if (process.env.VERCEL === "1" || process.env.VERCEL === "true") return false;
  return true;
}

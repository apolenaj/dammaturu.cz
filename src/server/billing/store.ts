import {
  emptySubscription,
  parseBillingSubscription,
  type BillingSubscription,
} from "@/domain/billing/subscription";
import { promises as fs } from "node:fs";
import path from "node:path";

export const BILLING_DIR = path.join(process.cwd(), "data", "billing");

function statePath(learnerId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(learnerId)) {
    throw new Error("Neplatné learner id");
  }
  return path.join(BILLING_DIR, `${learnerId}.json`);
}

async function ensureDir() {
  await fs.mkdir(BILLING_DIR, { recursive: true });
}

export async function getBillingSubscription(
  learnerId: string,
): Promise<BillingSubscription | null> {
  try {
    return parseBillingSubscription(
      JSON.parse(await fs.readFile(statePath(learnerId), "utf8")),
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveBillingSubscription(
  sub: BillingSubscription,
): Promise<void> {
  const validated = parseBillingSubscription(sub);
  await ensureDir();
  const file = statePath(validated.learnerId);
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random()
    .toString(16)
    .slice(2)}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  try {
    await fs.rename(tmp, file);
  } catch (error) {
    await fs.unlink(tmp).catch(() => undefined);
    throw error;
  }
}

export async function getOrCreateBillingSubscription(
  learnerId: string,
  nowIso = new Date().toISOString(),
): Promise<BillingSubscription> {
  const existing = await getBillingSubscription(learnerId);
  if (existing) return existing;
  const fresh = emptySubscription(learnerId, nowIso);
  await saveBillingSubscription(fresh);
  return fresh;
}

/** Find learner by Stripe customer id (scan — fine for beta FS store). */
export async function findSubscriptionByStripeCustomerId(
  customerId: string,
): Promise<BillingSubscription | null> {
  await ensureDir();
  let files: string[] = [];
  try {
    files = await fs.readdir(BILLING_DIR);
  } catch {
    return null;
  }
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(BILLING_DIR, f), "utf8"),
      );
      const sub = parseBillingSubscription(raw);
      if (sub.stripeCustomerId === customerId) return sub;
    } catch {
      /* skip corrupt */
    }
  }
  return null;
}

export async function findSubscriptionByStripeSubscriptionId(
  subscriptionId: string,
): Promise<BillingSubscription | null> {
  await ensureDir();
  let files: string[] = [];
  try {
    files = await fs.readdir(BILLING_DIR);
  } catch {
    return null;
  }
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(BILLING_DIR, f), "utf8"),
      );
      const sub = parseBillingSubscription(raw);
      if (sub.stripeSubscriptionId === subscriptionId) return sub;
    } catch {
      /* skip */
    }
  }
  return null;
}

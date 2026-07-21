import {
  betaFeedbackSchema,
  type BetaFeedback,
} from "@/domain/learning/beta-feedback";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { assertSafeId } from "@/server/safe-id";

export const BETA_FEEDBACK_DIR = path.join(
  process.cwd(),
  "data",
  "beta-feedback",
);

async function ensureDirs() {
  await fs.mkdir(BETA_FEEDBACK_DIR, { recursive: true });
}

export async function appendBetaFeedback(
  partial: Omit<BetaFeedback, "id"> & { id?: string },
): Promise<BetaFeedback> {
  const event = betaFeedbackSchema.parse({
    ...partial,
    id: partial.id ?? randomUUID(),
  });
  assertSafeId(event.learnerKey, "learner id");
  await ensureDirs();
  const file = path.join(BETA_FEEDBACK_DIR, `${event.id}.json`);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(event, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
  return event;
}

export async function listBetaFeedback(): Promise<BetaFeedback[]> {
  try {
    const files = await fs.readdir(BETA_FEEDBACK_DIR);
    const out: BetaFeedback[] = [];
    for (const f of files) {
      if (!f.endsWith(".json") || f.endsWith(".tmp")) continue;
      try {
        out.push(
          betaFeedbackSchema.parse(
            JSON.parse(
              await fs.readFile(path.join(BETA_FEEDBACK_DIR, f), "utf8"),
            ),
          ),
        );
      } catch {
        // skip
      }
    }
    return out.sort((a, b) => a.at.localeCompare(b.at));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw error;
  }
}

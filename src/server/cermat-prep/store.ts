import { promises as fs } from "node:fs";
import path from "node:path";
import {
  applyAttemptToProgress,
  buildCermatSessionQueue,
  cermatLearnerProgressSchema,
  cermatPackSchema,
  emptyCermatProgress,
  gradeCermatAnswer,
  type CermatCategory,
  type CermatGradeResult,
  type CermatItem,
  type CermatLearnerProgress,
  type CermatPack,
  type CermatSessionMode,
} from "@/domain/learning/cermat-prep";
import { buildCermatCjlPrepPack } from "@/server/cermat-prep/pack";
import { assertSafeId } from "@/server/safe-id";

const ROOT = path.join(process.cwd(), "data", "cermat-prep");
const PACK_PATH = path.join(ROOT, "pack.json");

function progressPath(learnerId: string): string {
  assertSafeId(learnerId, "learner id");
  return path.join(ROOT, "progress", `${learnerId}.json`);
}

async function ensureDirs(): Promise<void> {
  await fs.mkdir(path.join(ROOT, "progress"), { recursive: true });
}

export async function getCermatPack(): Promise<CermatPack> {
  try {
    const raw = JSON.parse(await fs.readFile(PACK_PATH, "utf8"));
    return cermatPackSchema.parse(raw);
  } catch {
    const pack = buildCermatCjlPrepPack();
    await ensureDirs();
    await fs.writeFile(PACK_PATH, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
    return pack;
  }
}

export async function getCermatProgress(
  learnerId: string,
): Promise<CermatLearnerProgress> {
  try {
    const raw = JSON.parse(
      await fs.readFile(progressPath(learnerId), "utf8"),
    );
    return cermatLearnerProgressSchema.parse(raw);
  } catch {
    const now = new Date().toISOString();
    const progress = emptyCermatProgress(learnerId, now);
    await saveCermatProgress(progress);
    return progress;
  }
}

export async function saveCermatProgress(
  progress: CermatLearnerProgress,
): Promise<void> {
  const validated = cermatLearnerProgressSchema.parse(progress);
  await ensureDirs();
  const file = progressPath(validated.learnerId);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function startCermatSession(input: {
  learnerId: string;
  mode: CermatSessionMode;
  categoryFilter?: CermatCategory | null;
}): Promise<{
  items: CermatItem[];
  timedSeconds: number | null;
  pack: CermatPack;
}> {
  const [pack, progress] = await Promise.all([
    getCermatPack(),
    getCermatProgress(input.learnerId),
  ]);
  const items = buildCermatSessionQueue({
    pack,
    mode: input.mode,
    progress,
    categoryFilter: input.categoryFilter,
  });
  return {
    items,
    timedSeconds:
      input.mode === "timed_simulation" ? pack.timedSecondsDefault : null,
    pack,
  };
}

export async function recordCermatAttempt(input: {
  learnerId: string;
  itemId: string;
  answer: string | string[];
  mode: CermatSessionMode;
}): Promise<{
  result: CermatGradeResult;
  explanationCs: string;
  provenanceLabelCs: string;
  progress: CermatLearnerProgress;
  item: CermatItem;
}> {
  const pack = await getCermatPack();
  const item = pack.items.find((i) => i.id === input.itemId);
  if (!item) throw new Error("Položka nenalezena.");
  const graded = gradeCermatAnswer(item, input.answer);
  const progress = await getCermatProgress(input.learnerId);
  const next = applyAttemptToProgress(progress, {
    category: item.category,
    result: graded.result,
    mode: input.mode,
    nowIso: new Date().toISOString(),
  });
  await saveCermatProgress(next);
  return {
    result: graded.result,
    explanationCs: graded.explanationCs,
    provenanceLabelCs: item.provenanceLabelCs,
    progress: next,
    item,
  };
}

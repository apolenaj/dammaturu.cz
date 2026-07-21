import {
  buildReadinessSnapshot,
  readinessBookSchema,
  stateWithScore,
  type ReadinessBook,
} from "@/domain/learning/readiness";
import { saveReadinessBook } from "@/server/readiness/store";
import { track } from "@/lib/analytics";

/**
 * Demo mastery coverage ≈:
 * Celková ~64 % · Směry 82 · Autoři 61 · Rozbory 48 · Jazyk 75
 * Week delta +5 (previous week = current − 5).
 */
export function buildDemoReadinessBook(
  learnerId: string,
  nowIso = new Date().toISOString(),
): ReadinessBook {
  const weekAgo = new Date(nowIso);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const units: ReadinessBook["units"] = [
    // Literární směry ~82
    u("smery-romantismus", "Romantismus — znaky", "literarni-smery", 2, 85, nowIso),
    u("smery-realismus", "Realismus — znaky", "literarni-smery", 2, 82, nowIso),
    u("smery-naturalismus", "Naturalismus", "literarni-smery", 1.5, 78, nowIso),
    u("smery-symbolismus", "Symbolismus", "literarni-smery", 1.5, 80, nowIso),
    // Autoři a díla ~61
    u("aut-balzac", "Balzac — Otec Goriot", "autori-dila", 2, 58, nowIso),
    u("aut-dickens", "Dickens — Oliver Twist", "autori-dila", 2, 56, nowIso),
    u("aut-dostojev", "Dostojevskij — Zločin a trest", "autori-dila", 2, 64, nowIso),
    u("aut-neruda", "Neruda — Malostranské", "autori-dila", 1.5, 66, nowIso),
    u("aut-macha", "Mácha — Máj (autorství)", "autori-dila", 2, 62, nowIso),
    // Rozbory ~48
    u("roz-kompozice", "Kompozice děje", "rozbory", 2, 45, nowIso),
    u("roz-postavy", "Charakteristika postav", "rozbory", 2, 48, nowIso),
    u("roz-motivy", "Motivy a symboly", "rozbory", 2, 50, nowIso),
    u("roz-narativ", "Narativní postup", "rozbory", 1.5, 49, nowIso),
    // Jazyk ~75
    u("jaz-homonyma", "Homonyma", "jazyk", 2, 78, nowIso),
    u("jaz-synonyma", "Synonyma", "jazyk", 2, 74, nowIso),
    u("jaz-antonyma", "Antonyma", "jazyk", 1.5, 72, nowIso),
    u("jaz-polysemie", "Polysémie", "jazyk", 2, 76, nowIso),
  ];

  const draft = readinessBookSchema.parse({
    learnerId,
    units,
    weeklyHistory: [],
    updatedAt: nowIso,
  });
  const current = buildReadinessSnapshot(draft, nowIso).overallPct;

  return readinessBookSchema.parse({
    ...draft,
    weeklyHistory: [
      {
        weekStartIso: weekAgo.toISOString(),
        overallPct: Math.max(0, current - 5),
      },
    ],
  });
}

function u(
  id: string,
  title: string,
  areaId: ReadinessBook["units"][number]["areaId"],
  examWeight: number,
  score: number,
  nowIso: string,
) {
  return {
    id,
    title,
    areaId,
    examWeight,
    state: stateWithScore(id, score, nowIso, score >= 40 ? 4 : 2),
  };
}

export async function seedReadiness(input?: {
  learnerId?: string;
}): Promise<{ learnerId: string; unitCount: number; overallPct: number }> {
  const learnerId = input?.learnerId ?? "demo-learner";
  const book = buildDemoReadinessBook(learnerId);
  await saveReadinessBook(book);
  const snap = buildReadinessSnapshot(book, book.updatedAt);
  track("readiness_seeded", {
    learnerId,
    units: book.units.length,
    overallPct: snap.overallPct,
  });
  return {
    learnerId,
    unitCount: book.units.length,
    overallPct: snap.overallPct,
  };
}

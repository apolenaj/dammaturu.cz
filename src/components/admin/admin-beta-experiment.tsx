import Link from "next/link";
import { promises as fs } from "node:fs";
import path from "node:path";
import { BETA_EXPERIMENT_DIR } from "@/server/beta-experiment/store";
import { experimentBookSchema } from "@/domain/learning/beta-experiment";
import { Badge } from "@/components/ui/badge";

/**
 * Admin glance at N=1 experiment books — no fake stats.
 */
export async function AdminBetaExperimentGlance() {
  let files: string[] = [];
  try {
    files = (await fs.readdir(BETA_EXPERIMENT_DIR)).filter((f) =>
      f.endsWith(".json"),
    );
  } catch {
    files = [];
  }

  const rows: Array<{
    learnerId: string;
    hasBaseline: boolean;
    days: number;
    methods: number;
    weekly: number;
    hasFinal: boolean;
  }> = [];

  for (const f of files.slice(0, 20)) {
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(BETA_EXPERIMENT_DIR, f), "utf8"),
      );
      const book = experimentBookSchema.parse(raw);
      const methods = book.methodStats.filter((m) => m.attempts > 0).length;
      rows.push({
        learnerId: book.learnerId,
        hasBaseline: Boolean(book.baseline),
        days: Object.keys(book.dailyByDate).length,
        methods,
        weekly: book.assessments.filter((a) => a.kind === "weekly").length,
        hasFinal: Boolean(book.final),
      });
    } catch {
      // skip
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-2xl text-fg">N=1 Beta experiment</h2>
        <Badge tone="brand">N=1 validation</Badge>
      </div>
      <p className="text-body-sm text-fg-secondary">
        Deskriptivní stav experiment booků. Nevyvozuj statistickou významnost.
        Detail:{" "}
        <Link href="/app/progress/experiment" className="font-semibold text-action">
          learner report
        </Link>{" "}
        ·{" "}
        <code className="text-caption">docs/BETA_EXPERIMENT.md</code>
      </p>
      {rows.length === 0 ? (
        <p className="text-body-sm text-fg-muted">
          Zatím žádný experiment book (`data/beta-experiment/`).
        </p>
      ) : (
        <ul className="space-y-2 text-body-sm">
          {rows.map((r) => (
            <li
              key={r.learnerId}
              className="flex flex-wrap gap-x-4 gap-y-1 border-b border-border py-2"
            >
              <span className="font-mono text-caption text-fg-muted">
                {r.learnerId.slice(0, 12)}…
              </span>
              <span>
                baseline {r.hasBaseline ? "✓" : "—"} · {r.days} dní ·{" "}
                {r.methods} metod · weekly {r.weekly} · final{" "}
                {r.hasFinal ? "✓" : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import { describe, expect, it } from "vitest";
import {
  getNonsenseStatement,
  gradeNonsenseRound,
  parseNonsensePack,
  scoreStudentReason,
} from "@/domain/learning/najdi-nesmysl";
import { buildCjlNesmyslPack } from "@/server/najdi-nesmysl/packs/cjl-nesmysl";

describe("najdi-nesmysl", () => {
  const pack = parseNonsensePack(
    buildCjlNesmyslPack("2026-07-20T12:00:00.000Z"),
  );

  it("covers all six categories with exactly one false claim each", () => {
    const cats = new Set(pack.rounds.map((r) => r.category));
    expect(cats.size).toBe(6);
    expect(pack.rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of pack.rounds) {
      expect(round.statements.filter((s) => !s.isTrue)).toHaveLength(1);
      expect(round.explanation.length).toBeGreaterThanOrEqual(80);
    }
  });

  it("grades pick and always returns corrective explanation", () => {
    const round = pack.rounds[0]!;
    const nonsense = getNonsenseStatement(round);
    const trueOne = round.statements.find((s) => s.isTrue)!;

    const ok = gradeNonsenseRound({
      round,
      selectedStatementId: nonsense.id,
      studentReason:
        "Babičku napsala Němcová, ne Mácha — to je záměna autora realistické prózy.",
    });
    expect(ok.pickCorrect).toBe(true);
    expect(ok.explanation).toBe(round.explanation);
    expect(ok.explanation.length).toBeGreaterThanOrEqual(80);

    const bad = gradeNonsenseRound({
      round,
      selectedStatementId: trueOne.id,
      studentReason: "Protože mi to tak přišlo.",
    });
    expect(bad.pickCorrect).toBe(false);
    expect(bad.explanation).toContain("Nesmysl");
    expect(bad.nonsense.id).toBe(nonsense.id);
  });

  it("scores student reason quality from keyword overlap", () => {
    expect(scoreStudentReason("kratke", "dlouhe vysvetleni o autorovi")).toBe(
      "thin",
    );
    expect(
      scoreStudentReason(
        "Babičku napsala Němcová, ne Mácha, záměna autora.",
        pack.rounds[0]!.explanation,
      ),
    ).not.toBe("thin");
  });
});

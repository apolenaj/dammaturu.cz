import { describe, expect, it } from "vitest";
import {
  buildAtomSequence,
  buildLearningSession,
  DONT_KNOW_TOKEN,
  explainSimplyFromSource,
  gradeLearningResponse,
  type LearningAtom,
} from "@/domain/learning/learning-session-engine";

const atomA: LearningAtom = {
  id: "a1",
  title: "Realismus",
  statement:
    "Realismus zobrazuje skutečnost bez idealizace a používá typizaci postav.",
  kind: "concept",
  topic: "Literární směry",
  subtopic: "Realismus",
  sourceId: "cjl-realismus",
  sourceTitle: "1. Realismus",
  sourceChunkId: "ch1",
  sourceText:
    "Realismus je umělecký směr 2. pol. 19. století. Zobrazuje skutečnost bez idealizace. Typizace postav je základní postup.",
  headingPath: "Charakteristické rysy",
  charStart: 0,
  charEnd: 120,
  tags: ["cjl", "realismus"],
};

const atomB: LearningAtom = {
  id: "a2",
  title: "Romantismus",
  statement: "Romantismus zdůrazňuje cit, individualitu a výjimečného hrdinu.",
  kind: "concept",
  topic: "Literární směry",
  subtopic: "Romantismus",
  sourceId: "cjl-romantismus",
  sourceTitle: "Romantismus",
  sourceChunkId: "ch2",
  sourceText:
    "Romantismus klade důraz na cit a individualitu. Hrdina je výjimečný.",
  headingPath: null,
  charStart: 0,
  charEnd: 80,
  tags: ["cjl", "romantismus"],
};

describe("learning session engine", () => {
  it("builds recall-before-reveal sequence per atom", () => {
    const steps = buildAtomSequence(atomA, [atomA, atomB]);
    expect(steps.map((s) => s.stepKind)).toEqual([
      "micro",
      "primary",
      "follow_up",
      "confidence",
    ]);
    const primary = steps[1]!;
    expect(primary.prompt).not.toContain(atomA.statement);
    expect(primary.idealAnswer).toContain("Realismus");
  });

  it("micro framing does not embed the full statement", () => {
    const micro = buildAtomSequence(atomA, [atomA])[0]!;
    expect(micro.prompt).not.toContain("bez idealizace");
    expect(micro.microText ?? "").not.toContain(atomA.statement);
  });

  it("does not treat MCQ as the only form across a session", () => {
    const session = buildLearningSession({
      learnerId: "g1",
      subject: "ČJL",
      title: "Test",
      atoms: [atomA, atomB],
      maxAtoms: 2,
    });
    const primaryKinds = session.items
      .filter((i) => i.stepKind === "primary")
      .map((i) => i.interaction);
    expect(primaryKinds.some((k) => k !== "multiple_choice")).toBe(true);
  });

  it("grades Nevím as incorrect and then allows reveal via feedback", () => {
    const primary = buildAtomSequence(atomA, [atomA, atomB])[1]!;
    const grade = gradeLearningResponse({
      item: primary,
      rawAnswer: DONT_KNOW_TOKEN,
    });
    expect(grade.result).toBe("incorrect");
    expect(grade.whatWasMissing.length).toBeGreaterThan(0);
    expect(grade.conciseExplanation.length).toBeGreaterThan(10);
    expect(grade.source.excerpt.length).toBeGreaterThan(10);
  });

  it("grades a strong open answer as correct or partial", () => {
    const primary = buildAtomSequence(atomA, [atomA, atomB]).find(
      (s) =>
        s.stepKind === "primary" &&
        (s.interaction === "free_recall" ||
          s.interaction === "short_answer" ||
          s.interaction === "explain_own_words"),
    );
    if (!primary) return;
    const grade = gradeLearningResponse({
      item: primary,
      rawAnswer: atomA.statement,
    });
    expect(["correct", "partial"]).toContain(grade.result);
  });

  it("explains simply only from source text", () => {
    const exp = explainSimplyFromSource(atomA);
    expect(exp.insufficient).toBe(false);
    expect(exp.text).toContain("Realismus");
    expect(exp.source.sourceId).toBe("cjl-realismus");
  });

  it("marks thin source as insufficient for simple explanation", () => {
    const thin: LearningAtom = {
      ...atomA,
      sourceText: "Málo.",
    };
    const exp = explainSimplyFromSource(thin);
    expect(exp.insufficient).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildMasteryEvidence,
  progressDetailCs,
  slugifyTopic,
} from "@/domain/study-content/cjl-home";

describe("cjl home evidence helpers", () => {
  it("never invents mastery from few attempts", () => {
    const low = buildMasteryEvidence(2, 4);
    expect(low.kind).toBe("insufficient");
    expect(low.labelCs).toBe("Ještě nemáme dost výsledků");
  });

  it("shows raw counts when evidence is enough", () => {
    const ok = buildMasteryEvidence(4, 6);
    expect(ok.kind).toBe("supported");
    if (ok.kind === "supported") {
      expect(ok.labelCs).toBe("V testech: 4 správně z 6");
      expect(ok.labelCs).not.toMatch(/%/);
    }
  });

  it("describes progress without percentages", () => {
    expect(progressDetailCs(0, 10)).toBe("Ještě jsi nezačal/a");
    expect(progressDetailCs(3, 10)).toBe("Přečteno 3 z 10 úseků");
    expect(progressDetailCs(3, 10)).not.toMatch(/%/);
  });

  it("slugifies Czech topics stably", () => {
    expect(slugifyTopic("Literární směry")).toBe("literarni-smery");
  });
});

import { describe, expect, it } from "vitest";
import { detectFlagsForItem } from "@/server/content-qa/detectors";
import {
  extractYearPairs,
  normalizeStatement,
} from "@/server/content-qa/normalize";

describe("normalizeStatement", () => {
  it("only applies cosmetic cleanup — keeps years and names", () => {
    const source = "  Ladislav   Stroupežnický  (1850 – 1820)  ";
    expect(normalizeStatement(source)).toBe(
      "Ladislav Stroupežnický (1850 – 1820)",
    );
  });
});

describe("extractYearPairs", () => {
  it("parses death-before-birth pairs", () => {
    const pairs = extractYearPairs("Stroupežnický (1850 – 1820)");
    expect(pairs).toEqual([
      { birth: 1850, death: 1820, raw: "(1850 – 1820)" },
    ]);
  });
});

describe("detectFlagsForItem", () => {
  it("flags death before birth and impossible chronology", () => {
    const item = {
      id: "1",
      knowledgeUnitId: "ku-1",
      title: "Stroupežnický",
      statement: "Ladislav Stroupežnický (1850 – 1820) byl dramatik.",
      kind: "person",
    };
    const flags = detectFlagsForItem(item, [item]);
    const codes = flags.map((f) => f.code);
    expect(codes).toContain("death_before_birth");
    expect(codes).toContain("impossible_chronology");
  });

  it("flags duplicate statements", () => {
    const a = {
      id: "a",
      knowledgeUnitId: "ku-a",
      title: "Máj",
      statement: "Máj je lyrickoepická báseň Karla Hynek Mácha z roku 1836.",
      kind: "work",
    };
    const b = {
      id: "b",
      knowledgeUnitId: "ku-b",
      title: "Máj",
      statement: "Máj je lyrickoepická báseň Karla Hynek Mácha z roku 1836.",
      kind: "work",
    };
    const flags = detectFlagsForItem(a, [a, b]);
    expect(flags.some((f) => f.code === "duplicate_statement")).toBe(true);
  });

  it("flags similar entity with conflicting years", () => {
    const a = {
      id: "a",
      knowledgeUnitId: "ku-a",
      title: "Neruda",
      statement: "Jan Neruda (1834 – 1891) byl spisovatel.",
      kind: "person",
    };
    const b = {
      id: "b",
      knowledgeUnitId: "ku-b",
      title: "Neruda",
      statement: "Jan Neruda (1834 – 1892) byl spisovatel.",
      kind: "person",
    };
    const flags = detectFlagsForItem(a, [a, b]);
    expect(flags.some((f) => f.code === "similar_entity_conflict")).toBe(true);
    expect(flags.some((f) => f.code === "conflicting_data")).toBe(true);
  });

  it("never mutates the candidate statement", () => {
    const statement = "Bad years (1900 – 1800) stay intact.";
    const item = {
      id: "x",
      knowledgeUnitId: "ku-x",
      title: "X",
      statement,
      kind: "fact",
    };
    detectFlagsForItem(item, [item]);
    expect(item.statement).toBe(statement);
  });
});

describe("extractBioStatementsFromText", () => {
  it("extracts Stroupežnický death-before-birth line", async () => {
    const { extractBioStatementsFromText } = await import(
      "@/server/content-qa/extract-bios"
    );
    const bios = extractBioStatementsFromText(
      "České drama\n\nLadislav Stroupežnický (1850 – 1820)\n\ndramatik",
    );
    expect(bios).toEqual([
      {
        title: "Ladislav Stroupežnický",
        statement: "Ladislav Stroupežnický (1850 – 1820)",
      },
    ]);
  });
});

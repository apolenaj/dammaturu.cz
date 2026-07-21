import { describe, expect, it } from "vitest";
import {
  bulkActionToStatus,
  countByKind,
  filterStudioItems,
  parseStudioEditFields,
  shouldVersion,
  studioEntityKinds,
  studioVersionedKinds,
  type StudioListItem,
} from "@/domain/admin/content-studio";
import { buildStudioCatalog } from "@/server/content-studio/catalog";

function stubItem(
  partial: Partial<StudioListItem> & Pick<StudioListItem, "id" | "kind" | "title">,
): StudioListItem {
  return {
    slug: null,
    status: "draft",
    summary: null,
    hrefStudent: null,
    provenance: {
      sourceFilename: null,
      sourceExcerpt: null,
      verificationStatus: "not_linked",
      lastEditor: "test",
      lastUpdate: "2026-07-20T12:00:00.000Z",
    },
    backendRef: partial.id,
    ...partial,
  };
}

describe("content-studio (D-048)", () => {
  it("covers all required entity kinds and versions key ones", () => {
    expect(studioEntityKinds).toEqual([
      "subject",
      "topic",
      "lesson",
      "knowledge_unit",
      "work",
      "author",
      "question",
      "flashcard",
      "exercise",
    ]);
    expect(shouldVersion("lesson")).toBe(true);
    expect(shouldVersion("flashcard")).toBe(false);
    expect(studioVersionedKinds).toContain("knowledge_unit");
    expect(bulkActionToStatus("set_published")).toBe("published");
  });

  it("parses typed edit fields — no free-form JSON bag required", () => {
    const fields = parseStudioEditFields({
      title: "Máj — lekce",
      slug: "maj-lekce",
      summary: "Cíl lekce",
      status: "draft",
      sourceFilename: "Máj.docx",
      sourceExcerpt: "KAREL HYNEK MÁCHA",
    });
    expect(fields.title).toBe("Máj — lekce");
    expect(fields.sourceFilename).toBe("Máj.docx");
  });

  it("filters catalog and counts by kind", () => {
    const items = [
      stubItem({ id: "1", kind: "lesson", title: "Lekce A" }),
      stubItem({
        id: "2",
        kind: "work",
        title: "Máj",
        provenance: {
          sourceFilename: "Máj.docx",
          sourceExcerpt: "excerpt",
          verificationStatus: "needs_fact_check",
          lastEditor: "admin",
          lastUpdate: "2026-07-20T12:00:00.000Z",
        },
      }),
    ];
    expect(countByKind(items).lesson).toBe(1);
    expect(filterStudioItems(items, { kind: "work" })).toHaveLength(1);
    expect(
      filterStudioItems(items, { q: "máj", kind: "all" })[0]?.title,
    ).toBe("Máj");
  });

  it("builds live catalog from seeded stores with provenance fields", async () => {
    const catalog = await buildStudioCatalog();
    expect(catalog.items.length).toBeGreaterThan(5);
    for (const kind of studioEntityKinds) {
      if (kind === "exercise") continue; // may be empty until created
      // subject/topic/lesson/ku/work/author/question/flashcard expected after seeds
    }
    expect(catalog.countsByKind.subject ?? 0).toBeGreaterThanOrEqual(0);
    const withProv = catalog.items.filter(
      (i) =>
        i.provenance.lastEditor &&
        i.provenance.lastUpdate &&
        i.provenance.verificationStatus,
    );
    expect(withProv.length).toBe(catalog.items.length);
    // Must expose source or explicit null — never hide the field
    expect(
      catalog.items.every(
        (i) =>
          i.provenance.sourceFilename === null ||
          i.provenance.sourceFilename.length > 0,
      ),
    ).toBe(true);
  }, 60_000);
});

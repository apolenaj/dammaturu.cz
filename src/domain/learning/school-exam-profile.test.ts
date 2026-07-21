import { describe, expect, it } from "vitest";
import {
  assertDocKindSource,
  buildSchoolExamProfileView,
  CERMAT_CJL_REQUIREMENTS,
  emptySchoolExamProfile,
  schoolExamDocKindSource,
  requirementSourceLabelsCs,
} from "@/domain/learning/school-exam-profile";

describe("school-exam-profile (D-051)", () => {
  it("keeps CERMAT catalog labeled and separate from school/student", () => {
    const profile = emptySchoolExamProfile(
      "learner1",
      "gymnazium",
      "2026-07-21T12:00:00.000Z",
    );
    const view = buildSchoolExamProfileView(profile);
    expect(view.sections).toHaveLength(3);
    expect(view.sections.map((s) => s.source)).toEqual([
      "cermat",
      "school",
      "student",
    ]);
    const cermat = view.sections[0]!;
    expect(cermat.requirements.length).toBe(CERMAT_CJL_REQUIREMENTS.length);
    expect(
      cermat.requirements.every((r) => r.sourceLabelCs === "CERMAT"),
    ).toBe(true);
    expect(cermat.documents).toHaveLength(0);
    expect(view.philosophyCs.toLowerCase()).toMatch(/oddělen/);
  });

  it("maps upload kinds to school or student — never CERMAT", () => {
    expect(schoolExamDocKindSource.literature_list).toBe("school");
    expect(schoolExamDocKindSource.selected_books).toBe("student");
    expect(schoolExamDocKindSource.writing_criteria).toBe("school");
    expect(() =>
      assertDocKindSource("literature_list", "cermat"),
    ).toThrow(/CERMAT/);
    expect(() =>
      assertDocKindSource("selected_books", "school"),
    ).toThrow(/Moje materiály/);
  });

  it("labels school documents and student books without mixing sources", () => {
    const now = "2026-07-21T12:00:00.000Z";
    const profile = emptySchoolExamProfile("learner1", "ss_odborna", now);
    profile.documents.push({
      id: "11111111-1111-4111-8111-111111111111",
      kind: "literature_list",
      source: "school",
      sourceLabelCs: requirementSourceLabelsCs.school,
      title: "Seznam 2026",
      originalFilename: "seznam.pdf",
      format: "pdf",
      mimeType: "application/pdf",
      byteSize: 100,
      contentSha256: "a".repeat(64),
      storageFilename: "x.pdf",
      status: "ready",
      statusMessage: null,
      createdAt: now,
      updatedAt: now,
    });
    profile.selectedBooks.push({
      id: "b1",
      titleCs: "Máj",
      authorCs: "Mácha",
    });

    const view = buildSchoolExamProfileView(profile);
    const school = view.sections.find((s) => s.source === "school")!;
    const student = view.sections.find((s) => s.source === "student")!;
    expect(school.requirements.every((r) => r.source === "school")).toBe(true);
    expect(student.requirements.every((r) => r.source === "student")).toBe(
      true,
    );
    expect(student.requirements.some((r) => r.titleCs === "Máj")).toBe(true);
    expect(JSON.stringify(school.requirements)).not.toMatch(/CERMAT/);
    expect(view.completeness.readyDocumentCount).toBe(1);
  });
});

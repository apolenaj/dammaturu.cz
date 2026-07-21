import { describe, expect, it } from "vitest";
import { getTableName } from "drizzle-orm";
import * as schema from "@/db/schema";

describe("production db schema", () => {
  it("exports all required product entities as tables", () => {
    const required = [
      "users",
      "studentProfiles",
      "schoolProfiles",
      "exams",
      "subjects",
      "studyMaterials",
      "sourceDocuments",
      "sourceChunks",
      "knowledgeUnits",
      "topics",
      "questions",
      "questionAttempts",
      "studySessions",
      "mistakes",
      "masteryStates",
      "reviewSchedules",
      "studyPlans",
      "dailyMissions",
      "mockExams",
      "mockExamAttempts",
      "readinessSnapshots",
      "subjectEnrollments",
      "billingSubscriptions",
      "billingEvents",
    ] as const;

    for (const key of required) {
      expect(schema[key], key).toBeTruthy();
      expect(getTableName(schema[key])).toBeTruthy();
    }
  });

  it("keeps Document/DocumentChunk as source_* tables (no parallel documents table)", () => {
    expect(schema).not.toHaveProperty("documents");
    expect(schema).not.toHaveProperty("documentChunks");
    expect(getTableName(schema.sourceDocuments)).toBe("source_documents");
    expect(getTableName(schema.sourceChunks)).toBe("source_chunks");
  });
});

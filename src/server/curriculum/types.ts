import { z } from "zod";
import {
  curriculumSchema,
  examRelevanceSchema,
  moduleSchema,
  publishStatusSchema,
  subjectSchema,
  topicPrerequisiteSchema,
  topicSchema,
} from "@/domain/content/schemas";

export const curriculumTopicNodeSchema = topicSchema.extend({
  prerequisiteSlugs: z.array(z.string()).default([]),
});

export const curriculumModuleNodeSchema = moduleSchema.extend({
  topics: z.array(curriculumTopicNodeSchema),
});

/** Materialized curriculum pack — what UI/repos read (never hardcode in UI). */
export const curriculumPackSchema = z.object({
  subject: subjectSchema,
  curriculum: curriculumSchema,
  modules: z.array(curriculumModuleNodeSchema),
  /** Flattened dependency edges (topic → prerequisite). */
  topicPrerequisites: z.array(topicPrerequisiteSchema),
  seededAt: z.string().datetime(),
  definitionVersion: z.number().int().positive(),
});

export type CurriculumPack = z.infer<typeof curriculumPackSchema>;
export type CurriculumModuleNode = z.infer<typeof curriculumModuleNodeSchema>;
export type CurriculumTopicNode = z.infer<typeof curriculumTopicNodeSchema>;

/** Authoring shape for seed definitions (slugs only; IDs assigned at seed). */
export const curriculumDefinitionSchema = z.object({
  definitionVersion: z.number().int().positive(),
  subject: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: publishStatusSchema,
  }),
  curriculum: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    targetExam: z.string().nullable(),
    status: publishStatusSchema,
    version: z.number().int().positive(),
  }),
  modules: z.array(
    z.object({
      slug: z.string(),
      code: z.string(),
      title: z.string(),
      summary: z.string().nullable(),
      orderIndex: z.number().int().min(0),
      status: publishStatusSchema,
      topics: z.array(
        z.object({
          slug: z.string(),
          title: z.string(),
          summary: z.string().nullable(),
          orderIndex: z.number().int().min(0),
          examRelevance: examRelevanceSchema,
          status: publishStatusSchema,
          sourceFilenames: z.array(z.string()).default([]),
          /** Topic slugs that must come before this one. */
          prerequisiteSlugs: z.array(z.string()).default([]),
        }),
      ),
    }),
  ),
});

export type CurriculumDefinition = z.infer<typeof curriculumDefinitionSchema>;

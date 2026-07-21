import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  parseStudioEditFields,
  studioEntityKinds,
  studioVersionEntrySchema,
  type StudioEditFields,
  type StudioEntityKind,
  type StudioVersionEntry,
} from "@/domain/admin/content-studio";

export const CONTENT_STUDIO_DIR = path.join(
  process.cwd(),
  "data",
  "content-studio",
);

const OVERRIDES_DIR = path.join(CONTENT_STUDIO_DIR, "overrides");
const VERSIONS_DIR = path.join(CONTENT_STUDIO_DIR, "versions");

const overrideSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(studioEntityKinds),
  fields: z.record(z.string(), z.unknown()),
  lastEditor: z.string().min(1).max(120),
  updatedAt: z.string().datetime(),
});

export type StudioOverride = {
  id: string;
  kind: StudioEntityKind;
  fields: StudioEditFields;
  lastEditor: string;
  updatedAt: string;
};

async function ensureDirs() {
  await fs.mkdir(OVERRIDES_DIR, { recursive: true });
  await fs.mkdir(VERSIONS_DIR, { recursive: true });
}

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 120);
}

export async function getStudioOverrides(): Promise<StudioOverride[]> {
  await ensureDirs();
  const files = await fs.readdir(OVERRIDES_DIR);
  const out: StudioOverride[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = JSON.parse(
      await fs.readFile(path.join(OVERRIDES_DIR, file), "utf8"),
    );
    const parsed = overrideSchema.parse(raw);
    out.push({
      id: parsed.id,
      kind: parsed.kind,
      fields: parseStudioEditFields(parsed.fields),
      lastEditor: parsed.lastEditor,
      updatedAt: parsed.updatedAt,
    });
  }
  return out;
}

export async function saveStudioOverride(
  override: StudioOverride,
): Promise<void> {
  await ensureDirs();
  const fields = parseStudioEditFields(override.fields);
  const payload = {
    id: override.id,
    kind: override.kind,
    fields,
    lastEditor: override.lastEditor,
    updatedAt: override.updatedAt,
  };
  const file = path.join(OVERRIDES_DIR, `${safeId(override.id)}.json`);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function saveStudioVersion(
  entry: StudioVersionEntry,
): Promise<void> {
  const validated = studioVersionEntrySchema.parse(entry);
  await ensureDirs();
  const dir = path.join(VERSIONS_DIR, safeId(validated.entityId));
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `v${validated.version}.json`);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export async function listStudioVersions(
  entityId: string,
): Promise<StudioVersionEntry[]> {
  const dir = path.join(VERSIONS_DIR, safeId(entityId));
  try {
    const files = await fs.readdir(dir);
    const entries: StudioVersionEntry[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      entries.push(
        studioVersionEntrySchema.parse(
          JSON.parse(await fs.readFile(path.join(dir, file), "utf8")),
        ),
      );
    }
    return entries.sort((a, b) => b.version - a.version);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw error;
  }
}

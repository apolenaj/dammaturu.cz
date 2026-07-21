"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  studioBulkActionLabelsCs,
  studioBulkActions,
  studioEntityKindLabelsCs,
  studioEntityKinds,
  studioVerificationLabelsCs,
  type StudioBulkAction,
  type StudioEditFields,
  type StudioEntityKind,
  type StudioLessonPreview,
  type StudioListItem,
  type StudioVersionEntry,
  type StudioVerificationStatus,
} from "@/domain/admin/content-studio";
import { publishStatuses } from "@/domain/content/schemas";
import {
  bulkContentStudioAction,
  createContentStudioExerciseAction,
  getContentStudioItemAction,
  getLessonStudentPreviewAction,
  saveContentStudioItemAction,
} from "@/server/actions/content-studio";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function ContentStudioView({
  initialItems,
  countsByKind,
  generatedAt,
}: {
  initialItems: StudioListItem[];
  countsByKind: Record<string, number>;
  generatedAt: string;
}) {
  const [kind, setKind] = useState<StudioEntityKind | "all">("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editorName, setEditorName] = useState("admin");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fields, setFields] = useState<StudioEditFields | null>(null);
  const [versions, setVersions] = useState<StudioVersionEntry[]>([]);
  const [preview, setPreview] = useState<StudioLessonPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showCreateExercise, setShowCreateExercise] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return initialItems.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (!query) return true;
      const hay = `${item.title} ${item.slug ?? ""} ${item.provenance.sourceFilename ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [initialItems, kind, q]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openItem(item: StudioListItem) {
    setError(null);
    setPreview(null);
    startTransition(async () => {
      const got = await getContentStudioItemAction({ id: item.id });
      if (!got) {
        setError("Položka nenalezena.");
        return;
      }
      setActiveId(item.id);
      setFields(got.fields);
      setVersions(got.versions);
      if (item.kind === "lesson") {
        const { preview: p } = await getLessonStudentPreviewAction({
          lessonId: item.id,
        });
        setPreview(p);
      }
    });
  }

  function save() {
    if (!activeId || !fields) return;
    const item = initialItems.find((i) => i.id === activeId);
    if (!item) return;
    setError(null);
    startTransition(async () => {
      const res = await saveContentStudioItemAction({
        id: activeId,
        kind: item.kind,
        fields,
        editor: editorName,
        note: "studio save",
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInfo(
        res.version
          ? `Uloženo (verze ${res.version}). Obnov stránku pro katalog.`
          : "Uloženo. Obnov stránku pro katalog.",
      );
    });
  }

  function runBulk(action: StudioBulkAction) {
    setError(null);
    startTransition(async () => {
      const res = await bulkContentStudioAction({
        ids: [...selected],
        action,
        editor: editorName,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInfo(`Bulk: aktualizováno ${res.updated} položek. Obnov stránku.`);
      setSelected(new Set());
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <Badge tone="brand">Content Studio</Badge>
        <h1 className="font-display text-display-md text-fg">
          Admin Content Studio
        </h1>
        <p className="text-body-sm text-fg-secondary">
          Typed editors · zdroj / excerpt / verification · last editor · preview
          · bulk · version history. Žádné raw JSON.
        </p>
        <p className="text-caption text-fg-muted">
          Katalog {generatedAt} · {initialItems.length} entit
        </p>
        <div className="flex flex-wrap gap-3 text-body-sm font-semibold">
          <Link href="/admin/sources" className="text-action hover:underline">
            Zdroje
          </Link>
          <Link href="/admin/reviews" className="text-action hover:underline">
            Content QA
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-caption">
          Editor
          <input
            className="mt-1 block min-w-40 rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm"
            value={editorName}
            onChange={(e) => setEditorName(e.target.value)}
          />
        </label>
        <label className="text-caption">
          Hledat
          <input
            className="mt-1 block min-w-48 rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="název, slug, zdroj…"
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowCreateExercise((v) => !v)}
        >
          + Exercise
        </Button>
      </div>

      <div
        role="tablist"
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      >
        <KindTab
          active={kind === "all"}
          onClick={() => setKind("all")}
          label={`All (${initialItems.length})`}
        />
        {studioEntityKinds.map((k) => (
          <KindTab
            key={k}
            active={kind === k}
            onClick={() => setKind(k)}
            label={`${studioEntityKindLabelsCs[k]} (${countsByKind[k] ?? 0})`}
          />
        ))}
      </div>

      {showCreateExercise ? (
        <CreateExerciseForm
          editor={editorName}
          onDone={(msg) => {
            setInfo(msg);
            setShowCreateExercise(false);
          }}
          onError={setError}
        />
      ) : null}

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-subtle/50 px-3 py-2">
          <span className="text-caption font-semibold">
            Bulk ({selected.size})
          </span>
          {studioBulkActions.map((a) => (
            <Button
              key={a}
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => runBulk(a)}
            >
              {studioBulkActionLabelsCs[a]}
            </Button>
          ))}
        </div>
      ) : null}

      {error ? (
        <Alert tone="danger" title="Chyba">
          {error}
        </Alert>
      ) : null}
      {info ? (
        <Alert tone="success" title="OK">
          {info}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,380px)]">
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-caption">
            <thead className="bg-subtle text-fg-muted">
              <tr>
                <th className="px-2 py-2"> </th>
                <th className="px-2 py-2">Title</th>
                <th className="px-2 py-2">Zdroj</th>
                <th className="px-2 py-2">Verification</th>
                <th className="px-2 py-2">Editor</th>
                <th className="px-2 py-2">Update</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-t border-border hover:bg-action/5",
                    activeId === item.id && "bg-action/10",
                  )}
                >
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      aria-label={`Vybrat ${item.title}`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className="text-left font-semibold text-fg hover:text-action"
                      onClick={() => openItem(item)}
                    >
                      {item.title}
                    </button>
                    <p className="text-fg-muted">
                      {item.kind} · {item.status}
                    </p>
                  </td>
                  <td className="max-w-[8rem] truncate px-2 py-2 text-fg-secondary">
                    {item.provenance.sourceFilename ?? "—"}
                    {item.provenance.sourceExcerpt ? (
                      <span className="block truncate text-fg-muted">
                        {item.provenance.sourceExcerpt}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <VerificationBadge
                      status={item.provenance.verificationStatus}
                    />
                  </td>
                  <td className="px-2 py-2 text-fg-secondary">
                    {item.provenance.lastEditor}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-fg-muted">
                    {item.provenance.lastUpdate.slice(0, 16).replace("T", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-body-sm text-fg-secondary">
              Žádné položky.
            </p>
          ) : null}
        </div>

        <aside className="space-y-4">
          {fields && activeId ? (
            <EditorPanel
              fields={fields}
              setFields={setFields}
              versions={versions}
              preview={preview}
              pending={pending}
              onSave={save}
              activeKind={
                initialItems.find((i) => i.id === activeId)?.kind ?? null
              }
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-body-sm text-fg-muted">
              Vyber položku pro typed edit (ne JSON).
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function KindTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-md px-3 py-2 text-caption font-semibold transition",
        active
          ? "bg-surface text-fg shadow-xs ring-1 ring-border"
          : "bg-subtle text-fg-secondary hover:text-fg",
      )}
    >
      {label}
    </button>
  );
}

function VerificationBadge({ status }: { status: StudioVerificationStatus }) {
  const tone =
    status === "verified_from_source" || status === "corrected"
      ? "success"
      : status === "rejected"
        ? "danger"
        : status === "needs_fact_check"
          ? "warning"
          : "neutral";
  return <Badge tone={tone}>{studioVerificationLabelsCs[status]}</Badge>;
}

function EditorPanel({
  fields,
  setFields,
  versions,
  preview,
  pending,
  onSave,
  activeKind,
}: {
  fields: StudioEditFields;
  setFields: (f: StudioEditFields) => void;
  versions: StudioVersionEntry[];
  preview: StudioLessonPreview | null;
  pending: boolean;
  onSave: () => void;
  activeKind: StudioEntityKind | null;
}) {
  function set<K extends keyof StudioEditFields>(key: K, value: StudioEditFields[K]) {
    setFields({ ...fields, [key]: value });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-canvas px-4 py-4">
      <h2 className="font-display text-xl text-fg">Edit</h2>
      <Field label="Title">
        <input
          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm"
          value={fields.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </Field>
      <Field label="Slug (kebab-case)">
        <input
          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm"
          value={fields.slug ?? ""}
          onChange={(e) =>
            set("slug", e.target.value.trim() ? e.target.value.trim() : null)
          }
        />
      </Field>
      <Field label="Summary">
        <textarea
          className="min-h-20 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm"
          value={fields.summary ?? ""}
          onChange={(e) => set("summary", e.target.value || null)}
        />
      </Field>
      <Field label="Status">
        <select
          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm"
          value={fields.status ?? "draft"}
          onChange={(e) =>
            set(
              "status",
              e.target.value as (typeof publishStatuses)[number],
            )
          }
        >
          {publishStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Source filename">
        <input
          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm"
          value={fields.sourceFilename ?? ""}
          onChange={(e) => set("sourceFilename", e.target.value || null)}
        />
      </Field>
      <Field label="Source excerpt">
        <textarea
          className="min-h-16 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm"
          value={fields.sourceExcerpt ?? ""}
          onChange={(e) => set("sourceExcerpt", e.target.value || null)}
        />
      </Field>
      {(activeKind === "flashcard" ||
        activeKind === "question" ||
        activeKind === "exercise") && (
        <>
          <Field label="Prompt">
            <textarea
              className="min-h-16 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm"
              value={fields.prompt ?? ""}
              onChange={(e) => set("prompt", e.target.value)}
            />
          </Field>
          <Field label="Answer / explanation">
            <textarea
              className="min-h-16 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm"
              value={fields.answer ?? ""}
              onChange={(e) => set("answer", e.target.value)}
            />
          </Field>
        </>
      )}
      {activeKind === "work" || activeKind === "author" ? (
        <Field label="Author name">
          <input
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm"
            value={fields.authorName ?? ""}
            onChange={(e) => set("authorName", e.target.value)}
          />
        </Field>
      ) : null}
      {activeKind === "lesson" ? (
        <>
          <Field label="Objective">
            <textarea
              className="min-h-16 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm"
              value={fields.objective ?? ""}
              onChange={(e) => set("objective", e.target.value)}
            />
          </Field>
          <Field label="Estimated minutes">
            <input
              type="number"
              min={3}
              max={90}
              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm"
              value={fields.estimatedMinutes ?? 12}
              onChange={(e) =>
                set("estimatedMinutes", Number(e.target.value) || 12)
              }
            />
          </Field>
        </>
      ) : null}

      <Button type="button" onClick={onSave} disabled={pending}>
        Uložit (typed)
      </Button>

      {versions.length > 0 ? (
        <div>
          <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
            Version history
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-caption text-fg-secondary">
            {versions.map((v) => (
              <li key={v.id}>
                v{v.version} · {v.editor} ·{" "}
                {v.createdAt.slice(0, 16).replace("T", " ")}
                {v.note ? ` · ${v.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview ? (
        <div className="rounded-xl border border-border bg-subtle/40 px-3 py-3">
          <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
            Preview — jak lekci uvidí student
          </p>
          <p className="mt-2 font-display text-body-md text-fg">
            {preview.title}
          </p>
          <p className="text-caption text-fg-secondary">
            {preview.objective} · {preview.estimatedMinutes} min
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-body-sm text-fg">
            {preview.blocks.map((b, i) => (
              <li key={`${b.type}-${i}`}>
                <span className="font-semibold">{b.labelCs}</span>
                <span className="text-fg-secondary"> — {b.text}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-caption text-fg-muted">{preview.noteCs}</p>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-caption font-semibold text-fg-muted">
      {label}
      <div className="mt-1 font-normal">{children}</div>
    </label>
  );
}

function CreateExerciseForm({
  editor,
  onDone,
  onError,
}: {
  editor: string;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [sourceFilename, setSourceFilename] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-canvas px-4 py-4">
      <h2 className="font-display text-lg text-fg">Nové exercise</h2>
      <input
        className="w-full rounded-md border border-border px-2 py-1.5 text-body-sm"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="min-h-16 w-full rounded-md border border-border px-2 py-1.5 text-body-sm"
        placeholder="Prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <textarea
        className="min-h-16 w-full rounded-md border border-border px-2 py-1.5 text-body-sm"
        placeholder="Answer"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      <input
        className="w-full rounded-md border border-border px-2 py-1.5 text-body-sm"
        placeholder="Source filename (optional)"
        value={sourceFilename}
        onChange={(e) => setSourceFilename(e.target.value)}
      />
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const res = await createContentStudioExerciseAction({
              title,
              prompt,
              answer,
              editor,
              sourceFilename: sourceFilename || null,
              sourceExcerpt: prompt.slice(0, 160),
            });
            if (!res.ok) {
              onError(res.error);
              return;
            }
            onDone(`Exercise vytvořeno: ${res.id}. Obnov stránku.`);
          });
        }}
      >
        Vytvořit
      </Button>
    </div>
  );
}

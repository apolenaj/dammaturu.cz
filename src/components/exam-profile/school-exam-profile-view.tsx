"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  schoolExamDocKinds,
  schoolExamDocKindHintsCs,
  schoolExamDocKindLabelsCs,
  schoolExamDocKindSource,
  requirementSourceLabelsCs,
  type SchoolExamDocKind,
  type SchoolExamProfileView,
  type SelectedBook,
} from "@/domain/learning/school-exam-profile";
import {
  deleteSchoolExamDocumentAction,
  updateSchoolExamMetaAction,
} from "@/server/actions/school-exam-profile";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function sourceTone(source: string): BadgeTone {
  if (source === "cermat") return "brand";
  if (source === "school") return "warning";
  return "accent";
}

export function SchoolExamProfileViewPanel({
  initialView,
}: {
  initialView: SchoolExamProfileView;
}) {
  const [view, setView] = useState(initialView);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<SchoolExamDocKind>("literature_list");
  const [uploading, setUploading] = useState(false);
  const [schoolName, setSchoolName] = useState(view.schoolName ?? "");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function saveMeta(patch: {
    schoolName?: string | null;
    selectedBooks?: SelectedBook[];
  }) {
    setError(null);
    startTransition(async () => {
      const res = await updateSchoolExamMetaAction(patch);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setView(res.view);
    });
  }

  function removeDoc(documentId: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteSchoolExamDocumentAction({ documentId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setView(res.view);
    });
  }

  function addBook() {
    const title = bookTitle.trim();
    if (!title) return;
    const next: SelectedBook[] = [
      ...view.selectedBooks,
      {
        id: `b-${Date.now()}`,
        titleCs: title,
        authorCs: bookAuthor.trim() || undefined,
      },
    ];
    setBookTitle("");
    setBookAuthor("");
    saveMeta({ selectedBooks: next });
  }

  function removeBook(id: string) {
    saveMeta({
      selectedBooks: view.selectedBooks.filter((b) => b.id !== id),
    });
  }

  async function uploadFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      const res = await fetch("/api/school-exam/upload", {
        method: "POST",
        body,
      });
      const raw = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !raw.ok) {
        setError(raw.error || "Nahrání se nepovedlo.");
        return;
      }
      // Refresh view via meta no-op (revalidate) — fetch action
      const refreshed = await updateSchoolExamMetaAction({
        schoolName: schoolName.trim() || null,
      });
      if (refreshed.ok) setView(refreshed.view);
    } catch {
      setError("Síťová chyba při nahrávání.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const layerLabel = requirementSourceLabelsCs[schoolExamDocKindSource[kind]];

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <Badge tone="brand">Profil maturity</Badge>
        <h1 className="font-display text-display-md text-fg">
          Školní maturitní profil
        </h1>
        <p className="text-body-md text-fg-secondary">{view.philosophyCs}</p>
        <p className="text-caption text-fg-muted">
          {view.subjectLabelCs} · {view.schoolTypeLabelCs}
          {view.schoolName ? ` · ${view.schoolName}` : ""}
        </p>
      </header>

      <Alert title={`Doplněnost ${view.completeness.pct} %`} tone="info">
        {view.completeness.summaryCs}
      </Alert>

      {/* School name */}
      <section className="space-y-2">
        <h2 className="font-display text-lg text-fg">Název školy</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="např. Gymnázium …"
            className="min-h-11 flex-1 rounded-md border border-border bg-canvas px-3 text-body-sm text-fg"
          />
          <Button
            type="button"
            disabled={pending}
            onClick={() => saveMeta({ schoolName: schoolName.trim() || null })}
          >
            Uložit
          </Button>
        </div>
      </section>

      {/* Upload */}
      <section className="space-y-3 rounded-2xl border border-border bg-subtle/30 px-4 py-4">
        <h2 className="font-display text-xl text-fg">Nahrát dokument</h2>
        <p className="text-body-sm text-fg-secondary">
          Typ dokumentu určuje vrstvu zdroje. Teď:{" "}
          <Badge tone={sourceTone(schoolExamDocKindSource[kind])}>
            {layerLabel}
          </Badge>
        </p>
        <label className="block space-y-1">
          <span className="text-caption font-semibold text-fg-muted">
            Typ dokumentu
          </span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as SchoolExamDocKind)}
            className="min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body-sm text-fg"
          >
            {schoolExamDocKinds.map((k) => (
              <option key={k} value={k}>
                {schoolExamDocKindLabelsCs[k]} (
                {requirementSourceLabelsCs[schoolExamDocKindSource[k]]})
              </option>
            ))}
          </select>
          <span className="text-caption text-fg-secondary">
            {schoolExamDocKindHintsCs[kind]}
          </span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf"
          disabled={uploading || pending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
          }}
          className="block w-full text-body-sm text-fg"
        />
        {uploading ? (
          <p className="text-caption text-fg-muted">Nahrávám…</p>
        ) : null}
      </section>

      {/* Selected books — student layer */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl text-fg">Moje vybrané knihy</h2>
          <Badge tone="accent">Moje materiály</Badge>
        </div>
        <p className="text-body-sm text-fg-secondary">
          Tvoje volba k ústní — není to školní seznam ani CERMAT. Pro karty,
          mastery a „Vylosuj mi knihu“ použij{" "}
          <Link
            href="/app/literature"
            className="font-semibold text-action hover:underline"
          >
            Seznam literatury
          </Link>
          .
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            placeholder="Název díla"
            className="min-h-11 flex-1 rounded-md border border-border bg-canvas px-3 text-body-sm"
          />
          <input
            value={bookAuthor}
            onChange={(e) => setBookAuthor(e.target.value)}
            placeholder="Autor (volitelné)"
            className="min-h-11 flex-1 rounded-md border border-border bg-canvas px-3 text-body-sm"
          />
          <Button type="button" disabled={pending} onClick={addBook}>
            Přidat
          </Button>
        </div>
        {view.selectedBooks.length > 0 ? (
          <ul className="space-y-2">
            {view.selectedBooks.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-canvas px-3 py-2"
              >
                <span className="text-body-sm text-fg">
                  <span className="font-medium">{b.titleCs}</span>
                  {b.authorCs ? (
                    <span className="text-fg-muted"> · {b.authorCs}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => removeBook(b.id)}
                  className="text-caption font-semibold text-danger hover:underline"
                >
                  Odebrat
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Three labeled sections */}
      {view.sections.map((section) => (
        <section key={section.source} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl text-fg">
              {section.sourceLabelCs}
            </h2>
            <Badge tone={sourceTone(section.source)}>
              {section.sourceLabelCs}
            </Badge>
          </div>
          <p className="text-body-sm text-fg-secondary">{section.hintCs}</p>

          {section.source === "cermat" ? (
            <p className="text-body-sm text-fg-secondary">
              Cvičný didaktický trénink (exam-style, ne oficiální zadání):{" "}
              <Link
                href="/app/cermat"
                className="font-semibold text-action underline"
              >
                Otevřít CERMAT ČJL
              </Link>
            </p>
          ) : null}

          {section.emptyCs ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-body-sm text-fg-muted">
              {section.emptyCs}
            </p>
          ) : null}

          {section.requirements.length > 0 ? (
            <ul className="space-y-2">
              {section.requirements.map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    "rounded-xl border px-3 py-3",
                    section.source === "cermat"
                      ? "border-action/30 bg-action/5"
                      : "border-border bg-canvas",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={sourceTone(r.source)}>{r.sourceLabelCs}</Badge>
                    <Badge tone="neutral">{r.categoryLabelCs}</Badge>
                    <p className="font-semibold text-fg">{r.titleCs}</p>
                  </div>
                  <p className="mt-1 text-body-sm text-fg-secondary">
                    {r.detailCs}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          {section.documents.length > 0 ? (
            <ul className="space-y-2">
              {section.documents.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-subtle/40 px-3 py-2"
                >
                  <div>
                    <p className="text-body-sm font-medium text-fg">
                      {d.title}
                    </p>
                    <p className="text-caption text-fg-muted">
                      {schoolExamDocKindLabelsCs[d.kind]} · {d.originalFilename}{" "}
                      · zdroj {d.sourceLabelCs}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => removeDoc(d.id)}
                    className="text-caption font-semibold text-danger hover:underline"
                  >
                    Smazat
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}

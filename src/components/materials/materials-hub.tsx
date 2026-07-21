"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  materialStatusLabelsCs,
  materialsConfig,
  type LearnerMaterialListItem,
  type MaterialStatus,
} from "@/domain/learning/learner-materials";
import {
  deleteMaterialAction,
  renameMaterialAction,
  retryMaterialProcessingAction,
} from "@/server/actions/learner-materials";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type UploadRow = {
  localId: string;
  name: string;
  progress: number;
  phase: "uploading" | "processing" | "done" | "error";
  error?: string;
};

function statusTone(status: MaterialStatus): BadgeTone {
  switch (status) {
    case "ready":
      return "success";
    case "processing":
    case "uploading":
      return "info";
    case "needs_attention":
      return "warning";
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadWithProgress(
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ ok: true; material: LearnerMaterialListItem } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file);

    xhr.open("POST", "/api/materials/upload");
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const pct = Math.max(0, Math.min(99, Math.round((event.loaded / event.total) * 100)));
      onProgress(pct);
    };

    xhr.onload = () => {
      onProgress(100);
      const raw = xhr.response as
        | { ok?: boolean; material?: LearnerMaterialListItem; error?: string }
        | null;
      if (xhr.status >= 200 && xhr.status < 300 && raw?.ok && raw.material) {
        resolve({ ok: true, material: raw.material });
        return;
      }
      resolve({
        ok: false,
        error:
          raw?.error ||
          (xhr.status === 401
            ? "Nejdřív se přihlas."
            : "Nahrání se nepovedlo."),
      });
    };

    xhr.onerror = () => {
      resolve({ ok: false, error: "Síťová chyba při nahrávání." });
    };

    xhr.send(body);
  });
}

export function MaterialsHub({
  initialMaterials,
}: {
  initialMaterials: LearnerMaterialListItem[];
  learnerId: string;
}) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upsertMaterial = useCallback((item: LearnerMaterialListItem) => {
    setMaterials((prev) => {
      const without = prev.filter((m) => m.id !== item.id);
      return [item, ...without];
    });
  }, []);

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setError(null);
      const files = Array.from(fileList).slice(0, materialsConfig.maxFilesPerBatch);
      if (files.length === 0) return;

      for (const file of files) {
        const localId = `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`;
        setUploads((prev) => [
          {
            localId,
            name: file.name,
            progress: 0,
            phase: "uploading",
          },
          ...prev,
        ]);

        const result = await uploadWithProgress(file, (pct) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.localId === localId
                ? {
                    ...u,
                    progress: pct,
                    phase: pct >= 100 ? "processing" : "uploading",
                  }
                : u,
            ),
          );
        });

        if (result.ok) {
          upsertMaterial(result.material);
          setUploads((prev) =>
            prev.map((u) =>
              u.localId === localId
                ? { ...u, progress: 100, phase: "done" }
                : u,
            ),
          );
        } else {
          setUploads((prev) =>
            prev.map((u) =>
              u.localId === localId
                ? { ...u, phase: "error", error: result.error }
                : u,
            ),
          );
        }
      }
    },
    [upsertMaterial],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      void processFiles(e.dataTransfer.files);
    }
  }

  function startRename(id: string, current: string) {
    setRenameId(id);
    setRenameValue(current);
    setConfirmDelete(null);
  }

  function submitRename() {
    if (!renameId) return;
    const id = renameId;
    const next = renameValue;
    setRenameId(null);
    startTransition(async () => {
      const res = await renameMaterialAction({ id, title: next });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.material) upsertMaterial(res.material);
    });
  }

  function requestDelete(id: string, title: string) {
    setConfirmDelete({ id, title });
    setRenameId(null);
  }

  function confirmDeleteNow() {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    startTransition(async () => {
      const res = await deleteMaterialAction({ id });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    });
  }

  function onRetry(id: string) {
    startTransition(async () => {
      setError(null);
      const res = await retryMaterialProcessingAction({ id });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.material) upsertMaterial(res.material);
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 overflow-x-clip">
      <div>
        <h1 className="font-display text-display-md text-fg">Moje materiály</h1>
        <p className="mt-2 text-body-md text-fg-secondary">
          Nahraj studijní podklady (PDF, DOCX, TXT). Stav Připraveno uvidíš po
          přečtení textu na serveru.
        </p>
        <p className="mt-1 text-caption text-fg-muted">
          Max {Math.round(materialsConfig.maxFileBytes / (1024 * 1024))} MB · až{" "}
          {materialsConfig.maxFilesPerBatch} najednou
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-soft/30 px-4 py-3 text-body-sm text-fg"
        >
          {error}
        </p>
      ) : null}

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "cursor-pointer touch-manipulation rounded-xl border-2 border-dashed px-4 py-8 text-center transition sm:px-6 sm:py-10",
          dragOver
            ? "border-action bg-action-soft/40"
            : "border-border bg-surface hover:border-action/50 hover:bg-subtle",
        ].join(" ")}
      >
        <p className="text-body-md font-semibold text-fg sm:hidden">
          Vybrat soubor
        </p>
        <p className="hidden text-body-md font-semibold text-fg sm:block">
          Přetáhni soubory sem, nebo klikni pro výběr
        </p>
        <p className="mt-2 text-body-sm text-fg-secondary">
          PDF · DOCX · TXT — až {materialsConfig.maxFilesPerBatch} najednou
        </p>
        <p className="mt-1 text-caption text-fg-muted">
          Obrázky a PPTX připravujeme — zatím ne.
        </p>
        <Button
          type="button"
          className="mt-4 min-h-12 sm:hidden"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Vybrat soubor
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) {
              void processFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>

      {confirmDelete ? (
        <div
          role="dialog"
          aria-label="Potvrdit smazání"
          className="rounded-xl border border-danger/30 bg-danger-soft/20 p-4"
        >
          <p className="text-body-sm text-fg">
            Smazat „{confirmDelete.title}“? Tuto akci nejde vrátit.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="danger"
              className="min-h-11"
              disabled={pending}
              onClick={confirmDeleteNow}
            >
              Smazat
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => setConfirmDelete(null)}
            >
              Zrušit
            </Button>
          </div>
        </div>
      ) : null}

      {uploads.length > 0 ? (
        <section aria-label="Probíhající nahrávání" className="space-y-3">
          <h2 className="text-title-sm font-semibold text-fg">Nahrávání</h2>
          <ul className="space-y-2">
            {uploads.map((u) => (
              <li
                key={u.localId}
                className="rounded-lg border border-border bg-surface px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-body-sm font-medium text-fg">
                    {u.name}
                  </span>
                  <Badge
                    tone={
                      u.phase === "error"
                        ? "danger"
                        : u.phase === "done"
                          ? "success"
                          : "info"
                    }
                  >
                    {u.phase === "uploading"
                      ? `Nahrávám ${u.progress}%`
                      : u.phase === "processing"
                        ? "Zpracovávám…"
                        : u.phase === "done"
                          ? "Hotovo"
                          : "Chyba"}
                  </Badge>
                </div>
                {u.phase === "uploading" || u.phase === "processing" ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
                    <div
                      className="h-full rounded-full bg-action transition-[width] duration-200"
                      style={{
                        width: `${u.phase === "processing" ? 100 : u.progress}%`,
                      }}
                    />
                  </div>
                ) : null}
                {u.error ? (
                  <p className="mt-2 text-caption text-danger">{u.error}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label="Studium z materiálů">
        <Card>
          <CardHeader>
            <CardTitle>Učit se z mých materiálů</CardTitle>
            <CardDescription>
              Otázky a vysvětlení jen z nahraných souborů, s citací a jistotou
              (Ověřeno ze zdroje / Pravděpodobné / Vyžaduje kontrolu).
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/app/materials/study">
              <Button type="button">Spustit studium</Button>
            </Link>
          </div>
        </Card>
      </section>

      <section aria-label="Seznam materiálů" className="space-y-3">
        <h2 className="text-title-sm font-semibold text-fg">
          Tvoje soubory ({materials.length})
        </h2>
        {materials.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Zatím nic nahraného</CardTitle>
              <CardDescription>
                Až nahraješ první materiál, uvidíš tady stav zpracování.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <ul className="space-y-3">
            {materials.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-border bg-surface p-4 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-body-md font-semibold text-fg">
                        {m.title}
                      </h3>
                      <Badge tone={statusTone(m.status)}>
                        {materialStatusLabelsCs[m.status]}
                      </Badge>
                      <Badge tone="neutral">{m.format.toUpperCase()}</Badge>
                    </div>
                    <p className="text-caption text-fg-muted">
                      {m.originalFilename} · {formatBytes(m.byteSize)}
                      {m.status === "ready" && !m.statusMessage
                        ? ` · ${m.topicCount || 0} témat · ${m.knowledgePointCount || m.chunkCount} bodů`
                        : null}
                    </p>
                    {m.statusMessage ? (
                      <p
                        className={
                          m.status === "ready"
                            ? "text-body-sm font-medium text-fg"
                            : "text-body-sm text-fg-secondary"
                        }
                      >
                        {m.statusMessage}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                    {renameId === m.id ? (
                      <div className="flex w-full flex-col gap-2 sm:min-w-[16rem]">
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-base text-fg"
                          aria-label="Nový název"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="min-h-11 flex-1"
                            disabled={pending}
                            onClick={submitRename}
                          >
                            Uložit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="min-h-11"
                            onClick={() => setRenameId(null)}
                          >
                            Zrušit
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {m.status === "ready" && m.knowledgePointCount > 0 ? (
                          <Link
                            href={`/app/materials/${m.id}/study`}
                            className="block w-full sm:w-auto"
                          >
                            <Button type="button" size="sm" className="min-h-11 w-full sm:w-auto">
                              Učit se
                            </Button>
                          </Link>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-11 w-full sm:w-auto"
                          disabled={pending}
                          onClick={() => startRename(m.id, m.title)}
                        >
                          Přejmenovat
                        </Button>
                        {m.status === "failed" || m.status === "needs_attention" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="min-h-11 w-full sm:w-auto"
                            disabled={pending}
                            onClick={() => onRetry(m.id)}
                          >
                            Zkusit znovu
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          className="min-h-11 w-full sm:w-auto"
                          disabled={pending}
                          onClick={() => requestDelete(m.id, m.title)}
                        >
                          Smazat
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

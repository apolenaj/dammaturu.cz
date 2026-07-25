"use client";

import Link from "next/link";
import { useCallback, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  BookOpen,
  FileText,
  FileUp,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { deleteUserStudyMaterialAction } from "@/app/actions/study-materials";
import { GlassCard } from "@/components/dashboard/glass-card";
import {
  buildUserMaterialStoragePath,
  groupMaterialsBySubject,
  isAllowedStudyMaterialFile,
  STUDY_MATERIALS_BUCKET,
  subjectShortLabel,
  titleFromFileName,
  type StudyMaterial,
} from "@/domain/dashboard/study-materials";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

function formatCreatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function MaterialCard({
  material,
  onDelete,
  deleting,
}: {
  material: StudyMaterial;
  onDelete?: (id: string) => void;
  deleting?: boolean;
}) {
  const isUser = material.type === "user";

  return (
    <GlassCard className="flex h-full flex-col bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-indigo-950/20">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/25">
          {isUser ? (
            <FileText className="h-5 w-5" aria-hidden />
          ) : (
            <BookOpen className="h-5 w-5" aria-hidden />
          )}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold tracking-wide text-slate-300">
          {subjectShortLabel(material.subject)}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-semibold leading-snug text-white">
        {material.title}
      </h3>
      <p className="mt-1.5 text-sm text-slate-400">{material.subject}</p>
      {isUser ? (
        <p className="mt-2 text-xs text-slate-500">
          Nahráno {formatCreatedAt(material.created_at)}
        </p>
      ) : (
        <p className="mt-2 text-xs font-medium text-blue-300/80">
          Systémové učivo · dostupné všem
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-5">
        <Link
          href={`/uceni/${material.id}`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.65)] transition hover:brightness-110"
        >
          Začít se učit
        </Link>
        {onDelete ? (
          <button
            type="button"
            disabled={deleting}
            onClick={() => onDelete(material.id)}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] text-sm font-medium text-slate-400 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
            Smazat
          </button>
        ) : null}
      </div>
    </GlassCard>
  );
}

async function uploadStudyMaterialFromBrowser(
  file: File,
): Promise<{ ok: true; material: StudyMaterial } | { ok: false; error: string }> {
  const validation = isAllowedStudyMaterialFile(file);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "Pro nahrání se musíš přihlásit." };
  }

  const title = titleFromFileName(file.name);
  const subject = "Vlastní materiály";
  const filePath = buildUserMaterialStoragePath(user.id, file.name);

  // Přímý upload z prohlížeče → obejde limit Server Actions na Vercelu (~4,5 MB).
  const { error: uploadError } = await supabase.storage
    .from(STUDY_MATERIALS_BUCKET)
    .upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[study_materials] client storage upload failed", uploadError.message);
    return {
      ok: false,
      error:
        "Soubor se nepodařilo nahrát do úložiště. Ověř bucket user_materials a RLS pravidla.",
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("study_materials")
    .insert({
      title,
      subject,
      type: "user",
      file_url: filePath,
      user_id: user.id,
    })
    .select("id, title, subject, type, file_url, user_id, created_at")
    .single();

  if (insertError || !inserted) {
    console.error(
      "[study_materials] client insert failed",
      insertError?.message ?? "no row",
    );
    await supabase.storage.from(STUDY_MATERIALS_BUCKET).remove([filePath]);
    return {
      ok: false,
      error:
        "Soubor se nahrál, ale záznam do databáze se neuložil. Zkus to prosím znovu.",
    };
  }

  if (inserted.type !== "system" && inserted.type !== "user") {
    return { ok: false, error: "Neplatný typ materiálu v databázi." };
  }

  return {
    ok: true,
    material: {
      id: inserted.id,
      title: inserted.title,
      subject: inserted.subject,
      type: inserted.type,
      file_url: inserted.file_url,
      user_id: inserted.user_id,
      created_at: inserted.created_at,
    },
  };
}

function UploadDropzone({
  onUploaded,
}: {
  onUploaded: (material: StudyMaterial) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "uploading"; name: string }
    | { kind: "done"; name: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      setStatus({ kind: "uploading", name: file.name });
      try {
        const result = await uploadStudyMaterialFromBrowser(file);
        if (!result.ok) {
          setStatus({ kind: "error", message: result.error });
          return;
        }
        onUploaded(result.material);
        setStatus({ kind: "done", name: result.material.title });
      } catch (error) {
        console.error("[study_materials] client upload exception", error);
        setStatus({
          kind: "error",
          message: "Nahrání selhalo. Zkontroluj připojení a zkus to znovu.",
        });
      } finally {
        setBusy(false);
      }
    },
    [onUploaded],
  );

  const onFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file || busy) return;
      void upload(file);
    },
    [busy, upload],
  );

  return (
    <GlassCard className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">
            Uč se podle svých materiálů
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Nahraj PDF, DOCX nebo TXT přímo do úložiště (i větší soubory nad
            8&nbsp;MB). Soubor hned připravíme na učení.
          </p>
        </div>
      </div>

      <label
        htmlFor={inputId}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (busy) return;
          onFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition",
          busy && "pointer-events-none opacity-70",
          dragging
            ? "border-blue-400 bg-blue-500/15 shadow-[0_0_40px_-10px_rgba(59,130,246,0.55)]"
            : "border-white/15 bg-white/[0.03] hover:border-blue-400/50 hover:bg-blue-500/10",
        )}
      >
        <span
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_0_28px_-4px_rgba(59,130,246,0.7)]",
            busy && "animate-pulse",
          )}
        >
          {busy ? (
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
          ) : (
            <FileUp className="h-7 w-7" aria-hidden />
          )}
        </span>
        <div>
          <p className="text-lg font-semibold text-white sm:text-xl">
            Nahraj maturitní materiály
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Přetáhni soubor sem, nebo klikni pro výběr (PDF, DOCX, TXT · max. 20 MB)
          </p>
        </div>
        <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-6 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.65)]">
          Vybrat soubor
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {status.kind === "uploading" || busy ? (
        <p className="flex items-center gap-2 text-sm text-blue-300">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Nahrávám {status.kind === "uploading" ? status.name : "soubor"} přímo
          do úložiště…
        </p>
      ) : null}
      {status.kind === "done" ? (
        <p className="text-sm text-emerald-300">
          Hotovo — „{status.name}“ je připravený. Můžeš rovnou začít se učit.
        </p>
      ) : null}
      {status.kind === "error" ? (
        <p className="text-sm text-rose-300">{status.message}</p>
      ) : null}
    </GlassCard>
  );
}

export function MaterialsPageContent({
  initialSystemMaterials,
  initialUserMaterials,
  loadError,
}: {
  initialSystemMaterials: StudyMaterial[];
  initialUserMaterials: StudyMaterial[];
  loadError?: string | null;
}) {
  const [userMaterials, setUserMaterials] = useState(initialUserMaterials);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [, startDeleteTransition] = useTransition();

  const systemGroups = useMemo(
    () => groupMaterialsBySubject(initialSystemMaterials),
    [initialSystemMaterials],
  );

  const onUploaded = useCallback((material: StudyMaterial) => {
    setUserMaterials((prev) => [material, ...prev.filter((m) => m.id !== material.id)]);
  }, []);

  const onDelete = useCallback((id: string) => {
    setDeleteError(null);
    setDeletingId(id);
    startDeleteTransition(async () => {
      const result = await deleteUserStudyMaterialAction(id);
      setDeletingId(null);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      setUserMaterials((prev) => prev.filter((m) => m.id !== id));
    });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Materiály
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
          Naše maturitní učivo pro všechny a tvoje vlastní podklady — u každého
          materiálu můžeš hned začít se učit.
        </p>
      </div>

      {loadError ? (
        <GlassCard className="border-amber-400/20 bg-amber-500/10">
          <p className="text-sm text-amber-100">{loadError}</p>
          <p className="mt-2 text-xs text-amber-200/80">
            Spusť SQL migraci{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">
              supabase/migrations/20260725120000_study_materials.sql
            </code>{" "}
            v Supabase SQL Editoru.
          </p>
        </GlassCard>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="space-y-5" aria-labelledby="nase-ucivo-heading">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-300/90">
              Sekce A
            </p>
            <h2
              id="nase-ucivo-heading"
              className="mt-1 text-xl font-bold text-white sm:text-2xl"
            >
              Naše učivo
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Systémové materiály dostupné všem přihlášeným studentům.
            </p>
          </div>

          {systemGroups.length === 0 ? (
            <GlassCard>
              <p className="text-sm text-slate-400">
                Zatím tu nejsou žádné systémové materiály. Po spuštění seed
                migrace se tu objeví okruhy ČJL, Matematiky a Angličtiny.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-6">
              {systemGroups.map(({ subject, materials }) => (
                <div key={subject} className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <span className="rounded-lg bg-blue-500/15 px-2 py-1 text-xs font-bold text-blue-300">
                      {subjectShortLabel(subject)}
                    </span>
                    {subject}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {materials.map((material) => (
                      <MaterialCard key={material.id} material={material} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-5" aria-labelledby="vlastni-materialy-heading">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/90">
              Sekce B
            </p>
            <h2
              id="vlastni-materialy-heading"
              className="mt-1 text-xl font-bold text-white sm:text-2xl"
            >
              Vlastní materiály
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Nahraj své poznámky a uč se z nich stejně jako z našeho učiva.
            </p>
          </div>

          <UploadDropzone onUploaded={onUploaded} />

          {deleteError ? (
            <p className="text-sm text-rose-300">{deleteError}</p>
          ) : null}

          {userMaterials.length === 0 ? (
            <GlassCard>
              <p className="text-sm text-slate-400">
                Zatím nemáš žádný vlastní materiál. Přetáhni soubor výše a hned
                se z něj můžeš učit.
              </p>
            </GlassCard>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {userMaterials.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  onDelete={onDelete}
                  deleting={deletingId === material.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

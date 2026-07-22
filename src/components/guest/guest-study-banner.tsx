import Link from "next/link";

/** Soft guest notice — never blocks studying. */
export function GuestStudyBanner() {
  return (
    <div className="mb-4 rounded-xl border border-border/70 bg-surface/80 px-3 py-2.5 text-caption text-fg-secondary sm:px-4">
      Učíš se jako host — pokrok zůstává v tomto prohlížeči.{" "}
      <Link
        href="/registrace?next=/app/learn"
        className="font-semibold text-action underline-offset-2 hover:underline"
      >
        Vytvoř účet
      </Link>
      , až budeš chtít stejný pokrok jinde.
    </div>
  );
}

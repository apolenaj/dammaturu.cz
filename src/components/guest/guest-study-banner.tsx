"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { hasMeaningfulStudyLocal } from "@/components/feedback/study-helped-prompt";

/**
 * Soft guest notice — never blocks studying.
 * Hidden until after a meaningful study moment so the first session
 * is not interrupted by registration marketing.
 */
export function GuestStudyBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(hasMeaningfulStudyLocal());
  }, []);

  if (!show) return null;

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

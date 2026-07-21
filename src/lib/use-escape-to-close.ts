"use client";

import { useEffect } from "react";

/** Close dialogs on Escape; restores focus optional via caller. */
export function useEscapeToClose(onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, active]);
}

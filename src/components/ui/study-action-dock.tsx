import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * In-flow study action dock — reachable above the bottom nav,
 * never fixed over answer fields or form controls.
 */
export function StudyActionDock({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "study-action-dock mt-4 border-t border-border pt-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

import {
  studentVisualStateLabelsCs,
  toStudentVisualState,
  type StudentVisualState,
  type TransparentMasteryState,
} from "@/domain/learning/mastery-engine";
import { cn } from "@/lib/cn";

const stateStyles: Record<StudentVisualState, string> = {
  new: "bg-subtle text-fg-secondary ring-border-subtle",
  learning: "bg-action-soft text-action-on-soft ring-action/20",
  needs_review: "bg-warning-soft text-warning-ink ring-warning/25",
  strong: "bg-success-soft text-success-ink ring-success/20",
};

/**
 * Consistent mastery chip — Nové / Učím se / K procvičení / Silné.
 */
export function MasteryStateChip({
  state,
  visualState,
  className,
}: {
  state?: TransparentMasteryState;
  visualState?: StudentVisualState;
  className?: string;
}) {
  const visual =
    visualState ?? (state ? toStudentVisualState(state) : "new");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-caption font-semibold tracking-wide ring-1 ring-inset",
        stateStyles[visual],
        className,
      )}
    >
      {studentVisualStateLabelsCs[visual]}
    </span>
  );
}

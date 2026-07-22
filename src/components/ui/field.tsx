import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type FieldProps = {
  label: string;
  children: (ids: {
    id: string;
    describedBy?: string;
  }) => ReactNode;
  hint?: string;
  error?: string | null;
  className?: string;
  /** Visually hide label (still available to AT). */
  hideLabel?: boolean;
};

/**
 * Accessible form field: visible label, optional hint, error with role=alert.
 */
export function Field({
  label,
  children,
  hint,
  error,
  className,
  hideLabel,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "block text-caption font-medium text-fg-secondary",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </label>
      {children({ id, describedBy })}
      {hint && !error ? (
        <p id={hintId} className="text-caption text-fg-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-caption font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex w-full rounded-md border bg-surface px-3 py-2.5 text-base text-fg shadow-xs",
        "placeholder:text-fg-disabled",
        "transition duration-fast ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-60",
        invalid
          ? "border-danger focus-visible:ring-danger"
          : "border-border hover:border-border-strong",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex min-h-11 w-full rounded-md border bg-surface px-3 text-base text-fg shadow-xs",
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

Input.displayName = "Input";

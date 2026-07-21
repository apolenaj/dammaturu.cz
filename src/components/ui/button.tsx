import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "accent";

export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-action text-fg-on-brand hover:bg-action-hover active:bg-action-pressed shadow-xs",
  secondary:
    "bg-fg text-fg-inverse hover:bg-action-secondary-hover shadow-xs",
  outline:
    "border border-border bg-surface text-fg hover:bg-subtle shadow-xs",
  ghost: "bg-transparent text-fg-secondary hover:bg-subtle hover:text-fg",
  danger:
    "bg-danger text-fg-on-brand hover:brightness-95 shadow-xs",
  accent:
    "bg-accent text-fg-on-accent hover:bg-accent-hover shadow-xs",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 gap-1.5 rounded-md px-3 text-body-sm font-semibold",
  md: "min-h-11 gap-2 rounded-md px-4 text-body-sm font-semibold",
  lg: "min-h-12 gap-2 rounded-lg px-5 text-body-md font-semibold",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth,
      type = "button",
      disabled,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center transition duration-fast ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";

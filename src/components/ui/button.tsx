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
    "bg-action text-fg-on-brand shadow-xs hover:bg-action-hover hover:shadow-sm active:bg-action-pressed",
  secondary:
    "bg-fg text-fg-inverse shadow-xs hover:bg-action-secondary-hover",
  outline:
    "border border-border bg-surface text-fg shadow-xs hover:border-border-strong hover:bg-subtle",
  ghost: "bg-transparent text-fg-secondary hover:bg-subtle hover:text-fg",
  danger: "bg-danger text-fg-on-brand shadow-xs hover:brightness-[0.97]",
  accent:
    "bg-accent text-fg-on-accent shadow-xs hover:bg-accent-hover hover:shadow-sm",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 min-w-10 gap-1.5 rounded-md px-3.5 text-body-sm font-semibold",
  md: "min-h-11 gap-2 rounded-lg px-4.5 text-body-sm font-semibold tracking-wide",
  lg: "min-h-12 gap-2 rounded-lg px-6 text-body-md font-semibold tracking-wide",
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
        "inline-flex items-center justify-center",
        "transition duration-fast ease-out",
        "active:scale-[0.985] motion-reduce:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
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

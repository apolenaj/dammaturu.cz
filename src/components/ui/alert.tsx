import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type AlertTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneStyles: Record<AlertTone, string> = {
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
  info: "border-info/30 bg-info-soft text-info",
  neutral: "border-border bg-subtle text-fg-secondary",
};

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
};

export function Alert({
  tone = "neutral",
  title,
  children,
  className,
  ...props
}: AlertProps) {
  const role = tone === "danger" || tone === "warning" ? "alert" : "status";

  return (
    <div
      role={role}
      className={cn(
        "rounded-lg border px-4 py-3",
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      <p className="text-body-sm font-semibold">{title}</p>
      {children ? (
        <div className="mt-1 text-body-sm opacity-90">{children}</div>
      ) : null}
    </div>
  );
}

/** Convenience wrappers matching product language */
export function SuccessState(props: Omit<AlertProps, "tone">) {
  return <Alert tone="success" {...props} />;
}

export function ErrorState(props: Omit<AlertProps, "tone">) {
  return <Alert tone="danger" {...props} />;
}

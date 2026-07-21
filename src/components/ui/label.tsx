import { forwardRef, type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  requiredMark?: boolean;
};

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, requiredMark, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-body-sm font-medium text-fg", className)}
      {...props}
    >
      {children}
      {requiredMark ? (
        <span className="ml-0.5 text-danger" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  ),
);

Label.displayName = "Label";

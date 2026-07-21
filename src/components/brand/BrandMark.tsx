import Link from "next/link";
import { cn } from "@/lib/cn";

type BrandMarkProps = {
  /** `null` = text only (no link), default `/` */
  href?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function BrandMark({
  href = "/",
  size = "md",
  className,
}: BrandMarkProps) {
  const sizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-display-sm sm:text-display-md",
  };

  const content = (
    <span
      className={cn(
        "font-display font-semibold tracking-tight text-fg",
        sizes[size],
        className,
      )}
    >
      DámMaturu
      <span className="text-action">.cz</span>
    </span>
  );

  if (href === null) {
    return content;
  }

  return (
    <Link
      href={href}
      className="inline-flex rounded-lg transition duration-fast ease-out hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      aria-label="DámMaturu.cz — domů"
    >
      {content}
    </Link>
  );
}

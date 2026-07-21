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
    lg: "text-3xl sm:text-4xl",
  };

  const content = (
    <span
      className={cn(
        "font-display font-semibold tracking-tight text-ink",
        sizes[size],
        className,
      )}
    >
      DámMaturu
      <span className="text-brand">.cz</span>
    </span>
  );

  if (href === null) {
    return content;
  }

  return (
    <Link
      href={href}
      className="inline-flex rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      aria-label="DámMaturu.cz — domů"
    >
      {content}
    </Link>
  );
}

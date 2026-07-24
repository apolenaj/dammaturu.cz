import Link from "next/link";
import { cn } from "@/lib/cn";

export const landingGradient =
  "bg-gradient-to-r from-[#40E0D0] to-[#8A2BE2]";

export const landingGradientText =
  "bg-gradient-to-r from-[#40E0D0] to-[#8A2BE2] bg-clip-text text-transparent";

export function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-md transition duration-300 hover:border-white/20 hover:shadow-[0_0_40px_-12px_rgba(64,224,208,0.35)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GradientButton({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-[0_0_28px_-6px_rgba(64,224,208,0.55)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40E0D0]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070913]",
    landingGradient,
    className,
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

export function OutlineButton({
  href,
  children,
  className,
  size = "md",
  external,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
  external?: boolean;
}) {
  const shellClass = cn(
    "group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#40E0D0] to-[#8A2BE2] p-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40E0D0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070913]",
    className,
  );
  const inner = (
    <span
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#070913] font-semibold text-white transition group-hover:bg-[#0c1220]",
        size === "sm"
          ? "min-h-[38px] px-4 text-xs"
          : "min-h-[42px] px-6 text-sm",
      )}
    >
      {children}
    </span>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={shellClass}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={shellClass}>
      {inner}
    </Link>
  );
}

export function SectionHeading({
  title,
  description,
  id,
}: {
  title: string;
  description?: string;
  id?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2
        id={id}
        className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-base text-gray-400 sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}

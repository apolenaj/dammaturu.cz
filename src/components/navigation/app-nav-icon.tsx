"use client";

import type { ReactNode } from "react";
import type { AppNavIcon } from "@/lib/navigation";
import { cn } from "@/lib/cn";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function AppNavIconGlyph({
  icon,
  className,
}: {
  icon: AppNavIcon;
  className?: string;
}) {
  switch (icon) {
    case "today":
      return (
        <IconFrame className={className}>
          <rect x="4" y="5" width="16" height="15" rx="2" {...stroke} />
          <path d="M8 3v4M16 3v4M4 10h16" {...stroke} />
          <path d="M9 14h2M13 14h2M9 17h6" {...stroke} />
        </IconFrame>
      );
    case "learn":
      return (
        <IconFrame className={className}>
          <path d="M4 19V6.5A1.5 1.5 0 0 1 5.5 5H12v14H5.5A1.5 1.5 0 0 0 4 19Z" {...stroke} />
          <path d="M20 19V6.5A1.5 1.5 0 0 0 18.5 5H12v14h6.5A1.5 1.5 0 0 1 20 19Z" {...stroke} />
        </IconFrame>
      );
    case "materials":
      return (
        <IconFrame className={className}>
          <path d="M7 4h7l5 5v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" {...stroke} />
          <path d="M14 4v5h5M9 13h6M9 17h4" {...stroke} />
        </IconFrame>
      );
    case "tests":
      return (
        <IconFrame className={className}>
          <path d="M9 4h6l1 3H8L9 4Z" {...stroke} />
          <rect x="6" y="7" width="12" height="13" rx="2" {...stroke} />
          <path d="M10 12l1.5 1.5L14.5 10" {...stroke} />
        </IconFrame>
      );
    case "progress":
      return (
        <IconFrame className={className}>
          <path d="M4 18V10M10 18V6M16 18v-8M20 18H3" {...stroke} />
        </IconFrame>
      );
    case "review":
      return (
        <IconFrame className={className}>
          <path d="M4 12a8 8 0 1 0 2.3-5.7" {...stroke} />
          <path d="M4 5v5h5" {...stroke} />
        </IconFrame>
      );
    case "mistakes":
      return (
        <IconFrame className={className}>
          <circle cx="12" cy="12" r="8" {...stroke} />
          <path d="M12 8v5M12 16h.01" {...stroke} />
        </IconFrame>
      );
    case "plan":
      return (
        <IconFrame className={className}>
          <path d="M8 6h12M8 12h12M8 18h8" {...stroke} />
          <path d="M4 6h.01M4 12h.01M4 18h.01" {...stroke} />
        </IconFrame>
      );
    case "simulation":
      return (
        <IconFrame className={className}>
          <circle cx="12" cy="8" r="3" {...stroke} />
          <path d="M6 19c1.5-3 4-4.5 6-4.5S16.5 16 18 19" {...stroke} />
        </IconFrame>
      );
    case "profile":
      return (
        <IconFrame className={className}>
          <circle cx="12" cy="8" r="3.5" {...stroke} />
          <path d="M5 19c1.8-3.2 4.2-4.5 7-4.5s5.2 1.3 7 4.5" {...stroke} />
        </IconFrame>
      );
    default:
      return null;
  }
}

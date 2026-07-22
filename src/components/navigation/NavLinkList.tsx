"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppNavIconGlyph } from "@/components/navigation/app-nav-icon";
import { cn } from "@/lib/cn";
import { isNavActive, type NavItem } from "@/lib/navigation";

type NavLinkListProps = {
  items: NavItem[];
  orientation?: "vertical" | "horizontal";
  variant?: "sidebar" | "top" | "bottom" | "admin";
  onNavigate?: () => void;
  className?: string;
  showShortLabel?: boolean;
};

export function NavLinkList({
  items,
  orientation = "vertical",
  variant = "sidebar",
  onNavigate,
  className,
  showShortLabel = false,
}: NavLinkListProps) {
  const pathname = usePathname();

  if (items.length === 0) return null;

  return (
    <ul
      className={cn(
        orientation === "horizontal"
          ? "flex items-center gap-1"
          : "flex flex-col gap-1",
        variant === "bottom" &&
          "grid w-full gap-0",
        className,
      )}
      style={
        variant === "bottom"
          ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }
          : undefined
      }
      role="list"
    >
      {items.map((item) => {
        const active = isNavActive(pathname, item.href);
        const label = showShortLabel
          ? (item.shortLabel ?? item.label)
          : item.label;

        return (
          <li
            key={item.href}
            className={variant === "bottom" ? "min-w-0" : undefined}
          >
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                variant === "bottom" &&
                  "min-h-12 touch-manipulation flex-col justify-center gap-0.5 px-0.5 py-1.5 text-[11px] font-semibold leading-tight tracking-tight",
                variant === "sidebar" && "min-h-11 gap-2.5 px-3 py-2",
                variant === "top" && "min-h-10 px-3 py-2",
                variant === "admin" && "min-h-11 px-3 py-2",
                active
                  ? "bg-brand-soft text-brand"
                  : "text-ink-muted hover:bg-ink-soft/60 hover:text-ink",
              )}
            >
              {variant === "bottom" ? (
                <>
                  {item.icon ? (
                    <AppNavIconGlyph
                      icon={item.icon}
                      className={cn(
                        "h-[1.35rem] w-[1.35rem]",
                        active ? "text-brand" : "text-ink-muted",
                      )}
                    />
                  ) : (
                    <span
                      className={cn(
                        "h-1 w-1 rounded-full",
                        active ? "bg-brand" : "bg-transparent",
                      )}
                      aria-hidden
                    />
                  )}
                  <span className="truncate">{label}</span>
                </>
              ) : (
                <>
                  {item.icon && variant === "sidebar" ? (
                    <AppNavIconGlyph
                      icon={item.icon}
                      className={cn(
                        "h-4 w-4",
                        active ? "text-brand" : "text-ink-muted",
                      )}
                    />
                  ) : null}
                  <span className="truncate">{label}</span>
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

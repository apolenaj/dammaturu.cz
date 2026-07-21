import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavLinkList } from "@/components/navigation/NavLinkList";
import { appPrimaryNav } from "@/lib/navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/review",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
    onClick,
    "aria-current": ariaCurrent,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    "aria-current"?: "page" | undefined;
    onClick?: () => void;
  }) => (
    <a
      href={href}
      className={className}
      onClick={onClick}
      aria-current={ariaCurrent}
    >
      {children}
    </a>
  ),
}));

describe("NavLinkList active states", () => {
  it("marks the current primary route with aria-current", () => {
    render(
      <NavLinkList items={appPrimaryNav} variant="bottom" showShortLabel />,
    );

    const active = screen.getByRole("link", { name: /Opak/i });
    expect(active).toHaveAttribute("aria-current", "page");

    const inactive = screen.getByRole("link", { name: /^Dnes$/i });
    expect(inactive).not.toHaveAttribute("aria-current");
  });

  it("renders five bottom-nav destinations", () => {
    render(
      <NavLinkList items={appPrimaryNav} variant="bottom" showShortLabel />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeatureState } from "@/components/ui/FeatureState";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("FeatureState accessibility", () => {
  it("exposes a labelled heading and status region", () => {
    render(
      <FeatureState
        title="Opakovat"
        description="Due položky."
        availability="scaffolded"
        nextStep="Scheduler ještě není."
        primaryHref="/app/dashboard"
        primaryLabel="Zpět na Dnes"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Opakovat" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Scheduler/);
    expect(screen.getByText(/Co dál/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zpět na Dnes" })).toHaveAttribute(
      "href",
      "/app/dashboard",
    );
  });
});

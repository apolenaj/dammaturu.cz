import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Score } from "@/components/ui/score";

describe("Button a11y", () => {
  it("is focusable and supports disabled", () => {
    const { rerender } = render(<Button>Uložit</Button>);
    const btn = screen.getByRole("button", { name: "Uložit" });
    expect(btn).not.toBeDisabled();
    expect(btn.className).toMatch(/focus-visible:ring-2/);

    rerender(<Button disabled>Uložit</Button>);
    expect(screen.getByRole("button", { name: "Uložit" })).toBeDisabled();
  });
});

describe("Progress", () => {
  it("exposes progressbar semantics", () => {
    render(<Progress label="Mastery" value={40} max={100} showValue />);
    const bar = screen.getByRole("progressbar", { name: "Mastery" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });
});

describe("Score", () => {
  it("provides an accessible label with percentage", () => {
    render(<Score value={72} label="Připravenost" mastery="stable" />);
    expect(
      screen.getByRole("img", {
        name: /Připravenost: 72 procent.*Silné/i,
      }),
    ).toBeInTheDocument();
  });
});

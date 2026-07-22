import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MasteryStateChip } from "@/components/ui/mastery-state-chip";
import {
  StudyPhaseFrame,
  StudySessionChrome,
} from "@/components/ui/study-phase";
import { TopicCard } from "@/components/ui/topic-card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const axeOpts = { rules: { "color-contrast": { enabled: false } } };

async function expectNoAxeViolations(container: Element) {
  const results = await axe(container, axeOpts);
  const msg = results.violations
    .map((v: { id: string; help: string; nodes: { failureSummary?: string }[] }) =>
      `${v.id}: ${v.help}\n` +
      v.nodes.map((n) => `  - ${n.failureSummary ?? ""}`).join("\n"),
    )
    .join("\n\n");
  expect(results.violations, msg).toEqual([]);
}

describe("accessibility — shared UI (axe)", () => {
  it("Field + Input has no serious violations", async () => {
    const { container } = render(
      <Field label="Odpověď" hint="Piš vlastními slovy." error={null}>
        {({ id, describedBy }) => (
          <Input id={id} aria-describedby={describedBy} />
        )}
      </Field>,
    );
    await expectNoAxeViolations(container);
  });

  it("Field surfaces errors accessibly", async () => {
    const { container, getByRole } = render(
      <Field label="E-mail" error="Zadej platný e-mail.">
        {({ id, describedBy }) => (
          <Input id={id} aria-describedby={describedBy} invalid />
        )}
      </Field>,
    );
    expect(getByRole("alert")).toHaveTextContent(/platný e-mail/i);
    await expectNoAxeViolations(container);
  });

  it("Study session chrome and phases are named", async () => {
    const { container, getByRole } = render(
      <StudySessionChrome title="Literatura" progressLabel="2 / 5">
        <StudyPhaseFrame phase="question">
          <p>Co je motiv?</p>
        </StudyPhaseFrame>
        <StudyPhaseFrame phase="answer">
          <Button type="button">Odeslat</Button>
        </StudyPhaseFrame>
      </StudySessionChrome>,
    );
    expect(getByRole("region", { name: "Literatura" })).toBeInTheDocument();
    expect(getByRole("heading", { name: "Literatura" })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("TopicCard and mastery chip expose readable names", async () => {
    const { container, getByRole, getByText } = render(
      <TopicCard
        title="Romantismus"
        metaCs="3 materiály"
        progressCs="1 / 4"
        visualState="learning"
        ctaLabel="Pokračovat"
        ctaHref="/app/learn"
      />,
    );
    expect(getByText("Učím se")).toBeInTheDocument();
    expect(getByRole("link", { name: "Pokračovat" })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("Alert danger uses alert role", async () => {
    const { container, getByRole } = render(
      <Alert tone="danger" title="Chyba">
        Zkus to znovu.
      </Alert>,
    );
    expect(getByRole("alert")).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("MasteryStateChip text is not color-only", async () => {
    const { getByText } = render(
      <MasteryStateChip visualState="needs_review" />,
    );
    expect(getByText("K procvičení")).toBeInTheDocument();
  });
});

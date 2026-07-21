"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { Alert, ErrorState, SuccessState } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart, Sparkline } from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Score } from "@/components/ui/score";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  CelebrateMoment,
  ProgressSteps,
  StreakPill,
} from "@/components/ui/celebrate";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24 space-y-4 border-b border-border py-10 last:border-0">
      <h2 className="font-display text-title-lg text-fg">{title}</h2>
      {children}
    </section>
  );
}

export function DesignSystemShowcase() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  return (
    <div className="min-h-dvh bg-paper-wash text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <BrandMark href="/" size="sm" />
            <p className="text-caption text-fg-muted">
              Interní design system · jen development
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              Theme: {theme === "light" ? "Light" : "Dark"}
            </Button>
            <Button
              size="sm"
              onClick={() =>
                toast({
                  title: "Uloženo",
                  description: "Toast systém funguje.",
                  tone: "success",
                })
              }
            >
              Spustit toast
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="py-10">
          <p className="text-overline text-action">DESIGN SYSTEM</p>
          <h1 className="mt-2 font-display text-display-lg tracking-tight text-fg text-balance">
            DámMaturu UI
          </h1>
          <p className="mt-3 max-w-2xl text-body-lg text-fg-secondary">
            Calm · confident · motivating · fast. Duolingo-level friendliness,
            Linear-level polish — bez infantilních motivů a AI neonů.
          </p>
        </div>

        <Section title="Typografie">
          <div className="space-y-3">
            <p className="font-display text-display-lg">Display LG — Fraunces</p>
            <p className="font-display text-display-md">Display MD</p>
            <p className="font-display text-title-lg">Title LG</p>
            <p className="font-display text-title-md">Title MD</p>
            <p className="text-title-sm">Title SM — Manrope semibold</p>
            <p className="text-body-lg text-fg-secondary">
              Body LG — dlouhý text pro výklad a feedback.
            </p>
            <p className="text-body-md text-fg-secondary">Body MD — výchozí UI.</p>
            <p className="text-body-sm text-fg-muted">Body SM — pomocný text.</p>
            <p className="text-caption text-fg-muted">Caption / meta</p>
            <p className="text-overline text-fg-muted">Overline</p>
          </div>
        </Section>

        <Section title="Semantic tokens · barvy">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Canvas", "bg-canvas"],
              ["Surface", "bg-surface border border-border"],
              ["Action", "bg-action text-fg-on-brand"],
              ["Accent", "bg-accent text-fg-on-accent"],
              ["Success", "bg-success text-fg-on-brand"],
              ["Warning", "bg-warning text-fg-on-brand"],
              ["Danger", "bg-danger text-fg-on-brand"],
              ["Info", "bg-info text-fg-on-brand"],
            ].map(([label, cls]) => (
              <div
                key={label}
                className={`flex h-20 items-end rounded-lg p-3 text-caption font-semibold ${cls}`}
              >
                {label}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Spacing · radius · shadows">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardTitle>Spacing</CardTitle>
              <CardDescription className="mt-1">
                4px base · 4 / 8 / 12 / 16 / 24 / 32 / 48
              </CardDescription>
              <div className="mt-4 flex items-end gap-2">
                {[4, 8, 12, 16, 24, 32].map((n) => (
                  <div
                    key={n}
                    className="bg-action-soft"
                    style={{ width: n, height: n }}
                    title={`${n}px`}
                  />
                ))}
              </div>
            </Card>
            <Card>
              <CardTitle>Radius</CardTitle>
              <div className="mt-4 flex gap-3">
                <div className="h-12 w-12 rounded-sm border border-border bg-subtle" />
                <div className="h-12 w-12 rounded-md border border-border bg-subtle" />
                <div className="h-12 w-12 rounded-lg border border-border bg-subtle" />
                <div className="h-12 w-12 rounded-xl border border-border bg-subtle" />
              </div>
            </Card>
            <Card className="shadow-lg">
              <CardTitle>Shadows</CardTitle>
              <CardDescription className="mt-1">
                xs → sm → md → lg · jemné elevation
              </CardDescription>
            </Card>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <p className="mt-3 text-body-sm text-fg-muted">
            Tab / focus-visible: ring 2px · offset na surface · min touch 44px
            (md+).
          </p>
        </Section>

        <Section title="Inputs">
          <div className="grid max-w-lg gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ds-email" requiredMark>
                E-mail
              </Label>
              <Input id="ds-email" placeholder="ty@email.cz" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-bad">Neplatné pole</Label>
              <Input id="ds-bad" invalid defaultValue="špatně" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-note">Poznámka</Label>
              <Textarea id="ds-note" placeholder="Krátká odpověď…" />
            </div>
          </div>
        </Section>

        <Section title="Badges · cards">
          <div className="flex flex-wrap gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="brand">Brand</Badge>
            <Badge tone="accent">Accent</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="danger">Danger</Badge>
            <Badge tone="info">Info</Badge>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Default card</CardTitle>
                <CardDescription>
                  Konzistentní radius, border, soft shadow.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button size="sm">Začít</Button>
                <Button size="sm" variant="ghost">
                  Později
                </Button>
              </CardFooter>
            </Card>
            <Card variant="interactive">
              <CardHeader>
                <CardTitle>Interactive</CardTitle>
                <CardDescription>
                  Hover lift — jen kde dává smysl kliknout.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </Section>

        <Section title="Progress · score · celebrate">
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-4">
              <Progress label="Mastery packu" value={62} showValue />
              <Progress label="Due reviews" value={30} tone="accent" showValue />
              <Progress
                label="Mise hotová"
                value={100}
                tone="success"
                showValue
                celebrate
              />
            </div>
            <div className="flex flex-wrap gap-6">
              <Score value={72} mastery="stable" />
              <Score value={41} size="sm" label="Dnes" mastery="fragile" />
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <CelebrateMoment
              title="Dnešní mise hotová"
              description="Klídný celebrate — motivace bez infantilních efektů."
              actionLabel="Pokračovat"
              actionHref="/app/dashboard"
            />
            <div className="flex flex-wrap items-center gap-3">
              <StreakPill days={7} />
              <ProgressSteps
                steps={[
                  { id: "1", label: "Review", done: true },
                  { id: "2", label: "Učit", current: true },
                  { id: "3", label: "Test" },
                ]}
              />
            </div>
          </div>
        </Section>

        <Section title="Charts">
          <Card>
            <CardHeader>
              <CardTitle>Mastery podle témat</CardTitle>
              <CardDescription>Bar chart bez těžké library.</CardDescription>
            </CardHeader>
            <BarChart
              aria-label="Mastery podle témat"
              data={[
                { label: "Realismus", value: 78, tone: "success" },
                { label: "Romantismus", value: 54, tone: "brand" },
                { label: "Kytice", value: 36, tone: "accent" },
                { label: "Homonyma", value: 22, tone: "warning" },
              ]}
            />
            <div className="mt-6">
              <p className="mb-2 text-body-sm font-medium text-fg">
                Trend readiness
              </p>
              <Sparkline
                values={[42, 45, 48, 47, 55, 61, 68, 72]}
                aria-label="Trend připravenosti za 8 dní"
              />
            </div>
          </Card>
        </Section>

        <Section title="Empty · skeleton · feedback">
          <div className="grid gap-4 lg:grid-cols-2">
            <EmptyState
              title="Zatím žádné due položky"
              description="Až scheduler poběží, uvidíš tady dnešní opakování."
              actionLabel="Zpět na Dnes"
              onAction={() => undefined}
            />
            <SkeletonCard />
          </div>
          <div className="mt-4 grid gap-3">
            <SuccessState title="Odpověď uložena">
              Mastery u této jednotky se posunulo na „stabilní“.
            </SuccessState>
            <ErrorState title="Nepodařilo se odeslat">
              Zkus to znovu. Progress se nezměnil.
            </ErrorState>
            <Alert tone="warning" title="Needs review">
              U Stroupežnického je podezřelý letopočet — skryto ze student path.
            </Alert>
            <Alert tone="info" title="Tip">
              Active recall má přednost před pasivním čtením.
            </Alert>
          </div>
          <div className="mt-4 flex gap-3">
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 w-11" rounded="full" />
          </div>
        </Section>

        <Section title="Toast">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                toast({ title: "Info", description: "Neutrální toast.", tone: "info" })
              }
            >
              Info toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  title: "Chyba sítě",
                  description: "Request selhal.",
                  tone: "danger",
                })
              }
            >
              Danger toast
            </Button>
          </div>
        </Section>
      </main>
    </div>
  );
}

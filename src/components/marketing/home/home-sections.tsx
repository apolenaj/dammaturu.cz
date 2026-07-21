import Link from "next/link";
import { Score } from "@/components/ui/score";
import {
  CtaPair,
  SectionHeading,
} from "@/components/marketing/home/section-primitives";
import {
  DashboardPreview,
  LessonPreview,
  MethodsPreview,
  PlanPreview,
  ReviewPreview,
  SimulationPreview,
  WeakspotsPreview,
} from "@/components/marketing/previews/product-previews";

const faqItems = [
  {
    q: "Je DámMaturu chatbot s umělou inteligencí?",
    a: "Ne. Je to systém diagnostiky, plánu, procvičování, testů a opakování. Připravenost měříme z tvých výsledků — ne z dojmu z chatu.",
  },
  {
    q: "Odkud berete učivo?",
    a: "Z ověřených studijních materiálů s provenance. Sporné informace jdou do review a do student path se nedostanou jako hotová fakta.",
  },
  {
    q: "Kolik času denně potřebuju?",
    a: "Typicky 15–30 minut jasné mise. Systém plánuje podle deadline a time budgetu — ne podle nekonečného scrollování.",
  },
  {
    q: "Funguje to i na mobilu?",
    a: "Ano. Appka je mobile-first: dnešní misi spustíš z dolní navigace, bez hledání „co dál“.",
  },
  {
    q: "Kdy uvidím Maturita Score?",
    a: "Po diagnostice a prvních pokusech. Score roste s mastery a evidence — ne s tím, že jsi něco jen přečetl/a.",
  },
  {
    q: "Pro koho je beta teď?",
    a: "Nejdřív ověřujeme kompletní loop na ČJL packu. Architektura je připravená na další předměty a více studentů.",
  },
];

function SectionShell({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 border-t border-border-subtle px-4 py-14 sm:px-6 sm:py-20 ${className}`}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_520px_at_12%_-8%,var(--wash-a),transparent_55%),radial-gradient(700px_420px_at_88%_8%,rgba(18,26,43,0.07),transparent_50%),linear-gradient(180deg,var(--bg-canvas)_0%,var(--bg-canvas-elevated)_100%)]"
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:pt-16">
        <div>
          <p className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl lg:text-[3.25rem]">
            Dám&nbsp;Maturu
            <span className="text-action">.cz</span>
          </p>
          <h1 className="mt-5 max-w-xl font-display text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-fg sm:text-4xl">
            Víš přesně, co se naučit. A víš, kdy jsi připraven.
          </h1>
          <p className="mt-4 max-w-lg text-body-lg text-fg-secondary">
            DámMaturu promění maturitní učivo v konkrétní plán, procvičování,
            testy a opakování podle toho, co skutečně umíš.
          </p>
          <CtaPair className="mt-8" />
          <p className="mt-4 text-caption text-fg-muted">
            Bez chaosu v poznámkách. Bez falešného pocitu, že „to umíš“.
          </p>
        </div>
        <div className="lg:justify-self-end">
          <DashboardPreview className="w-full max-w-md lg:max-w-none" />
        </div>
      </div>
    </section>
  );
}

export function HomeProblem() {
  return (
    <SectionShell id="problem">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <SectionHeading
          eyebrow="Problém"
          title="Před maturitou vládne chaos"
          description="Desítky PDF, zvýrazňovače, náhodné kvízy a pocit, že se učíš — ale nevíš, jestli jsi připravená."
        />
        <ul className="space-y-3">
          {[
            "Nevíš, kde začít ani co je prioritní.",
            "Čteš pasivně a druhý den si nic nevybavíš.",
            "Stejné chyby se vracejí, protože je nikdo neplánuje.",
            "„Asi to umím“ není připravenost k maturitě.",
          ].map((item) => (
            <li
              key={item}
              className="flex gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-body-sm text-fg-secondary shadow-xs"
            >
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-danger"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}

export function HomeDiagnostics() {
  return (
    <SectionShell id="diagnostika" className="bg-surface/40">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            eyebrow="1 · Diagnostika"
            title="Nejdřív zjistíme, co opravdu umíš"
            description="Krátký vstupní check napříč tématy. Výsledek není dojem — je to mapa mezer s váhou k maturitě."
          />
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-md">
          <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
            Ukázka diagnostiky
          </p>
          <div className="mt-4 space-y-3" aria-hidden>
            {[
              { t: "Znaky romantismu", s: "Správně" },
              { t: "Homonyma", s: "Mezera" },
              { t: "Kompozice Máje", s: "Částečně" },
            ].map((row) => (
              <div
                key={row.t}
                className="flex items-center justify-between rounded-lg bg-subtle px-3 py-2.5"
              >
                <span className="text-body-sm text-fg">{row.t}</span>
                <span className="text-caption font-semibold text-fg-muted">
                  {row.s}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

export function HomePlan() {
  return (
    <SectionShell id="plan">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <PlanPreview />
        <SectionHeading
          eyebrow="2 · Osobní plán"
          title="Každý den máš jasnou misi"
          description="Plán skládá overdue opakování, chyby a nové učivo podle deadline. Nemusíš řešit „co teď?“."
        />
      </div>
    </SectionShell>
  );
}

export function HomeMethods() {
  return (
    <SectionShell id="uceni" className="bg-surface/40">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <SectionHeading
          eyebrow="3 · Učení"
          title="Víc metod. Active recall první."
          description="Krátký výklad, kartičky, cloze i odpověď vlastními slovy. Pasivní čtení samo mastery neposune."
        />
        <MethodsPreview />
      </div>
    </SectionShell>
  );
}

export function HomeScore() {
  return (
    <SectionShell id="maturita-score">
      <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:items-center">
        <Score value={74} size="lg" label="Maturita Score" mastery="proficient" />
        <SectionHeading
          eyebrow="4 · Maturita Score"
          title="Vidíš skutečnou připravenost"
          description="Score váží mastery znalostních jednotek — ne počet otevřených stránek. Rostoucí trend, ne falešná jistota."
        />
      </div>
    </SectionShell>
  );
}

export function HomeWeakspots() {
  return (
    <SectionShell id="slaba-mista" className="bg-surface/40">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <SectionHeading
          eyebrow="5 · Slabá místa"
          title="Chyby se nezatloukají. Vracejí se."
          description="Každý fail jde do error loopu. Uvidíš, co drhne, a systém to zařadí dřív než nové téma."
        />
        <WeakspotsPreview />
      </div>
    </SectionShell>
  );
}

export function HomeReview() {
  return (
    <SectionShell id="opakovani">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <ReviewPreview />
        <SectionHeading
          eyebrow="6 · Chytré opakování"
          title="Opakuj ve správný čas"
          description="Spaced repetition plánuje due položky. Nejdřív to, co hrozí zapomenutím — pak nová látka."
        />
      </div>
    </SectionShell>
  );
}

export function HomeSimulation() {
  return (
    <SectionShell id="simulace" className="bg-surface/40">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <SectionHeading
          eyebrow="7 · Simulace"
          title="Trénink jako u maturity"
          description="Simulace spojuje témata pod časem. Výsledek aktualizuje mastery — připravuješ se na výkon, ne na scroll."
        />
        <SimulationPreview />
      </div>
    </SectionShell>
  );
}

export function HomeDashboardShowcase() {
  return (
    <SectionShell id="dashboard">
      <SectionHeading
        eyebrow="Ukázka produktu"
        title="Dashboard, který ti řekne další krok"
        description="Jedna mise. Jedno CTA. Readiness po ruce — bez dashboard chaosu."
      />
      <div className="mt-8 max-w-2xl">
        <DashboardPreview />
      </div>
    </SectionShell>
  );
}

export function HomeLessonShowcase() {
  return (
    <SectionShell id="lekce" className="bg-surface/40">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <SectionHeading
          eyebrow="Ukázka lekce"
          title="Nejdřív vybavení, pak jistota"
          description="Lekce vede od otázky k feedbacku a ke zdroji. Víš, proč je odpověď správně — a odkud to je."
        />
        <LessonPreview />
      </div>
    </SectionShell>
  );
}

export function HomeFaq() {
  return (
    <SectionShell id="faq">
      <SectionHeading
        eyebrow="FAQ"
        title="Časté otázky"
        description="Stručně a narovinu — bez marketingové mlhy."
      />
      <div className="mx-auto mt-8 max-w-3xl divide-y divide-border rounded-xl border border-border bg-surface shadow-sm">
        {faqItems.map((item) => (
          <details key={item.q} className="group px-4 py-1 open:bg-surface-muted/50">
            <summary className="cursor-pointer list-none py-3 text-body-sm font-semibold text-fg outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                {item.q}
                <span
                  className="text-fg-muted transition group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </span>
            </summary>
            <p className="pb-4 text-body-sm text-fg-secondary">{item.a}</p>
          </details>
        ))}
      </div>
    </SectionShell>
  );
}

export function HomeFinalCta() {
  return (
    <SectionShell id="start" className="border-t border-border">
      <div className="rounded-xl bg-fg px-6 py-12 text-fg-inverse sm:px-10 sm:py-14">
        <p className="text-overline text-accent">Další krok</p>
        <h2 className="mt-2 max-w-xl font-display text-title-lg sm:text-[1.875rem]">
          Zjisti, kde jsi — a co se učit dál.
        </h2>
        <p className="mt-3 max-w-xl text-body-lg text-fg-inverse/75">
          Začni diagnostikou. DámMaturu z toho postaví plán, mise a Maturita
          Score.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/onboarding"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-action px-5 text-body-sm font-semibold text-fg-on-brand transition hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-fg"
          >
            Zjistit moji připravenost
          </Link>
          <Link
            href="/jak-to-funguje"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-fg-inverse/25 bg-transparent px-5 text-body-sm font-semibold text-fg-inverse transition hover:bg-fg-inverse/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-fg"
          >
            Jak to funguje
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}

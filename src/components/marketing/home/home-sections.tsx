import Link from "next/link";
import {
  CtaPair,
  SectionHeading,
} from "@/components/marketing/home/section-primitives";
import { InteractiveLearningPreview } from "@/components/marketing/interactive-learning-preview";
import { cn } from "@/lib/cn";

export const homeFaqItems = [
  {
    q: "Je DámMaturu chatbot?",
    a: "Ne. Je to studijní systém: otázky, zpětná vazba ze zdroje, chyby k opakování a pokrok podle výsledků — ne „povídej si s AI místo učení“.",
  },
  {
    q: "Musím se hned registrovat?",
    a: "Ne. Můžeš začít bez účtu během pár sekund. Registrace je volitelná, až budeš chtít pokrok na více zařízeních.",
  },
  {
    q: "Odkud berete otázky?",
    a: "Z ověřených studijních materiálů k češtině a z textů, které nahraješ. U odpovědí uvidíš vysvětlení a odkaz na úryvek — ne vymyšlená fakta mimo zdroj.",
  },
  {
    q: "Jsou otázky CERMAT oficiální?",
    a: "Ne. Cvičné otázky ve stylu didaktického testu jsou jasně označené jako cvičné, ne jako oficiální zadání CERMAT.",
  },
  {
    q: "Kolik to stojí?",
    a: "Teď je beta zdarma. Placené plány zatím neprodáváme — až bude platba opravdu zapnutá, napíšeme to na Ceníku na rovinu.",
  },
  {
    q: "Pro koho je to teď?",
    a: "Pro přípravu z češtiny k maturitě. Další předměty zatím nejsou — neukazujeme je jako dostupné.",
  },
  {
    q: "Funguje to na telefonu?",
    a: "Ano. Hlavní věci (Dnes, Učit se, Materiály, Testy, Pokrok) máš v dolní navigaci.",
  },
];

const czechTopics = [
  { slug: "narodni-obrozeni", title: "Národní obrození" },
  { slug: "romantismus", title: "Romantismus" },
  { slug: "realismus", title: "Realismus" },
  { slug: "maj", title: "Máj" },
  { slug: "babicka", title: "Babička" },
  { slug: "kytice", title: "Kytice" },
  { slug: "pravopis", title: "Pravopis" },
  { slug: "porozumeni-textu", title: "Porozumění textu" },
] as const;

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

/** Hero — brand + promise + CTA + real interactive preview. */
export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-paper-wash opacity-70"
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-14 lg:pt-20">
        <div>
          <p className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl lg:text-display-lg">
            Dám&nbsp;Maturu
            <span className="text-action">.cz</span>
          </p>
          <h1 className="mt-6 max-w-xl font-display text-display-sm font-semibold tracking-tight text-fg text-balance sm:text-display-md">
            Víš, co se naučit. Víš, co už&nbsp;umíš.
          </h1>
          <p className="mt-4 max-w-lg text-body-lg text-fg-secondary">
            Otázka, zpětná vazba ze zdroje, chyby k opakování a jasný pokrok —
            příprava na češtinu k&nbsp;maturitě.
          </p>
          <CtaPair
            className="mt-8"
            primaryLabel="Začít se učit zdarma"
            primaryHref="/app/learn"
            secondaryLabel="Jak to funguje"
            secondaryHref="#jak-to-funguje"
          />
          <p className="mt-3 text-body-sm text-fg-muted">
            Bez registrace. Začni během pár sekund.
          </p>
        </div>
        <div className="lg:justify-self-end lg:w-full lg:max-w-md">
          <InteractiveLearningPreview className="w-full" />
        </div>
      </div>
    </section>
  );
}

export function HomeHowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Odpovíš na otázku",
      body: "Nejdřív vybavení — ne scrollování výpisků.",
    },
    {
      n: "2",
      title: "Dostaneš zpětnou vazbu",
      body: "Správně / ještě ne, vysvětlení a úryvek ze zdroje.",
    },
    {
      n: "3",
      title: "Vrátíš se k chybám",
      body: "To, co nesedělo, jde do opakování — ne do zapomnění.",
    },
    {
      n: "4",
      title: "Vidíš, kde stojíš",
      body: "Nové → Učím se → K procvičení → Silné podle výsledků.",
    },
  ];

  return (
    <SectionShell id="jak-to-funguje">
      <SectionHeading
        align="center"
        eyebrow="Jak to funguje"
        title="Learning loop, ne marketing slide"
        description="Stejný rytmus jako v appce: otázka → odpověď → zpětná vazba → další."
      />
      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <li
            key={s.n}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-action text-body-sm font-bold text-fg-on-brand">
              {s.n}
            </span>
            <h3 className="mt-4 font-display text-title-sm tracking-tight text-fg">
              {s.title}
            </h3>
            <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">
              {s.body}
            </p>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

export function HomeMistakesReview() {
  return (
    <SectionShell id="chyby" className="bg-surface/50">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <SectionHeading
          eyebrow="Chyby a opakování"
          title="Co nesedělo, se vrací"
          description="Po špatné nebo částečné odpovědi si appka pamatuje slabinu. V Moje chyby a v denní misi se k tomu vrátíš — nejednou a hotovo."
        />
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-action">
            Ukázka smyčky
          </p>
          <ol className="mt-4 space-y-3 text-body-sm text-fg-secondary">
            <li>
              <span className="font-semibold text-fg">1.</span> Odpověď mimo —
              uvidíš, co chybělo, a úryvek ze zdroje.
            </li>
            <li>
              <span className="font-semibold text-fg">2.</span> Položka jde do
              Moje chyby / opakování.
            </li>
            <li>
              <span className="font-semibold text-fg">3.</span> Až se vrátíš a
              sedne to, stav se posune směrem k Silné.
            </li>
          </ol>
          <Link
            href="/app/mistakes"
            className="mt-5 inline-flex min-h-11 items-center text-body-sm font-semibold text-action underline-offset-2 hover:underline"
          >
            Otevřít Moje chyby
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}

export function HomeProgressConcept() {
  return (
    <SectionShell id="pokrok">
      <SectionHeading
        align="center"
        eyebrow="Pokrok"
        title="Čtyři stavy. Žádné falešné procento maturity."
        description="Stavy vycházejí z cvičení — neříkají, jestli maturitu dáš. Říkají, co už držíš a co ještě ne."
      />
      <ul className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
        {(
          [
            [
              "Nové",
              "bg-subtle text-fg-secondary ring-border-subtle",
              "Ještě jsi to nezkoušel — první kontakt.",
            ],
            [
              "Učím se",
              "bg-action-soft text-action-on-soft ring-action/20",
              "Učíš se — odpovědi zatím kolísají.",
            ],
            [
              "K procvičení",
              "bg-warning-soft text-warning-ink ring-warning/25",
              "Umíš to křehce — potřebuješ znovu vybavit.",
            ],
            [
              "Silné",
              "bg-success-soft text-success-ink ring-success/20",
              "Sedí to opakovaně — držíš to.",
            ],
          ] as const
        ).map(([label, style, body]) => (
          <li
            key={label}
            className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-4 shadow-xs"
          >
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-caption font-semibold tracking-wide ring-1 ring-inset",
                style,
              )}
            >
              {label}
            </span>
            <p className="text-body-sm text-fg-secondary">{body}</p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function HomeCzechContent() {
  return (
    <SectionShell id="obsah" className="bg-surface/50">
      <SectionHeading
        align="center"
        eyebrow="Čeština k maturitě"
        title="Dostupný obsah — ne „brzy i matematika“"
        description="Veřejné přehledy a cvičení z literatury, směrů a jazyka. Další předměty zatím nejsou."
      />
      <ul className="mx-auto mt-10 grid max-w-4xl gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {czechTopics.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/priprava/${t.slug}`}
              className="flex min-h-12 items-center rounded-xl border border-border bg-surface px-4 text-body-sm font-semibold text-fg shadow-xs transition hover:border-action/40 hover:bg-canvas"
            >
              {t.title}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center">
        <Link
          href="/priprava"
          className="text-body-sm font-semibold text-action underline-offset-2 hover:underline"
        >
          Všechna témata v Přípravě
        </Link>
      </p>
    </SectionShell>
  );
}

/** Honest free beta — no dead pricing ladder. */
export function HomeFreeBeta() {
  return (
    <SectionShell id="beta">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8">
        <SectionHeading
          align="center"
          eyebrow="Teď"
          title="Beta je zdarma"
          description="Placené plány zatím neprodáváme. Učíš se z dostupného obsahu češtiny k maturitě — bez fiktivních cen a bez „čekáme na data“."
        />
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/app/learn"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-action px-6 text-body-sm font-semibold text-fg-on-brand shadow-xs transition hover:bg-action-hover"
          >
            Začít se učit zdarma
          </Link>
          <Link
            href="/cenik"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-canvas px-6 text-body-sm font-semibold text-fg transition hover:bg-subtle"
          >
            Jak to bude s cenou
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}

export function HomeFaq() {
  return (
    <SectionShell id="faq">
      <SectionHeading
        align="center"
        eyebrow="FAQ"
        title="Časté otázky"
        description="Na rovinu — co appka umí a co zatím ne."
      />
      <ul className="mx-auto mt-10 max-w-3xl space-y-3">
        {homeFaqItems.map((item) => (
          <li
            key={item.q}
            className="rounded-xl border border-border bg-surface px-5 py-4 shadow-xs"
          >
            <h3 className="font-display text-title-sm tracking-tight text-fg">
              {item.q}
            </h3>
            <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">
              {item.a}
            </p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function HomeFinalCta() {
  return (
    <section className="border-t border-border-subtle px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-sm sm:px-10 sm:py-14">
        <p className="text-overline text-action">Teď</p>
        <h2 className="mt-3 font-display text-title-lg tracking-tight text-fg text-balance sm:text-display-sm">
          Víš, co se naučit. Víš, co už&nbsp;umíš.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-body-md text-fg-secondary">
          Začni česky studovat hned — bez účtu. Registrace je volitelná, až
          budeš chtít pokrok na více zařízeních.
        </p>
        <CtaPair
          className="mt-8 justify-center"
          primaryHref="/app/learn"
          primaryLabel="Začít se učit zdarma"
          secondaryHref="/priprava"
          secondaryLabel="Prohlédnout témata"
        />
        <p className="mt-3 text-body-sm text-fg-muted">
          Bez registrace. Začni během pár sekund.
        </p>
      </div>
    </section>
  );
}

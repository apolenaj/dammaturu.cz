import Link from "next/link";
import {
  CtaPair,
  SectionHeading,
} from "@/components/marketing/home/section-primitives";
import {
  CermatPreview,
  DashboardPreview,
  JourneyPreview,
  MaterialsTestPreview,
  ReadinessPreview,
  SimulationPreview,
  UploadPreview,
} from "@/components/marketing/previews/product-previews";

export const homeFaqItems = [
  {
    q: "Je DámMaturu chatbot?",
    a: "Ne. Je to studijní systém: nahráváš materiály, dostáváš denní misi, procvičuješ, testuješ se a vidíš pokrok. Ne „povídej si s AI místo učení“.",
  },
  {
    q: "Odkud berete otázky k mým materiálům?",
    a: "Ze textu, který nahraješ. U odpovědí uvidíš vysvětlení a odkaz na úryvek — ne vymyšlená fakta mimo tvůj soubor.",
  },
  {
    q: "Jsou otázky CERMAT oficiální?",
    a: "Ne. CERMAT modul nabízí cvičné otázky ve stylu didaktického testu. Jsou jasně označené jako cvičné, ne jako oficiální zadání.",
  },
  {
    q: "Dá mi appka známku z ústní?",
    a: "Ne. Ústní simulace dává zpětnou vazbu podle kritérií (obsah, struktura, fakta…) — ne oficiální školní známku 1–5.",
  },
  {
    q: "Kolik času denně potřebuju?",
    a: "Nastavíš si rozpočet. Dnešní mise ti řekne konkrétní kroky na ten den — typicky desítky minut, ne nekonečné scrollování.",
  },
  {
    q: "Funguje to na telefonu?",
    a: "Ano. Hlavní věci (Dnes, Učit se, Materiály, Testy, Pokrok) máš v dolní navigaci.",
  },
  {
    q: "Kolik to stojí?",
    a: "FREE je zdarma. SMART od 99 Kč/měsíc (launch) / 149 Kč standardně, AI PRO 249 Kč/měsíc, MATURITA MAX 499 Kč / 90 dní. Detaily na Ceníku. Po vypršení nepřijdeš o nahrané materiály.",
  },
  {
    q: "Pro koho je to teď?",
    a: "Beta je zaměřená na češtinu k maturitě (didaktický test, literatura, ústní). Další předměty přijdou později.",
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

/** Hero — brand + one promise + one support line + CTAs + product visual. */
export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-paper-wash"
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-14 lg:pt-20">
        <div>
          <p className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl lg:text-display-lg">
            Dám&nbsp;Maturu
            <span className="text-action">.cz</span>
          </p>
          <h1 className="mt-6 max-w-xl font-display text-display-sm font-semibold tracking-tight text-fg text-balance sm:text-display-md">
            Nahraj, co se musíš naučit. My tě připravíme až k&nbsp;maturitě.
          </h1>
          <p className="mt-4 max-w-lg text-body-lg text-fg-secondary">
            Z tvých materiálů, denní mise, cvičné testy a ústní nanečisto —
            v jedné appce pro češtinu.
          </p>
          <CtaPair
            className="mt-8"
            primaryLabel="Začít zdarma"
            secondaryLabel="Jak to funguje"
            secondaryHref="#jak-to-funguje"
          />
        </div>
        <div className="lg:justify-self-end lg:w-full lg:max-w-md">
          <DashboardPreview className="w-full" />
        </div>
      </div>
    </section>
  );
}

export function HomeHowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Nahraješ materiály",
      body: "PDF, DOCX nebo text — poznámky, výpisky, co opravdu potřebuješ.",
    },
    {
      n: "2",
      title: "Dostaneš dnešní misi",
      body: "Jedna obrazovka řekne, co dělat teď. Bez hledání „kde začít“.",
    },
    {
      n: "3",
      title: "Procvičíš a ověříš",
      body: "Otázky z tvých textů, cvičný CERMAT a ústní nanečisto.",
    },
    {
      n: "4",
      title: "Vidíš, kde stojíš",
      body: "Pokrok podle výsledků — ne podle dojmu, že „to asi umím“.",
    },
  ];

  return (
    <SectionShell id="jak-to-funguje">
      <SectionHeading
        align="center"
        eyebrow="Jak to funguje"
        title="Čtyři kroky. Žádný chaos."
        description="Jednoduchá cesta od nahrání materiálů až po pocit jistoty před maturitou."
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

export function HomeUploadDemo() {
  return (
    <SectionShell id="nahrani" className="bg-surface/50">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <SectionHeading
          eyebrow="Nahrání"
          title="Nahraj, co se musíš naučit"
          description="Vlastní poznámky a PDF patří do Moje materiály. Školní seznam literatury a kritéria ústní máš odděleně v Profilu maturity."
        />
        <UploadPreview />
      </div>
    </SectionShell>
  );
}

export function HomeTestingDemo() {
  return (
    <SectionShell id="procvicovani">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="order-2 lg:order-1">
          <MaterialsTestPreview />
        </div>
        <div className="order-1 lg:order-2">
          <SectionHeading
            eyebrow="Procvičování"
            title="Otázky z toho, co jsi nahrál"
            description="Odpovíš, hned uvidíš vysvětlení a odkaz na úryvek z tvého souboru. Žádné vágní „AI ti to nějak řekne“."
          />
        </div>
      </div>
    </SectionShell>
  );
}

export function HomeReadiness() {
  return (
    <SectionShell id="pripravenost" className="bg-surface/50">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <SectionHeading
          eyebrow="Připravenost"
          title="Vidíš, kde stojíš — podle výsledků"
          description="Pokrok ukazuje oblasti (didaktický test, ústní, jazyk…) a slabší místa. Není to předpověď, že maturitu dáš — je to mapa toho, co už umíš a co ještě ne."
        />
        <ReadinessPreview />
      </div>
    </SectionShell>
  );
}

export function HomeCermat() {
  return (
    <SectionShell id="cermat">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="order-2 lg:order-1">
          <CermatPreview />
        </div>
        <div className="order-1 lg:order-2">
          <SectionHeading
            eyebrow="CERMAT"
            title="Cvičný didaktický test ČJL"
            description="Pravopis, skladba, porozumění textu a další kategorie. Časovaná simulace nebo klidný trénink. Položky jsou cvičné — vždy jasně označené, ne oficiální CERMAT."
          />
        </div>
      </div>
    </SectionShell>
  );
}

export function HomeOralSimulation() {
  return (
    <SectionShell id="ustni" className="bg-surface/50">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <SectionHeading
          eyebrow="Ústní"
          title="Zkouška nanečisto z tvé knihy"
          description="Losování z tvého seznamu, příprava, odpověď a doplňující otázky. Zpětná vazba podle kritérií — ne falešná školní známka."
        />
        <SimulationPreview />
      </div>
    </SectionShell>
  );
}

export function HomeOwnMaterials() {
  return (
    <SectionShell id="materialy">
      <div className="mx-auto max-w-3xl text-center">
        <SectionHeading
          align="center"
          eyebrow="Tvoje podklady"
          title="Učíš se z toho, co máš ve škole"
          description="Appka nestaví přípravu jen na obecném kurikulu. Tvoje nahrané materiály jdou do studia. Literatura k ústní si spravuješ v Literatuře — včetně karet a procvičování."
        />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {[
            "Moje materiály",
            "Studium z textu",
            "Literatura k ústní",
            "Profil maturity",
          ].map((label) => (
            <span
              key={label}
              className="rounded-full border border-border bg-surface px-4 py-2 text-body-sm font-semibold text-fg shadow-xs"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function HomeSuccessJourney() {
  return (
    <SectionShell id="cesta" className="bg-surface/50">
      <SectionHeading
        align="center"
        eyebrow="Cesta studenta"
        title="Od nahrání k jistotě před termínem"
        description="Každý den jedna mise. Průběžně testy a ústní. Pokrok, který vidíš."
      />
      <div className="mt-10">
        <JourneyPreview />
      </div>
      <p className="mx-auto mt-6 max-w-2xl text-center text-body-sm text-fg-secondary">
        Když zbývá málo času, Zachraň mě sestaví nouzový plán z termínu, hodin a
        složek maturity, které appka opravdu umí.
      </p>
    </SectionShell>
  );
}

export function HomePricingPreview() {
  return (
    <SectionShell id="cenik">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8">
        <SectionHeading
          align="center"
          eyebrow="Cena"
          title="FREE · SMART · AI PRO · MATURITA MAX"
          description="Entitlements jsou v kódu. SMART launch 99 Kč/měsíc (standard 149). AI PRO 249 Kč/měsíc. MATURITA MAX 499 Kč / 90 dní. Po vypršení nepřijdeš o nahrané materiály."
        />
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/registrace"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-action px-6 text-body-sm font-semibold text-fg-on-brand shadow-xs transition hover:bg-action-hover"
          >
            Začít na FREE
          </Link>
          <Link
            href="/cenik"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-canvas px-6 text-body-sm font-semibold text-fg transition hover:bg-subtle"
          >
            Zobrazit ceník
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
      <div className="mx-auto max-w-3xl rounded-2xl bg-fg px-6 py-12 text-center sm:px-10 sm:py-14">
        <p className="text-overline text-accent">Teď</p>
        <h2 className="mt-3 font-display text-title-lg tracking-tight text-fg-inverse text-balance sm:text-display-sm">
          Nahraj materiály. Začni dnešní misí.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-body-md text-fg-inverse/75">
          Registrace → onboarding → Moje materiály. Příprava k maturitě bez
          chaosu v poznámkách.
        </p>
        <CtaPair
          className="mt-8 justify-center"
          primaryHref="/registrace"
          primaryLabel="Začít zdarma"
          secondaryHref="/prihlaseni"
          secondaryLabel="Už mám účet"
        />
      </div>
    </section>
  );
}

export type NavItem = {
  href: string;
  label: string;
  /** Short label for bottom nav */
  shortLabel?: string;
  /** Optional icon key for bottom nav */
  icon?: AppNavIcon;
};

export type AppNavIcon =
  | "today"
  | "learn"
  | "materials"
  | "tests"
  | "progress"
  | "review"
  | "mistakes"
  | "plan"
  | "simulation"
  | "profile";

export type FeatureAvailability =
  | "ready"
  | "scaffolded"
  | "blocked";

export type RouteMeta = {
  href: string;
  title: string;
  description: string;
  availability: FeatureAvailability;
  /** Why blocked / what unlocks it */
  nextStep: string;
};

/** Public marketing + auth routes */
export const publicNav: NavItem[] = [
  { href: "/jak-to-funguje", label: "Jak to funguje" },
  { href: "/priprava", label: "Příprava" },
  { href: "/predmety", label: "Předměty" },
  { href: "/maturitni-priprava", label: "Maturitní příprava" },
  { href: "/cenik", label: "Ceník" },
  { href: "/o-projektu", label: "O projektu" },
];

/**
 * Primary student JTBD — exactly 5 for mobile bottom bar.
 * Dnes → ČJL → Moje materiály → Testy → Pokrok
 */
export const appPrimaryNav: NavItem[] = [
  {
    href: "/app/dashboard",
    label: "Dnes",
    shortLabel: "Dnes",
    icon: "today",
  },
  {
    href: "/app/learn",
    label: "ČJL",
    shortLabel: "ČJL",
    icon: "learn",
  },
  {
    href: "/app/materials",
    label: "Moje materiály",
    shortLabel: "Materiály",
    icon: "materials",
  },
  {
    href: "/app/tests",
    label: "Testy",
    shortLabel: "Testy",
    icon: "tests",
  },
  {
    href: "/app/progress",
    label: "Pokrok",
    shortLabel: "Pokrok",
    icon: "progress",
  },
];

/**
 * Secondary JTBD — “Víc” / sidebar only.
 * Deep tools (CERMAT, literatura, témata, Zachraň mě, profil maturity)
 * live under Učit se / Testy / Plán / Profil — not in chrome.
 */
export const appSecondaryNav: NavItem[] = [
  {
    href: "/app/cermat",
    label: "CERMAT příprava",
    shortLabel: "CERMAT",
    icon: "tests",
  },
  {
    href: "/app/review",
    label: "Opakování",
    shortLabel: "Opak.",
    icon: "review",
  },
  {
    href: "/app/mistakes",
    label: "Moje chyby",
    shortLabel: "Chyby",
    icon: "mistakes",
  },
  {
    href: "/app/plan",
    label: "Plán",
    shortLabel: "Plán",
    icon: "plan",
  },
  {
    href: "/app/simulation",
    label: "Zkouška nanečisto",
    shortLabel: "Zkouška",
    icon: "simulation",
  },
  {
    href: "/app/profile",
    label: "Profil",
    shortLabel: "Profil",
    icon: "profile",
  },
];

export const adminNav: NavItem[] = [
  { href: "/admin/content", label: "Content Studio" },
  { href: "/admin/sources", label: "Zdroje" },
  { href: "/admin/questions", label: "Otázky" },
  { href: "/admin/reviews", label: "Content QA" },
  { href: "/admin/content-trust", label: "Content Trust" },
  { href: "/admin/users", label: "Uživatelé" },
  { href: "/admin/analytics", label: "Analytika" },
];


export const routeCatalog: RouteMeta[] = [
  {
    href: "/",
    title: "DámMaturu.cz",
    description: "Kompletní systém přípravy k maturitě.",
    availability: "ready",
    nextStep: "Veřejná úvodní stránka.",
  },
  {
    href: "/jak-to-funguje",
    title: "Jak to funguje",
    description: "Diagnostika → plán → učení → ověření → připravenost.",
    availability: "ready",
    nextStep: "Marketingový popis learning loopu.",
  },
  {
    href: "/predmety",
    title: "Předměty",
    description: "Přehled předmětových balíčků.",
    availability: "scaffolded",
    nextStep: "Teď je v beta Čeština. Další předměty přidáme později.",
  },
  {
    href: "/maturitni-priprava",
    title: "Maturitní příprava",
    description: "Jak systém připravuje na maturitu.",
    availability: "ready",
    nextStep: "Zjisti, jak tě systém dovede k maturitě.",
  },
  {
    href: "/priprava",
    title: "Příprava k maturitě",
    description:
      "Veřejné přehledy ČJL — didaktický test, jazyk, směry, četba. Bez tenkých AI stránek.",
    availability: "ready",
    nextStep: "Procházej témata a začni denní misi v appce.",
  },
  {
    href: "/cenik",
    title: "Ceník",
    description: "Beta je teď zdarma. Placené plány až po zapnutí plateb.",
    availability: "ready",
    nextStep: "Začni zdarma — cenu uvidíš, až bude platba aktivní.",
  },
  {
    href: "/o-projektu",
    title: "O projektu",
    description: "Proč DámMaturu vzniká.",
    availability: "ready",
    nextStep: "Přečti si, proč DámMaturu vzniká.",
  },
  {
    href: "/prihlaseni",
    title: "Přihlášení",
    description: "Přihlášení e-mailem a heslem.",
    availability: "ready",
    nextStep: "Přihlas se a pokračuj ve studiu.",
  },
  {
    href: "/registrace",
    title: "Registrace",
    description: "Vytvoření účtu (e-mail/heslo) → onboarding.",
    availability: "ready",
    nextStep: "Vytvoř účet a nastav si maturitní profil.",
  },
  {
    href: "/onboarding",
    title: "Onboarding",
    description: "Profil, cíl, předměty, time budget a první study plan.",
    availability: "ready",
    nextStep: "Dokonči profil — pak uvidíš dnešní misi.",
  },
  {
    href: "/app/materials",
    title: "Moje materiály",
    description:
      "Nahrání vlastních PDF/DOCX/TXT, stav zpracování, přejmenování a smazání.",
    availability: "ready",
    nextStep: "Nahraj PDF, DOCX nebo TXT — po zpracování můžeš studovat z vlastních textů.",
  },
  {
    href: "/app/materials/oral",
    title: "Ústní trénink z materiálů",
    description:
      "Otázka nanečisto / téma / slabiny — rubric jen ze zdroje, bez vymyšlených faktů.",
    availability: "ready",
    nextStep: "Vyber materiál a spusť ústní trénink.",
  },
  {
    href: "/app/materials/vysvetli",
    title: "Vysvětli mi to",
    description:
      "Grounded asistent: shrň, porovnej, zkontroluj odpověď — jen z materiálů a katalogu.",
    availability: "ready",
    nextStep: "Zeptej se svých materiálů bez chatbotové paměti.",
  },
  {
    href: "/app/dashboard",
    title: "Dnes",
    description: "Jedna otázka: Co mám dnes udělat? — jedna CTA.",
    availability: "ready",
    nextStep: "Začni dnešní misi.",
  },
  {
    href: "/app/plan",
    title: "Plán",
    description: "Dynamický plán od dnes do maturity — dnes, týden, milníky, rizika.",
    availability: "ready",
    nextStep: "Sleduj plán od dnes do maturity.",
  },
  {
    href: "/app/exam-profile",
    title: "Profil maturity",
    description:
      "CERMAT · škola · moje materiály — oddělené vrstvy maturitních požadavků.",
    availability: "ready",
    nextStep:
      "Nahraj školní seznam, kritéria a ústní strukturu; vybrané knihy jsou tvoje.",
  },
  {
    href: "/app/literature",
    title: "Literatura",
    description:
      "Seznam vybraných knih, karty k ústní, mastery, Vylosuj mi knihu.",
    availability: "ready",
    nextStep: "Doplň seznam knih a procvičuj k ústní.",
  },
  {
    href: "/app/zachran-me",
    title: "Zachraň mě",
    description:
      "Nouzový plánovač: termín × hodiny × složky → MUSÍŠ UMĚT / HIGH IMPACT / session.",
    availability: "ready",
    nextStep: "Nastav termín a hodiny — dostaneš nouzový plán.",
  },
  {
    href: "/app/learn",
    title: "Český jazyk a literatura",
    description:
      "Co teď studovat: materiály ČJL, slabiny a pokrok bez falešných procent.",
    availability: "ready",
    nextStep: "Pokračuj v učení nebo začni doporučeným materiálem.",
  },
  {
    href: "/app/learn/dilo",
    title: "Literární díla",
    description: "Generický rozbor (14 tabů) — Máj, Kytice, Babička.",
    availability: "ready",
    nextStep: "Otevři dílo a projdi rozbor po krocích.",
  },
  {
    href: "/app/learn/kytice",
    title: "Kytice — 13 balad",
    description: "Collection + hry ze SOURCE; story reconstruction vybraných balad.",
    availability: "ready",
    nextStep: "Obsah se připravuje — zkus jinou aktivitu.",
  },
  {
    href: "/app/learn/maj",
    title: "Máj — exam prep",
    description:
      "Story map, postavy, kompozice, tropy, 60s/3min/full oral + chybějící KU.",
    availability: "ready",
    nextStep: "Obsah se připravuje — zkus jinou aktivitu.",
  },
  {
    href: "/app/learn/babicka",
    title: "Babička — experience",
    description:
      "Karty, vztahy, T/F pasti, struktura, realismus×idealizace, oral builder.",
    availability: "ready",
    nextStep: "Obsah se připravuje — zkus jinou aktivitu.",
  },
  {
    href: "/app/topics",
    title: "Témata",
    description: "Curriculum ČJL BETA (moduly A–F).",
    availability: "ready",
    nextStep: "Procházej témata podle modulů.",
  },
  {
    href: "/app/tests",
    title: "Testy",
    description: "Question Engine — 14 typů + vysvětlení.",
    availability: "ready",
    nextStep: "Spusť cvičný test a procvič slabší místa.",
  },
  {
    href: "/app/review",
    title: "Opakování",
    description: "Opakování podle toho, co začínáš zapomínat.",
    availability: "ready",
    nextStep: "Dnes je vhodné zopakovat frontu — nejdřív slabší body.",
  },
  {
    href: "/app/mistakes",
    title: "Moje chyby",
    description: "ErrorMemory — slabiny k opravě, historie zůstává.",
    availability: "ready",
    nextStep: "Procvič moje chyby — jen reálné chyby z testů a studia.",
  },
  {
    href: "/app/progress",
    title: "Pokrok",
    description: "Mastery coverage — ne predikce maturity.",
    availability: "ready",
    nextStep: "Podívej se na pokrytí a jdi na slabiny.",
  },
  {
    href: "/app/progress/experiment",
    title: "N=1 Beta experiment",
    description:
      "Baseline, daily, retention, methods, weekly/final — N=1 validation.",
    availability: "ready",
    nextStep: "Sleduj svůj osobní průběh v beta experimentu.",
  },
  {
    href: "/app/simulation",
    title: "Zkouška nanečisto",
    description:
      "Ústní maturita: kniha / náhodná / slabina / plná — evidence rubrika, text-first.",
    availability: "ready",
    nextStep: "Vyber knihu a spusť ústní nanečisto.",
  },
  {
    href: "/app/cermat",
    title: "CERMAT příprava",
    description:
      "Maturita CERMAT – Český jazyk a literatura: cvičný didaktický test podle katalogu 2025/2026 (oddělené od Moje materiály).",
    availability: "ready",
    nextStep:
      "Spusť CERMAT přípravu — ne oficiální minulá zadání, pokud není uvedeno.",
  },
  {
    href: "/app/profile",
    title: "Profil",
    description: "Účet, deadline, time budget.",
    availability: "ready",
    nextStep: "Uprav deadline, plán a předplatné.",
  },
  {
    href: "/admin/sources",
    title: "Admin · Zdroje",
    description: "Source materials a provenance.",
    availability: "ready",
    nextStep: "Nahraj nebo zkontroluj zdrojové materiály.",
  },
  {
    href: "/admin/questions",
    title: "Admin · Otázky",
    description: "Learning items / otázky.",
    availability: "scaffolded",
    nextStep: "Správa otázek bude dostupná po dokončení modelu.",
  },
  {
    href: "/admin/users",
    title: "Admin · Uživatelé",
    description: "Uživatelé a enrollmenty.",
    availability: "blocked",
    nextStep: "Tato část zatím není dostupná.",
  },
  {
    href: "/admin/reviews",
    title: "Admin · Content QA",
    description: "SOURCE → NORMALIZED → FINAL + REASON.",
    availability: "ready",
    nextStep: "Zkontroluj označené položky před publikací.",
  },
  {
    href: "/admin/content-trust",
    title: "Admin · Content Trust",
    description:
      "Trust pipeline DRAFT→VERIFIED, detektory, report kvality — autoritativní feedback jen VERIFIED.",
    availability: "ready",
    nextStep: "Projdi prioritní frontu a ověř zdroje.",
  },
  {
    href: "/admin/content",
    title: "Admin · Content Studio",
    description:
      "Typed CRUD subjects→exercises, provenance, preview, bulk, versions — no raw JSON.",
    availability: "ready",
    nextStep: "Uprav obsah ve studiu a ověř preview.",
  },
  {
    href: "/admin/analytics",
    title: "Admin · Analytika",
    description:
      "Learning analytics + beta PO — retention, mastery, question quality, export.",
    availability: "ready",
    nextStep: "Sleduj funnel a learning outcomes bez obsahu studentů.",
  },
];

export function getRouteMeta(href: string): RouteMeta | undefined {
  return routeCatalog.find((r) => r.href === href);
}

/** Only ready destinations — never show empty/scaffolded/blocked in chrome. */
export function filterReadyNav(items: NavItem[]): NavItem[] {
  return items.filter((item) => {
    const meta = getRouteMeta(item.href);
    return meta?.availability === "ready";
  });
}

export function getVisiblePrimaryNav(): NavItem[] {
  return filterReadyNav(appPrimaryNav);
}

export function getVisibleSecondaryNav(): NavItem[] {
  return filterReadyNav(appSecondaryNav);
}

export function getVisibleAdminNav(): NavItem[] {
  return filterReadyNav(adminNav);
}

/** Active if exact match, or nested path under href (except bare `/`). */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

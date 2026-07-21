export type NavItem = {
  href: string;
  label: string;
  /** Short label for bottom nav */
  shortLabel?: string;
};

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
  { href: "/predmety", label: "Předměty" },
  { href: "/maturitni-priprava", label: "Maturitní příprava" },
  { href: "/cenik", label: "Ceník" },
  { href: "/o-projektu", label: "O projektu" },
];

/** Primary student navigation — max 5 for mobile bottom bar */
export const appPrimaryNav: NavItem[] = [
  { href: "/app/dashboard", label: "Dnes", shortLabel: "Dnes" },
  { href: "/app/learn", label: "Učit se", shortLabel: "Učit" },
  { href: "/app/review", label: "Opakovat", shortLabel: "Opak." },
  { href: "/app/tests", label: "Testy", shortLabel: "Testy" },
  { href: "/app/progress", label: "Pokrok", shortLabel: "Pokrok" },
];

/** Secondary — sidebar / more menu, not in bottom bar */
export const appSecondaryNav: NavItem[] = [
  { href: "/app/plan", label: "Plán" },
  { href: "/app/zachran-me", label: "Zachraň mě" },
  { href: "/app/topics", label: "Témata" },
  { href: "/app/mistakes", label: "Moje chyby" },
  { href: "/app/simulation", label: "Simulace" },
  { href: "/app/profile", label: "Profil" },
];

export const adminNav: NavItem[] = [
  { href: "/admin/content", label: "Content Studio" },
  { href: "/admin/sources", label: "Zdroje" },
  { href: "/admin/questions", label: "Otázky" },
  { href: "/admin/reviews", label: "Content QA" },
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
    nextStep: "Beta startuje s ČJL. Další předměty až po ověřeném pack modelu.",
  },
  {
    href: "/maturitni-priprava",
    title: "Maturitní příprava",
    description: "Jak systém připravuje na maturitu.",
    availability: "ready",
    nextStep: "Produktový popis promise.",
  },
  {
    href: "/cenik",
    title: "Ceník",
    description: "Ceny a plány.",
    availability: "scaffolded",
    nextStep: "Billing ještě není zapojený. Beta je řízená pozvánkou.",
  },
  {
    href: "/o-projektu",
    title: "O projektu",
    description: "Proč DámMaturu vzniká.",
    availability: "ready",
    nextStep: "Veřejný kontext projektu.",
  },
  {
    href: "/prihlaseni",
    title: "Přihlášení",
    description: "Soft resume session cookie (bez e-mail Auth).",
    availability: "ready",
    nextStep: "Cookie session resume; plný Auth (Supabase) později.",
  },
  {
    href: "/registrace",
    title: "Registrace",
    description: "Přesměrování na onboarding.",
    availability: "ready",
    nextStep: "Auth přijde později; teď onboarding vytvoří persistentní profil.",
  },
  {
    href: "/onboarding",
    title: "Onboarding",
    description: "Profil, cíl, předměty, time budget a první study plan.",
    availability: "ready",
    nextStep: "Hotovo — persistentní learner store + study plan.",
  },
  {
    href: "/app/dashboard",
    title: "Dnes",
    description: "Jeden plán, jedna CTA — student nerozhoduje.",
    availability: "ready",
    nextStep: "DNEŠNÍ PLÁN → ZAČÍT DNEŠNÍ MISI.",
  },
  {
    href: "/app/plan",
    title: "Plán",
    description: "Beta learning path z kurikula + deadline tempo.",
    availability: "ready",
    nextStep: "Path se generuje z cjl-beta; pořadí podle diagnostiky.",
  },
  {
    href: "/app/zachran-me",
    title: "Zachraň mě",
    description: "Priority Plan při málo času — must-today triáž, ne cram.",
    availability: "ready",
    nextStep: "exam × weakness × forgetting × prereq → bucketed plan.",
  },
  {
    href: "/app/learn",
    title: "Učit se",
    description: "Kdo jsem?, mapa, recall, timeline, Story…",
    availability: "ready",
    nextStep: "Kdo jsem? + Question Engine + flashcards + literární díla.",
  },
  {
    href: "/app/learn/dilo",
    title: "Literární díla",
    description: "Generický rozbor (14 tabů) — Máj, Kytice, Babička.",
    availability: "ready",
    nextStep: "Schema literary-work → /app/learn/dilo/[slug].",
  },
  {
    href: "/app/learn/kytice",
    title: "Kytice — 13 balad",
    description: "Collection + hry ze SOURCE; story reconstruction vybraných balad.",
    availability: "ready",
    nextStep: "npm run seed:kytice",
  },
  {
    href: "/app/learn/maj",
    title: "Máj — exam prep",
    description:
      "Story map, postavy, kompozice, tropy, 60s/3min/full oral + chybějící KU.",
    availability: "ready",
    nextStep: "npm run seed:maj",
  },
  {
    href: "/app/learn/babicka",
    title: "Babička — experience",
    description:
      "Karty, vztahy, T/F pasti, struktura, realismus×idealizace, oral builder.",
    availability: "ready",
    nextStep: "npm run seed:babicka",
  },
  {
    href: "/app/topics",
    title: "Témata",
    description: "Curriculum ČJL BETA (moduly A–F).",
    availability: "ready",
    nextStep: "Čte curriculum store; KU napojení po Content QA.",
  },
  {
    href: "/app/tests",
    title: "Testy",
    description: "Question Engine — 14 typů + vysvětlení.",
    availability: "ready",
    nextStep: "Spusť /app/tests/otazky/cjl-otazky",
  },
  {
    href: "/app/review",
    title: "Opakovat",
    description: "Flashcard engine — SM-2 schedule.",
    availability: "ready",
    nextStep: "Spusť session: due + nové karty, self-grade, summary.",
  },
  {
    href: "/app/mistakes",
    title: "Moje chyby",
    description: "ErrorMemory — slabiny k opravě, historie zůstává.",
    availability: "ready",
    nextStep: "Procvičit moje chyby · again z mixed review se ukládá.",
  },
  {
    href: "/app/progress",
    title: "Připravenost",
    description: "Mastery coverage — ne predikce maturity.",
    availability: "ready",
    nextStep: "Celková % · oblasti · slabiny → cílená session.",
  },
  {
    href: "/app/progress/experiment",
    title: "N=1 Beta experiment",
    description:
      "Baseline, daily, retention, methods, weekly/final — N=1 validation.",
    availability: "ready",
    nextStep: "docs/BETA_EXPERIMENT.md — ne statistická generalizace.",
  },
  {
    href: "/app/simulation",
    title: "Zkouška nanečisto",
    description:
      "Příprava → odpověď → doplňující otázky → rubrika (ne školní známka).",
    availability: "ready",
    nextStep: "npm run seed:mock-exam",
  },
  {
    href: "/app/profile",
    title: "Profil",
    description: "Účet, deadline, time budget.",
    availability: "ready",
    nextStep: "Profil z onboardingu; auth účet přijde později.",
  },
  {
    href: "/admin/sources",
    title: "Admin · Zdroje",
    description: "Source materials a provenance.",
    availability: "ready",
    nextStep: "DOCX ingestion pipeline — spouštění importu a audit log.",
  },
  {
    href: "/admin/questions",
    title: "Admin · Otázky",
    description: "Learning items / otázky.",
    availability: "scaffolded",
    nextStep: "Po modelu LearningItem.",
  },
  {
    href: "/admin/users",
    title: "Admin · Uživatelé",
    description: "Uživatelé a enrollmenty.",
    availability: "blocked",
    nextStep: "Vyžaduje auth a admin roli.",
  },
  {
    href: "/admin/reviews",
    title: "Admin · Content QA",
    description: "SOURCE → NORMALIZED → FINAL + REASON.",
    availability: "ready",
    nextStep: "Odborná kontrola flagged položek; publish jen po verify/correct.",
  },
  {
    href: "/admin/content",
    title: "Admin · Content Studio",
    description:
      "Typed CRUD subjects→exercises, provenance, preview, bulk, versions — no raw JSON.",
    availability: "ready",
    nextStep: "Form editors + student lesson preview + bulk status.",
  },
  {
    href: "/admin/analytics",
    title: "Admin · Analytika",
    description:
      "Learning analytics + beta PO — retention, mastery, question quality, export.",
    availability: "ready",
    nextStep: "Seed: npm run seed:learning-analytics",
  },
];

export function getRouteMeta(href: string): RouteMeta | undefined {
  return routeCatalog.find((r) => r.href === href);
}

/** Active if exact match, or nested path under href (except bare `/`). */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

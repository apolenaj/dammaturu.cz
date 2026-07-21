import { z } from "zod";

export const schoolTypes = [
  "gymnazium",
  "ss_odborna",
  "ss_prakticka",
  "jine",
] as const;

export const subjects = [
  "cjl",
  "mat",
  "aj",
  "dejepis",
  "zaklady_spolecenskych_ved",
  "jiny",
] as const;

export const preferredStudyTimes = [
  "morning",
  "afternoon",
  "evening",
  "flexible",
] as const;

export const studyModes = ["standard", "intensive"] as const;

export const schoolTypeLabels: Record<(typeof schoolTypes)[number], string> = {
  gymnazium: "Gymnázium",
  ss_odborna: "SŠ odborná",
  ss_prakticka: "SŠ praktická / učiliště",
  jine: "Jiný typ školy",
};

export const subjectLabels: Record<(typeof subjects)[number], string> = {
  cjl: "Český jazyk a literatura",
  mat: "Matematika",
  aj: "Anglický jazyk",
  dejepis: "Dějepis",
  zaklady_spolecenskych_ved: "ZSV",
  jiny: "Jiný předmět",
};

export const preferredStudyTimeLabels: Record<
  (typeof preferredStudyTimes)[number],
  string
> = {
  morning: "Ráno",
  afternoon: "Odpoledne",
  evening: "Večer",
  flexible: "Jak to vyjde",
};

export const studyModeLabels: Record<(typeof studyModes)[number], string> = {
  standard: "Standardní",
  intensive: "Intenzivní",
};

export const readinessFeelingLabels: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Zatím skoro nic",
  2: "Spíš slabě",
  3: "Tak napůl",
  4: "Docela dobře",
  5: "Cítím se připravená/ý",
};

/** Beta milestone — quick-select for testerka */
export const BETA_TARGET_DATE = "2026-08-31";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Zadej datum ve formátu RRRR-MM-DD")
  .refine((value) => {
    const d = new Date(`${value}T12:00:00`);
    return !Number.isNaN(d.getTime());
  }, "Neplatné datum");

export const onboardingFieldsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Jméno musí mít alespoň 2 znaky")
    .max(60, "Jméno je příliš dlouhé"),
  targetDate: isoDate.refine((value) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${value}T12:00:00`);
    return target >= today;
  }, "Cílové datum nesmí být v minulosti"),
  schoolType: z.enum(schoolTypes, { message: "Vyber typ školy" }),
  subjects: z
    .array(z.enum(subjects))
    .min(1, "Vyber alespoň jeden předmět")
    .max(6, "Vyber maximálně 6 předmětů"),
  readinessFeeling: z.coerce
    .number({ message: "Vyber pocit připravenosti" })
    .int()
    .min(1, "Vyber pocit připravenosti")
    .max(5, "Vyber pocit připravenosti")
    .transform((n) => n as 1 | 2 | 3 | 4 | 5),
  dailyMinutes: z.coerce
    .number({ message: "Zadej počet minut" })
    .int("Zadej celé minuty")
    .min(10, "Minimum je 10 minut denně")
    .max(240, "Maximum je 240 minut denně"),
  preferredStudyTime: z.enum(preferredStudyTimes, {
    message: "Vyber preferovaný čas",
  }),
  studyMode: z.enum(studyModes, { message: "Vyber režim studia" }),
  wantsDiagnostic: z.boolean(),
});

export const onboardingInputSchema = onboardingFieldsSchema.superRefine(
  (data, ctx) => {
    if (data.studyMode === "intensive" && data.dailyMinutes < 25) {
      ctx.addIssue({
        code: "custom",
        path: ["dailyMinutes"],
        message: "Intenzivní režim potřebuje alespoň 25 minut denně",
      });
    }
  },
);

export type OnboardingInput = z.infer<typeof onboardingInputSchema>;

export const stepSchemas = {
  name: onboardingFieldsSchema.pick({ displayName: true }),
  date: onboardingFieldsSchema.pick({ targetDate: true }),
  schoolSubjects: onboardingFieldsSchema.pick({
    schoolType: true,
    subjects: true,
  }),
  readiness: onboardingFieldsSchema.pick({ readinessFeeling: true }),
  time: onboardingFieldsSchema.pick({
    dailyMinutes: true,
    preferredStudyTime: true,
  }),
  mode: onboardingFieldsSchema.pick({
    studyMode: true,
    wantsDiagnostic: true,
  }),
} as const;

export type OnboardingStepId = keyof typeof stepSchemas;

export const ONBOARDING_STEPS: {
  id: OnboardingStepId;
  title: string;
  description: string;
}[] = [
  {
    id: "name",
    title: "Jak ti máme říkat?",
    description: "Křestní jméno nebo přezdívka — uvidíš ji v appce.",
  },
  {
    id: "date",
    title: "Kdy chceš být připravená/ý?",
    description: "Datum maturity nebo tvůj cíl. Pro betu můžeš zvolit 31. srpna.",
  },
  {
    id: "schoolSubjects",
    title: "Škola a předměty",
    description: "Vyber typ školy a předměty, na které se připravuješ.",
  },
  {
    id: "readiness",
    title: "Jak se teď cítíš?",
    description: "Upřímný odhad — pomůže nastavit tempo. Není to Maturita Score.",
  },
  {
    id: "time",
    title: "Kolik času denně?",
    description: "Reálný time budget a kdy se ti nejlíp učí.",
  },
  {
    id: "mode",
    title: "Jaký režim?",
    description: "Standardní, nebo intenzivní sprint k deadline.",
  },
];

import {
  preferredStudyTimeLabels,
  subjectLabels,
  studyModeLabels,
} from "@/domain/onboarding/schema";
import type { OnboardingInput } from "@/domain/onboarding/schema";

export type StudyPlanMission = {
  title: string;
  estimatedMinutes: number;
  rationale: string;
  kind: "diagnostic" | "learn" | "review";
};

export type StudyPlanWeek = {
  weekOffset: number;
  label: string;
  focus: string;
  minutesPerDay: number;
};

export type StudyPlan = {
  generatedAt: string;
  targetDate: string;
  daysRemaining: number;
  dailyMinutes: number;
  mode: OnboardingInput["studyMode"];
  subjects: OnboardingInput["subjects"];
  subjectLabels: string[];
  weeklyFocus: StudyPlanWeek[];
  firstMission: StudyPlanMission;
  notes: string[];
};

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function buildStudyPlan(
  input: OnboardingInput,
  now = new Date(),
): StudyPlan {
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const target = new Date(`${input.targetDate}T12:00:00`);
  const daysRemaining = daysBetween(today, target);

  const intensityFactor = input.studyMode === "intensive" ? 1.25 : 1;
  const feelingFactor =
    input.readinessFeeling <= 2 ? 1.15 : input.readinessFeeling >= 4 ? 0.9 : 1;
  const plannedMinutes = Math.round(
    input.dailyMinutes * intensityFactor * feelingFactor,
  );

  const primary = input.subjects[0] ?? "cjl";
  const primaryLabel = subjectLabels[primary];

  const weeklyFocus: StudyPlanWeek[] = [
    {
      weekOffset: 0,
      label: "Týden 1",
      focus: input.wantsDiagnostic
        ? `Diagnostika · ${primaryLabel}`
        : `Základy · ${primaryLabel}`,
      minutesPerDay: plannedMinutes,
    },
    {
      weekOffset: 1,
      label: "Týden 2",
      focus: `Mezery + active recall · ${primaryLabel}`,
      minutesPerDay: plannedMinutes,
    },
    {
      weekOffset: 2,
      label: "Týden 3+",
      focus:
        daysRemaining < 21
          ? "Intenzivní review a simulace"
          : "Rozšiřování témat + spaced repetition",
      minutesPerDay: plannedMinutes,
    },
  ];

  const firstMission: StudyPlanMission = input.wantsDiagnostic
    ? {
        title: "Vstupní diagnostika",
        estimatedMinutes: Math.min(25, Math.max(15, plannedMinutes)),
        rationale:
          "Nejdřív zjistíme mezery — pak plán nebude tipování, ale data.",
        kind: "diagnostic",
      }
    : {
        title: `První mise · ${primaryLabel}`,
        estimatedMinutes: Math.min(plannedMinutes, 30),
        rationale: `Režim ${studyModeLabels[input.studyMode].toLowerCase()}, ${input.dailyMinutes} min/den do ${input.targetDate}.`,
        kind: "learn",
      };

  const notes: string[] = [
    `Preferovaný čas: ${preferredStudyTimeLabels[input.preferredStudyTime]}`,
    `Do cíle zbývá ${daysRemaining} dní`,
  ];

  if (daysRemaining > 0 && plannedMinutes * daysRemaining < 400) {
    notes.push(
      "Za současného budgetu bude potřeba držet tempo každý den — nebo navýšit minuty.",
    );
  }

  if (input.studyMode === "intensive") {
    notes.push("Intenzivní režim: priorita overdue a chyby před novým učivem.");
  }

  return {
    generatedAt: now.toISOString(),
    targetDate: input.targetDate,
    daysRemaining,
    dailyMinutes: plannedMinutes,
    mode: input.studyMode,
    subjects: input.subjects,
    subjectLabels: input.subjects.map((s) => subjectLabels[s]),
    weeklyFocus,
    firstMission,
    notes,
  };
}

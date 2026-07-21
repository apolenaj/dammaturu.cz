import { subjectLabels, type OnboardingInput } from "@/domain/onboarding/schema";
import {
  addDaysToDateKey,
  buildDeadlinePlan,
  isAvailableStudyDay,
  plannerPhaseShortCs,
  resolveAvailableDaysPerWeek,
  toPlannerDateKey,
  type DeadlinePlan,
  type PlannerPhase,
} from "@/domain/learning/deadline-planner";

/**
 * Dynamic study plan (D-041) — from today to the student's real exam date.
 * Recalculates from live signals; prioritizes realistic completion over fake perfection.
 */

export type WeakAreaSignal = {
  labelCs: string;
  pct: number;
  href: string;
};

export type DynamicStudyPlanSignals = {
  targetDate: string;
  subjects: OnboardingInput["subjects"];
  studyMode: OnboardingInput["studyMode"];
  dailyMinutes: number;
  availableDaysPerWeek?: number;
  readinessPct: number | null;
  readinessFeeling: OnboardingInput["readinessFeeling"];
  weekDeltaPct: number | null;
  materialsReadyCount: number;
  materialsPendingCount: number;
  materialsKnowledgePoints: number;
  weakAreas: WeakAreaSignal[];
  dueReviews: number;
  contentUnits: number;
  missedDays: number;
  /** Previous target date if known (exam date change). */
  previousTargetDate?: string | null;
  /** Recent material ready within last day. */
  materialsRecentlyReady?: boolean;
};

export type PlanTodayItem = {
  labelCs: string;
  href: string;
  minutes: number;
};

export type PlanTodayView = {
  phase: PlannerPhase;
  phaseLabelCs: string;
  minutes: number;
  noteCs: string;
  items: PlanTodayItem[];
  ctaHref: string;
  ctaLabelCs: string;
};

export type PlanWeekDay = {
  dateKey: string;
  labelCs: string;
  weekdayCs: string;
  isToday: boolean;
  isAvailable: boolean;
  minutes: number;
  focusCs: string;
  phase: PlannerPhase | null;
};

export type PlanMilestone = {
  id: string;
  titleCs: string;
  dateKey: string;
  status: "done" | "current" | "upcoming";
  detailCs: string;
};

export type PlanRiskArea = {
  id: string;
  severity: "high" | "medium" | "low";
  titleCs: string;
  detailCs: string;
  href?: string;
};

export type DynamicStudyPlan = {
  philosophyCs: string;
  targetDate: string;
  targetDateCs: string;
  daysRemaining: number;
  daysRemainingCs: string;
  subjectsCs: string[];
  availableDaysPerWeek: number;
  dailyMinutes: number;
  readinessPct: number | null;
  feasibility: DeadlinePlan["feasibility"];
  feasibilityCs: string;
  recalculationReasonsCs: string[];
  today: PlanTodayView;
  thisWeek: PlanWeekDay[];
  milestones: PlanMilestone[];
  riskAreas: PlanRiskArea[];
  /** Underlying deadline engine snapshot. */
  engine: DeadlinePlan;
};

const WEEKDAY_CS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"] as const;

function formatDateCs(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d}. ${m}. ${y}`;
}

function formatDaysRemainingCs(days: number): string {
  if (days <= 0) return "Cíl je dnes — drž tempo.";
  if (days === 1) return "Do maturity zbývá 1 den.";
  if (days >= 2 && days <= 4) return `Do maturity zbývá ${days} dny.`;
  return `Do maturity zbývá ${days} dní.`;
}

function phaseForDayOffset(
  phases: DeadlinePlan["phases"],
  dayOffset: number,
): PlannerPhase | null {
  const hit = phases.find(
    (p) => dayOffset >= p.startDayOffset && dayOffset <= p.endDayOffset,
  );
  return hit?.phase ?? null;
}

function buildRecalculationReasons(signals: DynamicStudyPlanSignals): string[] {
  const reasons: string[] = [];
  if (signals.missedDays > 0) {
    reasons.push(
      `Vynechané dny (${signals.missedDays}) — catch-up je zastropovaný, ne celý backlog.`,
    );
  }
  if (signals.weekDeltaPct != null && signals.weekDeltaPct >= 5) {
    reasons.push(
      `Připravenost rostla rychleji (+${Math.round(signals.weekDeltaPct)} % za týden) — fáze se posunula dopředu.`,
    );
  }
  if (signals.materialsRecentlyReady || signals.materialsReadyCount > 0) {
    reasons.push(
      signals.materialsRecentlyReady
        ? "Nové materiály jsou ready — obsah a priority se přepočítaly."
        : `Nahrané materiály (${signals.materialsReadyCount}) vstupují do odhadu rozsahu.`,
    );
  }
  if (
    signals.previousTargetDate &&
    signals.previousTargetDate !== signals.targetDate
  ) {
    reasons.push(
      `Datum maturity změněno z ${formatDateCs(signals.previousTargetDate)} na ${formatDateCs(signals.targetDate)}.`,
    );
  }
  if (reasons.length === 0) {
    reasons.push(
      "Plán je živý — přepočítá se při změně data, mastery, materiálů nebo vynechaném dni.",
    );
  }
  return reasons;
}

function buildTodayView(
  engine: DeadlinePlan,
  signals: DynamicStudyPlanSignals,
): PlanTodayView {
  const items: PlanTodayItem[] = [];
  let remaining = engine.today.scheduledMinutes;

  if (engine.today.reviewItems > 0 && remaining > 0) {
    const mins = Math.min(
      remaining,
      Math.max(6, Math.round(engine.today.reviewItems * 1.2)),
    );
    items.push({
      labelCs: `Zopakovat ${engine.today.reviewItems} položek`,
      href: "/app/review/mixed",
      minutes: mins,
    });
    remaining -= mins;
  }

  if (signals.weakAreas[0] && remaining > 0 && engine.today.newTopics > 0) {
    const mins = Math.min(remaining, 12);
    items.push({
      labelCs: `Slabina: ${signals.weakAreas[0].labelCs}`,
      href: signals.weakAreas[0].href,
      minutes: mins,
    });
    remaining -= mins;
  } else if (engine.today.newTopics > 0 && remaining > 0) {
    const mins = Math.min(remaining, 12);
    items.push({
      labelCs: "Nová látka z plánu",
      href: "/app/learn",
      minutes: mins,
    });
    remaining -= mins;
  }

  if (engine.today.consolidationBlocks > 0 && remaining > 0) {
    items.push({
      labelCs: "Active recall / ověření",
      href: "/app/tests",
      minutes: Math.min(remaining, 12),
    });
  }

  if (signals.materialsReadyCount > 0 && items.length < 3) {
    items.push({
      labelCs: "Moje materiály — studijní session",
      href: "/app/materials",
      minutes: Math.min(10, engine.today.scheduledMinutes),
    });
  }

  if (items.length === 0) {
    items.push({
      labelCs: "Krátká studijní session",
      href: "/app/dashboard",
      minutes: engine.today.scheduledMinutes,
    });
  }

  const first = items[0]!;
  return {
    phase: engine.currentPhase,
    phaseLabelCs: engine.currentPhaseLabelCs,
    minutes: engine.today.scheduledMinutes,
    noteCs: engine.today.noteCs,
    items,
    ctaHref: first.href,
    ctaLabelCs: `Dnes — ${engine.today.scheduledMinutes} min`,
  };
}

function buildThisWeek(
  engine: DeadlinePlan,
  signals: DynamicStudyPlanSignals,
  now: Date,
): PlanWeekDay[] {
  const todayKey = toPlannerDateKey(now);
  const days: PlanWeekDay[] = [];
  let studyDayIndex = 0;

  for (let i = 0; i < 7; i++) {
    const dateKey = addDaysToDateKey(todayKey, i);
    const d = new Date(`${dateKey}T12:00:00`);
    const available = isAvailableStudyDay(d, engine.availableDaysPerWeek);
    const phase = available
      ? phaseForDayOffset(engine.phases, studyDayIndex) ?? engine.currentPhase
      : null;
    if (available) studyDayIndex += 1;

    const focusCs = !available
      ? "Volno — podle tvého rozpočtu dní"
      : i === 0
        ? engine.today.noteCs
        : phase
          ? `Tempo: ${plannerPhaseShortCs[phase]}`
          : "Drž denní budget";

    days.push({
      dateKey,
      labelCs: formatDateCs(dateKey),
      weekdayCs: WEEKDAY_CS[d.getDay()] ?? "",
      isToday: i === 0,
      isAvailable: available,
      minutes: available ? signals.dailyMinutes : 0,
      focusCs,
      phase,
    });
  }
  return days;
}

function buildMilestones(
  engine: DeadlinePlan,
  now: Date,
): PlanMilestone[] {
  const todayKey = toPlannerDateKey(now);
  const milestones: PlanMilestone[] = [];

  milestones.push({
    id: "today",
    titleCs: "Dnes",
    dateKey: todayKey,
    status: "current",
    detailCs: `${engine.today.scheduledMinutes} min · ${plannerPhaseShortCs[engine.currentPhase]}`,
  });

  for (const phase of engine.phases) {
    if (phase.phase === engine.currentPhase) continue;
    const past = phase.endDate < todayKey;
    milestones.push({
      id: `phase-${phase.phase}`,
      titleCs: plannerPhaseShortCs[phase.phase],
      dateKey: phase.startDate,
      status: past ? "done" : "upcoming",
      detailCs: `${formatDateCs(phase.startDate)} – ${formatDateCs(phase.endDate)} · ${phase.dayCount} dní`,
    });
  }

  milestones.push({
    id: "exam",
    titleCs: "Maturita",
    dateKey: engine.targetDate,
    status: "upcoming",
    detailCs: `Cíl ${formatDateCs(engine.targetDate)} — realistické dokončení, ne perfektní pokrytí.`,
  });

  return milestones.slice(0, 6);
}

function buildRiskAreas(
  engine: DeadlinePlan,
  signals: DynamicStudyPlanSignals,
): PlanRiskArea[] {
  const risks: PlanRiskArea[] = [];

  if (engine.feasibility === "at_risk") {
    risks.push({
      id: "time-risk",
      severity: "high",
      titleCs: "Čas nestačí na vše",
      detailCs:
        "Priorita high-value slabiny a due review — ne snaha dohnat 100 % obsahu.",
      href: "/app/zachran-me",
    });
  } else if (engine.feasibility === "tight") {
    risks.push({
      id: "time-tight",
      severity: "medium",
      titleCs: "Těsné tempo",
      detailCs: engine.feasibilityCs,
    });
  }

  for (const weak of signals.weakAreas.slice(0, 3)) {
    risks.push({
      id: `weak-${weak.labelCs}`,
      severity: weak.pct < 45 ? "high" : "medium",
      titleCs: weak.labelCs,
      detailCs: `Připravenost cca ${Math.round(weak.pct)} % — cílená session před novým obsahem.`,
      href: weak.href,
    });
  }

  if (signals.dueReviews >= 20) {
    risks.push({
      id: "overdue",
      severity: signals.dueReviews >= 40 ? "high" : "medium",
      titleCs: "Fronta opakování",
      detailCs: `${signals.dueReviews} položek due — dřív než nová látka.`,
      href: "/app/review/mixed",
    });
  }

  if (signals.missedDays >= 3) {
    risks.push({
      id: "missed",
      severity: "medium",
      titleCs: "Výpadek tempa",
      detailCs: `${signals.missedDays} vynechaných dní — plán už omezil catch-up.`,
      href: "/app/dashboard",
    });
  }

  if (
    signals.materialsPendingCount > 0 &&
    signals.materialsReadyCount === 0
  ) {
    risks.push({
      id: "materials-pending",
      severity: "low",
      titleCs: "Materiály se ještě zpracovávají",
      detailCs: "Až budou ready, plán doplní obsah z dokumentů.",
      href: "/app/materials",
    });
  }

  if (signals.readinessPct == null || signals.readinessPct < 35) {
    risks.push({
      id: "evidence",
      severity: "medium",
      titleCs: "Málo důkazů o připravenosti",
      detailCs: "Nejdřív cvičení a diagnostika — pak přesnější plán.",
      href: "/app/progress",
    });
  }

  // Prefer realistic completion: if too many risks, keep top by severity
  const rank = { high: 0, medium: 1, low: 2 };
  return risks
    .sort((a, b) => rank[a.severity] - rank[b.severity])
    .slice(0, 5);
}

/**
 * Build the student-facing dynamic plan from live signals.
 */
export function buildDynamicStudyPlan(
  signals: DynamicStudyPlanSignals,
  now = new Date(),
): DynamicStudyPlan {
  const availableDaysPerWeek = resolveAvailableDaysPerWeek({
    studyMode: signals.studyMode,
    availableDaysPerWeek: signals.availableDaysPerWeek,
  });

  const masteryPct =
    signals.readinessPct != null
      ? signals.readinessPct
      : Math.max(0, (signals.readinessFeeling - 1) * 20);

  // Faster mastery → treat as higher coverage for phase advance (realistic, not perfection)
  const masteryForPhase =
    signals.weekDeltaPct != null && signals.weekDeltaPct >= 5
      ? Math.min(100, masteryPct + Math.min(12, signals.weekDeltaPct))
      : masteryPct;

  const engine = buildDeadlinePlan(
    {
      targetDate: signals.targetDate,
      dailyMinutes: signals.dailyMinutes,
      availableDaysPerWeek,
      contentUnits: Math.max(1, signals.contentUnits),
      masteryPct: masteryForPhase,
      dueReviews: signals.dueReviews,
      missedDays: signals.missedDays,
      readinessFeeling: signals.readinessFeeling,
      materialsReadyCount: signals.materialsReadyCount,
      materialsKnowledgePoints: signals.materialsKnowledgePoints,
    },
    now,
  );

  return {
    philosophyCs:
      "Priorita: realistické dokončení do maturity — ne falešná dokonalost.",
    targetDate: engine.targetDate,
    targetDateCs: formatDateCs(engine.targetDate),
    daysRemaining: engine.daysRemaining,
    daysRemainingCs: formatDaysRemainingCs(engine.daysRemaining),
    subjectsCs: signals.subjects.map((s) => subjectLabels[s]),
    availableDaysPerWeek: engine.availableDaysPerWeek,
    dailyMinutes: signals.dailyMinutes,
    readinessPct: signals.readinessPct,
    feasibility: engine.feasibility,
    feasibilityCs: engine.feasibilityCs,
    recalculationReasonsCs: buildRecalculationReasons(signals),
    today: buildTodayView(engine, signals),
    thisWeek: buildThisWeek(engine, signals, now),
    milestones: buildMilestones(engine, now),
    riskAreas: buildRiskAreas(engine, signals),
    engine,
  };
}

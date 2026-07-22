"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BETA_TARGET_DATE,
  ONBOARDING_STEPS,
  preferredStudyTimeLabels,
  preferredStudyTimes,
  readinessFeelingLabels,
  schoolTypeLabels,
  schoolTypes,
  stepSchemas,
  subjectLabels,
  subjects,
  studyModeLabels,
  studyModes,
  type OnboardingInput,
  type OnboardingStepId,
} from "@/domain/onboarding/schema";
import { track } from "@/lib/analytics";
import {
  saveOnboardingAction,
  skipOnboardingAction,
} from "@/server/actions/onboarding";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

type WizardProps = {
  mode: "create" | "edit";
  initial?: Partial<OnboardingInput>;
  /** Show “Přeskočit a začít se učit” on every step (guest / optional onboarding). */
  allowSkip?: boolean;
};

const defaultDraft: OnboardingInput = {
  displayName: "",
  targetDate: BETA_TARGET_DATE,
  schoolType: "gymnazium",
  subjects: ["cjl"],
  readinessFeeling: 3,
  dailyMinutes: 25,
  preferredStudyTime: "evening",
  studyMode: "standard",
  wantsDiagnostic: false,
};

function ChoiceButton({
  selected,
  onClick,
  title,
  description,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-lg border px-4 py-3 text-left transition duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        selected
          ? "border-action bg-action-soft shadow-xs"
          : "border-border bg-surface hover:bg-subtle",
        disabled && "opacity-50",
      )}
    >
      <span className="block text-body-sm font-semibold text-fg">{title}</span>
      {description ? (
        <span className="mt-0.5 block text-caption text-fg-muted">
          {description}
        </span>
      ) : null}
    </button>
  );
}

export function OnboardingWizard({
  mode,
  initial,
  allowSkip = true,
}: WizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<OnboardingInput>({
    ...defaultDraft,
    ...initial,
    subjects: initial?.subjects?.length ? initial.subjects : defaultDraft.subjects,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const step = ONBOARDING_STEPS[stepIndex]!;
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    track(mode === "edit" ? "onboarding_started" : "onboarding_started", {
      mode,
      step: step.id,
    });
    track("onboarding_step_viewed", { step: step.id, index: stepIndex });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per step change
  }, [step.id, stepIndex, mode]);

  const progressValue = useMemo(
    () => ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100,
    [stepIndex],
  );

  function patch<K extends keyof OnboardingInput>(
    key: K,
    value: OnboardingInput[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFormError(null);
  }

  function validateStep(id: OnboardingStepId): boolean {
    const schema = stepSchemas[id];
    const result = schema.safeParse(draft);
    if (result.success) {
      setFieldErrors({});
      track("onboarding_step_completed", { step: id });
      return true;
    }
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "_form");
      errors[key] = errors[key] ?? [];
      errors[key].push(issue.message);
    }
    setFieldErrors(errors);
    track("onboarding_step_validation_failed", { step: id });
    return false;
  }

  function goNext() {
    if (!validateStep(step.id)) return;
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    submit();
  }

  function goBack() {
    setFormError(null);
    setFieldErrors({});
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function submit() {
    setFormError(null);
    startTransition(async () => {
      const result = await saveOnboardingAction(draft);
      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      if (result.wantsDiagnostic) {
        router.push("/app/tests?intent=diagnostic");
      } else {
        router.push("/app/dashboard");
      }
      router.refresh();
    });
  }

  function skipAndLearn() {
    setFormError(null);
    startTransition(async () => {
      const result = await skipOnboardingAction({
        displayName: draft.displayName.trim() || undefined,
        targetDate: draft.targetDate || undefined,
        dailyMinutes: draft.dailyMinutes || undefined,
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      router.push("/app/learn");
      router.refresh();
    });
  }

  function err(key: string): string | undefined {
    return fieldErrors[key]?.[0];
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <Progress
        label={`Krok ${stepIndex + 1} z ${ONBOARDING_STEPS.length}`}
        value={progressValue}
        showValue
        size="sm"
      />

      <div className="mt-8">
        <h1 className="font-display text-title-lg text-fg">{step.title}</h1>
        <p className="mt-2 text-body-sm text-fg-secondary">{step.description}</p>
      </div>

      <div className="mt-6 space-y-4">
        {step.id === "name" && (
          <div className="space-y-1.5">
            <Label htmlFor="displayName" requiredMark>
              Jméno
            </Label>
            <Input
              id="displayName"
              name="displayName"
              autoComplete="given-name"
              value={draft.displayName}
              invalid={Boolean(err("displayName"))}
              onChange={(e) => patch("displayName", e.target.value)}
              placeholder="Např. Tereza"
              disabled={pending}
            />
            {err("displayName") ? (
              <p className="text-caption text-danger" role="alert">
                {err("displayName")}
              </p>
            ) : null}
          </div>
        )}

        {step.id === "date" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="targetDate" requiredMark>
                Cílové datum / maturita
              </Label>
              <Input
                id="targetDate"
                name="targetDate"
                type="date"
                value={draft.targetDate}
                invalid={Boolean(err("targetDate"))}
                onChange={(e) => patch("targetDate", e.target.value)}
                disabled={pending}
              />
              {err("targetDate") ? (
                <p className="text-caption text-danger" role="alert">
                  {err("targetDate")}
                </p>
              ) : null}
            </div>
            <ChoiceButton
              selected={draft.targetDate === BETA_TARGET_DATE}
              title="Beta: 31. srpna 2026"
              description="Rychlá volba pro beta termín."
              onClick={() => patch("targetDate", BETA_TARGET_DATE)}
              disabled={pending}
            />
          </div>
        )}

        {step.id === "schoolSubjects" && (
          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-body-sm font-medium text-fg">
                Typ školy
              </legend>
              <div className="grid gap-2">
                {schoolTypes.map((type) => (
                  <ChoiceButton
                    key={type}
                    selected={draft.schoolType === type}
                    title={schoolTypeLabels[type]}
                    onClick={() => patch("schoolType", type)}
                    disabled={pending}
                  />
                ))}
              </div>
              {err("schoolType") ? (
                <p className="text-caption text-danger" role="alert">
                  {err("schoolType")}
                </p>
              ) : null}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-body-sm font-medium text-fg">
                Předměty
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {subjects.map((subject) => {
                  const selected = draft.subjects.includes(subject);
                  return (
                    <ChoiceButton
                      key={subject}
                      selected={selected}
                      title={subjectLabels[subject]}
                      onClick={() => {
                        const next = selected
                          ? draft.subjects.filter((s) => s !== subject)
                          : [...draft.subjects, subject];
                        patch("subjects", next);
                      }}
                      disabled={pending}
                    />
                  );
                })}
              </div>
              {err("subjects") ? (
                <p className="text-caption text-danger" role="alert">
                  {err("subjects")}
                </p>
              ) : null}
            </fieldset>
          </div>
        )}

        {step.id === "readiness" && (
          <fieldset className="space-y-2">
            <legend className="sr-only">Pocit připravenosti</legend>
            <div className="grid gap-2">
              {([1, 2, 3, 4, 5] as const).map((level) => (
                <ChoiceButton
                  key={level}
                  selected={draft.readinessFeeling === level}
                  title={readinessFeelingLabels[level]}
                  description={`${level} / 5`}
                  onClick={() => patch("readinessFeeling", level)}
                  disabled={pending}
                />
              ))}
            </div>
            {err("readinessFeeling") ? (
              <p className="text-caption text-danger" role="alert">
                {err("readinessFeeling")}
              </p>
            ) : null}
          </fieldset>
        )}

        {step.id === "time" && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="dailyMinutes" requiredMark>
                Minut denně
              </Label>
              <Input
                id="dailyMinutes"
                name="dailyMinutes"
                type="number"
                min={10}
                max={240}
                step={5}
                value={draft.dailyMinutes}
                invalid={Boolean(err("dailyMinutes"))}
                onChange={(e) =>
                  patch("dailyMinutes", Number(e.target.value) || 0)
                }
                disabled={pending}
              />
              {err("dailyMinutes") ? (
                <p className="text-caption text-danger" role="alert">
                  {err("dailyMinutes")}
                </p>
              ) : (
                <p className="text-caption text-fg-muted">
                  Doporučení: 15–30 min jasné mise.
                </p>
              )}
            </div>
            <fieldset className="space-y-2">
              <legend className="text-body-sm font-medium text-fg">
                Preferovaný čas
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {preferredStudyTimes.map((time) => (
                  <ChoiceButton
                    key={time}
                    selected={draft.preferredStudyTime === time}
                    title={preferredStudyTimeLabels[time]}
                    onClick={() => patch("preferredStudyTime", time)}
                    disabled={pending}
                  />
                ))}
              </div>
              {err("preferredStudyTime") ? (
                <p className="text-caption text-danger" role="alert">
                  {err("preferredStudyTime")}
                </p>
              ) : null}
            </fieldset>
          </div>
        )}

        {step.id === "mode" && (
          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-body-sm font-medium text-fg">Režim</legend>
              <div className="grid gap-2">
                {studyModes.map((modeOption) => (
                  <ChoiceButton
                    key={modeOption}
                    selected={draft.studyMode === modeOption}
                    title={studyModeLabels[modeOption]}
                    description={
                      modeOption === "intensive"
                        ? "Víc minut, priority chyby a overdue. Min. 25 min/den."
                        : "Vyvážené tempo podle tvého budgetu."
                    }
                    onClick={() => {
                      setDraft((prev) => ({
                        ...prev,
                        studyMode: modeOption,
                        dailyMinutes:
                          modeOption === "intensive" && prev.dailyMinutes < 25
                            ? 25
                            : prev.dailyMinutes,
                      }));
                      setFormError(null);
                    }}
                    disabled={pending}
                  />
                ))}
              </div>
              {err("studyMode") ? (
                <p className="text-caption text-danger" role="alert">
                  {err("studyMode")}
                </p>
              ) : null}
            </fieldset>

            <div className="rounded-xl border border-border bg-surface-muted/70 p-4">
              <p className="text-body-sm font-semibold text-fg">
                Nevím, jak na tom jsem
              </p>
              <p className="mt-1 text-body-sm text-fg-muted">
                Po uložení tě pošleme na vstupní diagnostiku. Plán pak postavíme
                z výsledků, ne z odhadu.
              </p>
              <div className="mt-3">
                <ChoiceButton
                  selected={draft.wantsDiagnostic}
                  title={
                    draft.wantsDiagnostic
                      ? "Diagnostika: zapnutá"
                      : "Udělám diagnostiku"
                  }
                  description="Volitelné — můžeš začít i bez ní."
                  onClick={() =>
                    patch("wantsDiagnostic", !draft.wantsDiagnostic)
                  }
                  disabled={pending}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {formError ? (
        <Alert tone="danger" title="Nepodařilo se uložit" className="mt-6">
          {formError}
        </Alert>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        {stepIndex > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={pending}
          >
            Zpět
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={goNext}
          disabled={pending}
          className="min-w-[10rem]"
        >
          {pending
            ? "Ukládám…"
            : isLast
              ? mode === "edit"
                ? "Uložit změny"
                : "Vytvořit plán"
              : "Pokračovat"}
        </Button>
        {allowSkip && mode === "create" ? (
          <Button
            type="button"
            variant="ghost"
            onClick={skipAndLearn}
            disabled={pending}
            className="min-w-[10rem]"
          >
            Přeskočit a začít se učit
          </Button>
        ) : null}
      </div>

      {pending ? (
        <p className="mt-3 text-caption text-fg-muted" aria-live="polite">
          Ukládám profil a generuji první study plan…
        </p>
      ) : null}
    </div>
  );
}

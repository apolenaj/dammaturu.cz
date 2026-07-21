"use client";

import { useState } from "react";
import type { LearningCelebration } from "@/domain/learning/progress-gamification";
import { CelebrateMoment } from "@/components/ui/celebrate";

/**
 * Queue of real-outcome celebrations — dismissible, evidence-first.
 */
export function LearningCelebrationQueue({
  initial,
}: {
  initial: LearningCelebration[];
}) {
  const [items, setItems] = useState(initial);
  if (items.length === 0) return null;

  const current = items[0]!;

  return (
    <div className="space-y-3">
      <CelebrateMoment
        title={current.titleCs}
        description={current.descriptionCs}
        actionLabel={items.length > 1 ? "Další" : "OK"}
        onAction={() => setItems((prev) => prev.slice(1))}
      >
        <p className="text-caption text-fg-muted">{current.evidenceCs}</p>
        {items.length > 1 ? (
          <p className="text-caption text-fg-muted">
            +{items.length - 1} další
          </p>
        ) : null}
      </CelebrateMoment>
    </div>
  );
}

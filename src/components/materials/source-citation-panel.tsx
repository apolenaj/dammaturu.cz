"use client";

import { useState } from "react";
import {
  evidenceConfidenceLabelsCs,
  formatCitationLocation,
  type EvidenceConfidence,
  type SourceCitation,
} from "@/domain/learning/grounded-study";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function confidenceTone(c: EvidenceConfidence): BadgeTone {
  switch (c) {
    case "verified_from_source":
      return "success";
    case "likely":
      return "info";
    case "needs_review":
      return "warning";
    case "insufficient":
      return "danger";
    default:
      return "neutral";
  }
}

export function ConfidenceBadge({
  confidence,
}: {
  confidence: EvidenceConfidence;
}) {
  return (
    <Badge tone={confidenceTone(confidence)}>
      {evidenceConfidenceLabelsCs[confidence]}
    </Badge>
  );
}

export function SourceCitationPanel({
  citations,
  confidence,
}: {
  citations: SourceCitation[];
  confidence?: EvidenceConfidence;
}) {
  const [open, setOpen] = useState(false);

  if (!citations.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {confidence ? <ConfidenceBadge confidence={confidence} /> : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Skrýt zdroj" : "Zobrazit zdroj"}
        </Button>
      </div>
      {open ? (
        <ul className="space-y-3 rounded-lg border border-border bg-subtle/40 p-3">
          {citations.map((c, i) => (
            <li key={`${c.documentId}-${c.chunkId ?? i}`} className="space-y-1">
              <p className="text-caption font-semibold text-fg">
                {formatCitationLocation(c)}
              </p>
              <blockquote className="border-l-2 border-action pl-3 text-body-sm text-fg-secondary whitespace-pre-wrap">
                {c.sourceText}
              </blockquote>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

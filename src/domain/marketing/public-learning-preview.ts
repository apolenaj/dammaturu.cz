/**
 * Public interactive preview — real ČJL facts from verified study corpus.
 * Graded client-side; no fake scores or invented sources.
 */

export type PreviewChoice = {
  id: string;
  label: string;
};

export type PreviewItem = {
  id: string;
  prompt: string;
  choices: PreviewChoice[];
  correctChoiceId: string;
  feedbackCorrectCs: string;
  feedbackWrongCs: string;
  explanationCs: string;
  sourceLabelCs: string;
  sourceExcerptCs: string;
};

/** Two short items — enough to feel a real loop without a long marketing quiz. */
export const publicPreviewItems: PreviewItem[] = [
  {
    id: "no-periodizace",
    prompt:
      "Jaké období se obvykle označuje jako národní obrození?",
    choices: [
      {
        id: "a",
        label: "Od 70. let 18. století do 50. let 19. století",
      },
      {
        id: "b",
        label: "Jen léta 1848–1918",
      },
      {
        id: "c",
        label: "Celé 17. století",
      },
    ],
    correctChoiceId: "a",
    feedbackCorrectCs: "Správně — držíš periodizaci.",
    feedbackWrongCs: "Ještě ne — podívej se na zdrojovou formulaci.",
    explanationCs:
      "Jako národní obrození obvykle označujeme období, jehož začátek spadá do 70. let 18. století a konec do 50. let 19. století. Tradičně bývá literární historií děleno do 4 etap.",
    sourceLabelCs: "Zdroj: Národní obrození – studijní materiál",
    sourceExcerptCs:
      "Jako národní obrození obvykle označujeme období, jehož začátek spadá do 70. let 18. století a konec do 50. let 19. století. Tradičně bývá literární historií děleno do 4 etap.",
  },
  {
    id: "romantismus-znak",
    prompt: "Co je typické pro romantismus v literatuře?",
    choices: [
      {
        id: "a",
        label: "Důraz na cit, subjektivitu a individualitu hrdiny",
      },
      {
        id: "b",
        label: "Jen suchý výčet historických dat bez postav",
      },
      {
        id: "c",
        label: "Vyloučení přírody z motivů",
      },
    ],
    correctChoiceId: "a",
    feedbackCorrectCs: "Správně — to je jádro romantismu k maturitě.",
    feedbackWrongCs: "Zkus to znovu — romantismus staví na citu a jedinci.",
    explanationCs:
      "Romantismus staví do popředí cit a subjektivitu, často konflikt jedince a společnosti a individualitu hrdiny. V české literatuře je klíčový třeba Mácha (Máj).",
    sourceLabelCs: "Zdroj: Romantismus – studijní materiál ČJL",
    sourceExcerptCs:
      "Romantismus: důraz na cit a subjektivitu; konflikt jedince a společnosti; individualita hrdiny.",
  },
];

export function gradePreviewChoice(
  item: PreviewItem,
  choiceId: string,
): {
  correct: boolean;
  feedbackCs: string;
} {
  const correct = choiceId === item.correctChoiceId;
  return {
    correct,
    feedbackCs: correct ? item.feedbackCorrectCs : item.feedbackWrongCs,
  };
}

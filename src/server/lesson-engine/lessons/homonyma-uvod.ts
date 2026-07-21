import { deterministicUuid } from "@/server/curriculum/ids";
import { parseLessonDocument, type LessonDocument } from "@/domain/learning/lesson";

const NS = "dammaturu.lesson";

function bid(key: string) {
  return deterministicUuid(NS, key);
}

function ku(key: string) {
  return deterministicUuid(NS, `ku:${key}`);
}

/**
 * Sample schema-driven lesson for topic Homonyma.
 * Built from typed blocks — never a long-text dump.
 */
export function buildHomonymaLesson(now = new Date().toISOString()): LessonDocument {
  const topicId = deterministicUuid(
    "dammaturu.curriculum",
    "topic:cjl-beta:homonyma",
  );
  const kuDef = ku("homonyma:definice");
  const kuVs = ku("homonyma:vs-polysemie");
  const kuPractice = ku("homonyma:rozpoznani");

  const lesson = {
    id: bid("lesson:homonyma-uvod"),
    slug: "homonyma-uvod",
    title: "Homonyma — úvod",
    topicId,
    topicSlug: "homonyma",
    curriculumSlug: "cjl-beta",
    objective:
      "Rozpoznáš homonyma a odlišíš je od slov mnohoznačných (polysémie).",
    estimatedMinutes: 12,
    status: "published" as const,
    knowledgeUnitIds: [kuDef, kuVs, kuPractice],
    blocks: [
      {
        id: bid("block:homonyma:hook"),
        type: "hook" as const,
        knowledgeUnitIds: [kuDef],
        prompt: "Proč „kolej“ může znamenat dvě úplně jiné věci?",
        tease: "Jedna forma — dva významy. Ale není to vždy polysémie.",
      },
      {
        id: bid("block:homonyma:context"),
        type: "quick_context" as const,
        knowledgeUnitIds: [kuDef],
        title: "Rychlý kontext",
        bullets: [
          "Homonyma = stejná forma, různé významy (nesouvisejí).",
          "Maturita často zkouší rozdíl vůči polysémii.",
          "Potřebuješ příklady + spolehlivé rozpoznání.",
        ],
      },
      {
        id: bid("block:homonyma:core"),
        type: "core_explanation" as const,
        knowledgeUnitIds: [kuDef],
        title: "Jádro",
        paragraphs: [
          "Homonyma jsou slova, která znějí nebo vypadají stejně, ale jejich významy k sobě nepatří historicky ani významově.",
          "Příklad: „kolej“ (dráha) vs. „kolej“ (ubytování) — dvě samostatná slova se stejnou podobou.",
        ],
        explanation:
          "Když si nejsi jistý, zeptej se: „Jsou významy odvozené od jednoho jádra, nebo jde o náhodnou shodu forem?“",
      },
      {
        id: bid("block:homonyma:compare"),
        type: "visual_comparison" as const,
        knowledgeUnitIds: [kuVs],
        title: "Homonymum vs. mnohoznačnost",
        leftLabel: "Homonyma",
        rightLabel: "Slova mnohoznačná",
        leftPoints: [
          "Významy spolu nesouvisejí",
          "Spíš náhodná shoda forem",
          "Často různé etymologie",
        ],
        rightPoints: [
          "Jeden lexém, více významů",
          "Významy souvisejí (přeneseně)",
          "Typická polysémie",
        ],
      },
      {
        id: bid("block:homonyma:example"),
        type: "example" as const,
        knowledgeUnitIds: [kuPractice],
        title: "Příklad",
        setup: "„Zámek“ = palác / mechanismus na dveřích.",
        resolution:
          "Jde o homonyma: významy nesdílejí společné jádro v běžném povědomí jako přenesení.",
      },
      {
        id: bid("block:homonyma:trap"),
        type: "common_trap" as const,
        knowledgeUnitIds: [kuVs],
        title: "Častá past",
        trap: "Každé slovo s více významy automaticky označím jako homonymum.",
        correction:
          "Nejdřív ověř souvislost významů. Souvisí-li (oko — na těle / na jehle), jde o mnohoznačnost.",
      },
      {
        id: bid("block:homonyma:mnemonic"),
        type: "mnemonic" as const,
        knowledgeUnitIds: [kuDef],
        cue: "HOMO = stejné tělo, jiné duše.",
        expansion: "Stejná forma (tělo), různé nesouvisející významy (duše).",
      },
      {
        id: bid("block:homonyma:remember"),
        type: "remember_this" as const,
        knowledgeUnitIds: [kuDef, kuVs],
        statement:
          "Homonyma = stejná forma + nesouvisející významy. Polysémie = jeden lexém + související významy.",
      },
      {
        id: bid("block:homonyma:cards"),
        type: "flashcard_burst" as const,
        knowledgeUnitIds: [kuDef, kuVs],
        title: "Flashcard burst",
        cards: [
          {
            front: "Co jsou homonyma?",
            back: "Slova se stejnou formou a nesouvisejícími významy.",
          },
          {
            front: "Homonymum, nebo polysémie: „hlava“ (člověk / zelí)?",
            back: "Polysémie — přenesený související význam.",
          },
        ],
      },
      {
        id: bid("block:homonyma:quiz"),
        type: "mini_quiz" as const,
        knowledgeUnitIds: [kuPractice],
        title: "Mini kvíz",
        question: "„Koruna“ (stromu) a „koruna“ (měna) — co to spíš je?",
        choices: [
          "Homonyma",
          "Synonyma",
          "Jen stylová varianta téhož významu",
        ],
        correctIndex: 0,
        explanation:
          "Významy k sobě nepatří jako přenesení z jednoho jádra v běžném smyslu — typický příklad homonymie (ověřuj vždy kontext učebnice).",
      },
      {
        id: bid("block:homonyma:recall"),
        type: "active_recall" as const,
        knowledgeUnitIds: [kuDef, kuVs],
        title: "Active recall",
        prompt:
          "Vlastními slovy: jak poznáš homonymum od slova mnohoznačného?",
        expectedKeyPoints: [
          "Stejná forma",
          "Nesouvisející vs. související významy",
          "Příklad",
        ],
        explanation:
          "Homonyma: nesouvisející významy. Mnohoznačnost: jeden lexém, významy souvisejí.",
      },
      {
        id: bid("block:homonyma:summary"),
        type: "summary" as const,
        knowledgeUnitIds: [kuDef, kuVs],
        title: "Shrnutí",
        points: [
          "Homonyma ≠ automaticky „více významů“.",
          "Klíč je souvislost významů.",
          "U maturity uveď definici + kontrast + příklad.",
        ],
      },
      {
        id: bid("block:homonyma:exit"),
        type: "exit_ticket" as const,
        knowledgeUnitIds: [kuPractice],
        title: "Exit ticket",
        prompt:
          "Napiš jedno homonymum a jedno mnohoznačné slovo. U každého stručně proč.",
        successCriteria: [
          "Obě kategorie správně přiřazené",
          "Krátké zdůvodnění souvislosti / nesouvislosti",
        ],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  return parseLessonDocument(lesson);
}

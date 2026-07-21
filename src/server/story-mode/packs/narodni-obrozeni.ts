import { deterministicUuid } from "@/server/curriculum/ids";
import { parseStoryPack, type StoryPack } from "@/domain/learning/story-mode";
import {
  ensureVerifiedFromSource,
  ensureVerbatimQaFact,
  findNoDocumentMeta,
  toStoryEvidence,
} from "@/server/story-mode/bootstrap";

const NS = "dammaturu.story-mode";

function bid(key: string) {
  return deterministicUuid(NS, key);
}

/** KU ids from ingested Národní obrození v Čechách.docx */
const KU = {
  upadku: "ab04ee62-d6ed-4fa4-94ba-fc3f1834d55b",
  germanizace: "4cd0c7b2-bab3-4985-90f5-01534a0ff0e5",
  cestinaVenkov: "5e42a80e-e11f-44f8-b2ec-71aa936711ab",
  spisovnaNe: "fda10764-bc9a-4567-be36-84323415fddf",
  reformy: "035554e3-d4e6-4c4c-b7e4-80f4713567ff",
  tolerancni: "085bd079-d6eb-4818-b0c3-284e7b4d9948",
  nemcinaUredni: "bf4bf238-0171-4073-88d0-e439ae1f3372",
  prichodDoMest: "e877526d-89c7-4c3a-929b-9e1ed766f033",
  pojemProces: "988cdb15-a6c5-4185-a777-3fb8010851c1",
  ctyriEtapy: "bc9da87a-21cf-4c2b-b9de-c71273e84484",
  obranna: "fe2bb5b7-0d33-4734-a6fe-9c7c7ea2f37d",
  zakladyKultury: "74d54d37-2060-4420-a7a8-0644b37b1b4a",
  klasicismus: "2a9f9b3c-913e-4dd6-bc9e-4c3d0559053e",
  utok: "e15eddc1-3f0d-4e69-83b3-c5a3cadd748e",
  jazykovyProgram: "c3b7595c-112d-4428-8351-1f6869b184a7",
  dokazatJazyk: "56ee2dea-4f47-4c38-82f4-13408bfb6973",
  rok1848: "feb08fd7-6707-4c13-a87c-c3deefeda70a",
  austroslavismus: "5a4f6484-d111-4cc9-b2f4-5e30f22b8a1d",
  cilZachovat: "f328e32a-462d-4c24-bd83-b226a5470a8a",
  dobrovskyRole: "830884b3-21e4-48ed-b2cb-5772bd05e7e4",
} as const;

/**
 * Build Národní obrození Story Mode pack from verified QA FINALs only.
 */
export async function buildNarodniObrozeniStory(
  now = new Date().toISOString(),
): Promise<StoryPack> {
  const meta = await findNoDocumentMeta();

  // Verbatim extracts (exact source wording) for timeline labels / named persons
  const periodizace = await ensureVerbatimQaFact({
    key: "no-periodizace-4-etapy",
    documentId: meta.documentId,
    filename: meta.filename,
    title: "Periodizace NO — 4 etapy",
    sourceStatement:
      "Jako národní obrození obvykle označujeme období, jehož začátek spadá do 70. let 18. století a konec do 50. let 19. století. Tradičně bývá literární historií děleno do 4 etap.",
  });

  const etapa1full = await ensureVerbatimQaFact({
    key: "no-etapa-1-obranna",
    documentId: meta.documentId,
    filename: meta.filename,
    title: "1. etapa — obranná",
    sourceStatement:
      "1. etapa - nazývaná také obranná, zahrnuje období od 70. let 18. století do počátku 19. století, kdy se utvářely základy českého jazyka, české obrozenecké literatury, českého divadelnictví a novinářství. V kultuře dominovaly vlivy klasicismu a osvícenství.",
  });

  const etapa2full = await ensureVerbatimQaFact({
    key: "no-etapa-2-utok",
    documentId: meta.documentId,
    filename: meta.filename,
    title: "2. etapa — útok",
    sourceStatement:
      "2. etapa - národní hnutí přechází do útoku, zahrnuje počátek 19. století do roku 1830, byl vytvářen jazykový program národního obrození. Spisovatelé se snažili dokázat, že český jazyk je schopen vyrovnat se jazykům vyspělých evropských literatur.",
  });

  const etapa3full = await ensureVerbatimQaFact({
    key: "no-etapa-3-romantismus",
    documentId: meta.documentId,
    filename: meta.filename,
    title: "3. etapa — 1830–1848",
    sourceStatement:
      "3. etapa - je vymezená zhruba lety 1830 – 1848, bylo dobou romantismu a počátků realismu.",
  });

  const dobrovsky = await ensureVerbatimQaFact({
    key: "no-josef-dobrovsky",
    documentId: meta.documentId,
    filename: meta.filename,
    title: "Josef Dobrovský",
    sourceStatement:
      "Josef Dobrovský\n\n• Český filolog, historik, teolog, významný představitel národního obrození, vědecká autorita evropského formátu, zakladatel vědecké slavistiky a bohemistiky",
  });

  const palacky = await ensureVerbatimQaFact({
    key: "no-frantisek-palacky",
    documentId: meta.documentId,
    filename: meta.filename,
    title: "František Palacký",
    sourceStatement:
      "František Palacký\n\n• Český historik a politik, zakladatel novodobého českého dějepisectví,\n\n• Hlasatel austroslavismu",
  });

  // Verify atomic KUs used in the narrative
  const verifiedKus = await Promise.all(
    Object.values(KU).map((id) => ensureVerifiedFromSource(id)),
  );
  const byKu = new Map(verifiedKus.map((i) => [i.knowledgeUnitId, i]));

  const evidenceEntries = [
    toStoryEvidence("e-periodizace", periodizace),
    toStoryEvidence("e-etapa1", etapa1full),
    toStoryEvidence("e-etapa2", etapa2full),
    toStoryEvidence("e-etapa3", etapa3full),
    toStoryEvidence("e-dobrovsky", dobrovsky),
    toStoryEvidence("e-palacky", palacky),
    toStoryEvidence("e-upadku", byKu.get(KU.upadku)!),
    toStoryEvidence("e-germanizace", byKu.get(KU.germanizace)!),
    toStoryEvidence("e-cestina-venkov", byKu.get(KU.cestinaVenkov)!),
    toStoryEvidence("e-spisovna", byKu.get(KU.spisovnaNe)!),
    toStoryEvidence("e-reformy", byKu.get(KU.reformy)!),
    toStoryEvidence("e-tolerancni", byKu.get(KU.tolerancni)!),
    toStoryEvidence("e-nemcina", byKu.get(KU.nemcinaUredni)!),
    toStoryEvidence("e-prichod", byKu.get(KU.prichodDoMest)!),
    toStoryEvidence("e-proces", byKu.get(KU.pojemProces)!),
    toStoryEvidence("e-ctyri", byKu.get(KU.ctyriEtapy)!),
    toStoryEvidence("e-obranna", byKu.get(KU.obranna)!),
    toStoryEvidence("e-zaklady", byKu.get(KU.zakladyKultury)!),
    toStoryEvidence("e-klasicismus", byKu.get(KU.klasicismus)!),
    toStoryEvidence("e-utok", byKu.get(KU.utok)!),
    toStoryEvidence("e-jazyk-program", byKu.get(KU.jazykovyProgram)!),
    toStoryEvidence("e-dokazat", byKu.get(KU.dokazatJazyk)!),
    toStoryEvidence("e-1848", byKu.get(KU.rok1848)!),
    toStoryEvidence("e-austro", byKu.get(KU.austroslavismus)!),
    toStoryEvidence("e-cil", byKu.get(KU.cilZachovat)!),
    toStoryEvidence("e-dobrovsky-role", byKu.get(KU.dobrovskyRole)!),
  ];

  const evidence: StoryPack["evidence"] = {};
  for (const { id, evidence: ev } of evidenceEntries) {
    evidence[id] = ev;
  }

  const pack = {
    id: bid("pack:narodni-obrozeni"),
    slug: "narodni-obrozeni",
    title: "Národní obrození — Story Mode",
    topicSlug: "narodni-obrozeni",
    curriculumSlug: "cjl-beta",
    summary:
      "Příběh, ne seznam: stav češtiny → reformy → obranná etapa → budování jazyka → kultura → další etapy → 1848. Každý fakt = verified FINAL ze zdroje.",
    evidence,
    requiresVerifiedOnly: true as const,
    beats: [
      {
        type: "timeline" as const,
        id: bid("beat:stav-cestiny"),
        title: "Stav češtiny",
        eraLabelEvidenceId: "e-upadku",
        bodyEvidenceIds: ["e-germanizace", "e-cestina-venkov", "e-spisovna"],
      },
      {
        type: "cause_effect" as const,
        id: bid("beat:reformy"),
        title: "Reformy osvícenského absolutismu",
        causeEvidenceIds: ["e-reformy", "e-tolerancni"],
        effectEvidenceIds: ["e-nemcina", "e-prichod"],
      },
      {
        type: "decision_moment" as const,
        id: bid("beat:nemcina-uredni"),
        title: "Decision moment: úřední jazyk",
        situationEvidenceIds: ["e-nemcina"],
        outcomeEvidenceIds: ["e-cestina-venkov", "e-cil"],
        reflectionPrompt:
          "Proč po posílení němčiny jako úředního jazyka nabývá na významu obrana češtiny?",
      },
      {
        type: "timeline" as const,
        id: bid("beat:obranna"),
        title: "Obranná etapa",
        eraLabelEvidenceId: "e-etapa1",
        bodyEvidenceIds: ["e-zaklady", "e-klasicismus", "e-cil"],
      },
      {
        type: "person_card" as const,
        id: bid("beat:dobrovsky"),
        title: "Josef Dobrovský",
        nameEvidenceId: "e-dobrovsky",
        roleEvidenceIds: ["e-dobrovsky", "e-dobrovsky-role"],
      },
      {
        type: "what_next" as const,
        id: bid("beat:co-dal-1"),
        title: "Co se stalo dál?",
        prompt: "Po obranné etapě národní hnutí…",
        options: [
          {
            label:
              "Přechází do útoku: jazykový program a snaha dokázat rovnocennost češtiny",
            isCorrect: true,
            evidenceIds: ["e-etapa2", "e-dokazat"],
          },
          {
            label: "Končí a čeština mizí z veřejného života navždy",
            isCorrect: false,
            evidenceIds: [],
          },
          {
            label: "Přeskakuje rovnou do roku 1918 bez dalších etap",
            isCorrect: false,
            evidenceIds: [],
          },
        ],
      },
      {
        type: "timeline" as const,
        id: bid("beat:budovani-jazyka"),
        title: "Budování jazyka",
        eraLabelEvidenceId: "e-etapa2",
        bodyEvidenceIds: ["e-jazyk-program", "e-dokazat"],
      },
      {
        type: "timeline" as const,
        id: bid("beat:kultura-1830"),
        title: "Kultura a další etapy",
        eraLabelEvidenceId: "e-etapa3",
        bodyEvidenceIds: ["e-periodizace", "e-proces"],
      },
      {
        type: "person_card" as const,
        id: bid("beat:palacky"),
        title: "František Palacký",
        nameEvidenceId: "e-palacky",
        roleEvidenceIds: ["e-palacky", "e-austro"],
      },
      {
        type: "cause_effect" as const,
        id: bid("beat:1848"),
        title: "Rok 1848",
        causeEvidenceIds: ["e-1848"],
        effectEvidenceIds: ["e-austro"],
      },
      {
        type: "what_next" as const,
        id: bid("beat:co-dal-1848"),
        title: "Co se stalo dál?",
        prompt: "Rok 1848 je mezníkem, protože politická reprezentace…",
        options: [
          {
            label:
              "V čele s Palackým vystoupila s austroslavismem (svazek rovnoprávných národů)",
            isCorrect: true,
            evidenceIds: ["e-1848", "e-austro"],
          },
          {
            label: "Zrušila češtinu jako spisovný jazyk",
            isCorrect: false,
            evidenceIds: [],
          },
          {
            label: "Ukončila národní obrození už v roce 1800",
            isCorrect: false,
            evidenceIds: [],
          },
        ],
      },
      {
        type: "checkpoint" as const,
        id: bid("beat:checkpoint"),
        title: "Story checkpoint",
        items: [
          {
            question: "Jak literární historie tradičně dělí národní obrození?",
            choices: [
              "Do 4 etap",
              "Do 2 etap",
              "Nedělí se vůbec",
            ],
            correctIndex: 0,
            evidenceIds: ["e-ctyri", "e-periodizace"],
            explanationEvidenceIds: ["e-periodizace"],
          },
          {
            question: "Obranná etapa především buduje…",
            choices: [
              "Základy jazyka, literatury, divadla a novinářství",
              "Jen tovární průmysl",
              "Jen barokní malířství",
            ],
            correctIndex: 0,
            evidenceIds: ["e-etapa1", "e-zaklady"],
            explanationEvidenceIds: ["e-etapa1"],
          },
          {
            question: "Josef Dobrovský je ve zdroji charakterizován jako…",
            choices: [
              "Zakladatel vědecké slavistiky a bohemistiky",
              "Autor Máje",
              "Císař Josef II.",
            ],
            correctIndex: 0,
            evidenceIds: ["e-dobrovsky", "e-dobrovsky-role"],
            explanationEvidenceIds: ["e-dobrovsky"],
          },
        ],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  return parseStoryPack(pack);
}

import { deterministicUuid } from "@/server/curriculum/ids";
import {
  KYTICE_BALLAD_ORDER,
  KYTICE_SOURCE_HEADERS,
  buildGuiltMatchGame,
  buildRecognizeGame,
  buildWhichBalladGame,
  extractBalladSummaryFromSource,
  parseKyticeExperiencePack,
  type KyticeBallad,
  type KyticeBalladSlug,
  type KyticeExperiencePack,
} from "@/domain/learning/kytice-experience";
import {
  assertVerbatimInSource,
  ensureVerbatimQaFact,
  getIngestedDocumentMeta,
  toReconstructionEvidence,
} from "@/server/story-reconstruction/bootstrap";

const NS = "dammaturu.kytice-experience";
const NOW = "2026-07-20T12:00:00.000Z";

/** Pedagogical fields grounded in SOURCE shrnutí (not invented plots). */
const TEACHING: Record<
  KyticeBalladSlug,
  {
    title: string;
    mainConflict: string;
    guilt: string;
    punishment: string;
    motif: string;
    memorablePoint: string;
    storyReconstructionSlug: string | null;
  }
> = {
  kytice: {
    title: "Kytice",
    mainConflict: "Sirotci ztrácejí matku a hledají ji na hrobě.",
    guilt: "Bez přímé viny dětí — ztráta matky / vlasti.",
    punishment: "Proměna matky v květ; děti žijí s památkou (mateřídouška).",
    motif: "mateřství · vlast · sirotci",
    memorablePoint: "Mateří dech = mateřídouška; matka = vlast, sirotci = národ.",
    storyReconstructionSlug: null,
  },
  vodnik: {
    title: "Vodník",
    mainConflict: "Dcera u jezera × vodník; návrat k matce vs. držení dítěte.",
    guilt: "Dcera chce odejít od vodníka; matka ji zadrží přes půlnoc.",
    punishment: "Vodník zabije dítě — tělíčko bez hlavy u dveří.",
    motif: "voda · mateřství · slib / lhůta",
    memorablePoint: "Pojistka dítěte u vodníka a půlnoc u dveří.",
    storyReconstructionSlug: "kytice-vodnik",
  },
  polednice: {
    title: "Polednice",
    mainConflict: "Matka hrozí dítěti polednicí — a ta skutečně přijde.",
    guilt: "Matka zavolá polednici na nezbedné dítě.",
    punishment: "V panice dítě tiskne tak silně, až ho zadusí.",
    motif: "mateřství · hrozba · vina z přehnané ochrany",
    memorablePoint: "Hrozba se naplní; trest je matčin vlastní čin.",
    storyReconstructionSlug: "kytice-polednice",
  },
  "zahorovo-loze": {
    title: "Záhořovo lože",
    mainConflict: "Poutník vs. lesní muž / cesta do pekla a zpět.",
    guilt: "Lesní muž chce zabít; ďábel drží krvavý zápis.",
    punishment: "Pekelné tresty a zápas o zápis — legenda o vykoupení.",
    motif: "peklo · kříž · vykoupení",
    memorablePoint: "Neobvyklá balada bez ženské hrdinky (dle SOURCE).",
    storyReconstructionSlug: null,
  },
  "stedry-den": {
    title: "Štědrý den",
    mainConflict: "Dívky chtějí poznat budoucnost ve vodě.",
    guilt: "Touha znát osud (Hana a Marie u hladiny).",
    punishment: "Marie vidí rakev a svatby se nedožije.",
    motif: "osud · voda · věštění",
    memorablePoint: "Lépe nic nevědět než strašlivou jistotu.",
    storyReconstructionSlug: null,
  },
  holoubek: {
    title: "Holoubek",
    mainConflict: "Vdova se brzy znovu vdá — svědomí ji usvědčuje.",
    guilt: "Příliš rychlá nová svatba po smrti manžela.",
    punishment: "Holoubek zpívá pravdu; žena se utopí.",
    motif: "vina · svědomí · holub",
    memorablePoint: "Holoubek na hrobě zpívá pravdu o vině.",
    storyReconstructionSlug: null,
  },
  lilie: {
    title: "Lilie",
    mainConflict: "Lilie-žena potřebuje ochranu; matka pána zeď strhne.",
    guilt: "Zrada / zanedbání ochrany (zeď stržena).",
    punishment: "Dítě mrtvé, zbývá zvadlá lilie.",
    motif: "proměna · ochrana · zrada",
    memorablePoint: "Ze lilie žena — bez ochrany zvadne.",
    storyReconstructionSlug: null,
  },
  vestkyne: {
    title: "Věštkyně",
    mainConflict: "Proroctví o budoucnosti národa (Libuše).",
    guilt: "Bez klasické viny postavy — úlomky proroctví.",
    punishment: "Bez klasického trestu — výhled lepších časů.",
    motif: "proroctví · národ · budoucnost",
    memorablePoint: "Věštkyně (Libuše) předpovídá lepší časy národa.",
    storyReconstructionSlug: null,
  },
  "svatebni-kosile": {
    title: "Svatební košile",
    mainConflict: "Dívka jde s „milým“ — on je mrtvý; zahazuje svátosti.",
    guilt: "Touha po milém / opuštění ochrany (knížky, růženec, křížek).",
    punishment: "Hřbitov, mrtví; ráno útržky košile na hrobech.",
    motif: "mrtvý milý · modlitba · zákaz",
    memorablePoint: "Kohout zakokrhá — vše ustane; na hrobech útržky košile.",
    storyReconstructionSlug: "kytice-svatebni-kosile",
  },
  vrba: {
    title: "Vrba",
    mainConflict: "Muž nechápe noční „smrt“ ženy — duše je ve vrbě.",
    guilt: "Muž utne vrbu (zničí schránku duše).",
    punishment: "Žena zemře; syn má kolébku/píšťalky z vrby.",
    motif: "strom · duše · mateřství",
    memorablePoint: "Duše ve vrbě — uťatí stromu zabíjí ženu.",
    storyReconstructionSlug: null,
  },
  "zlaty-kolovrat": {
    title: "Zlatý kolovrat",
    mainConflict: "Babice a dcera zabijí Dorničku a podvrhnou nevěstu.",
    guilt: "Vražda Dorničky a podvod na králi.",
    punishment: "Pravda vyjede najevo; viníci potrestáni (kolovrat / píseň).",
    motif: "podvod · vražda · odhalení",
    memorablePoint: "Usťaté hnáty a oči — podvržená nevěsta.",
    storyReconstructionSlug: "kytice-zlaty-kolovrat",
  },
  "dcerina-kletba": {
    title: "Dceřina kletba",
    mainConflict: "Dcera zabije dítě a proklíná matku i milence.",
    guilt: "Vražda dítěte; matka dovolila vztah / situaci.",
    punishment: "Dcera se jde oběsit; matce zanechá kletbu.",
    motif: "kletba · vina · mateřství",
    memorablePoint: "Prokletí matky za to, že jí to dovolila.",
    storyReconstructionSlug: null,
  },
  poklad: {
    title: "Poklad",
    mainConflict: "Žena bere zlato ze skály a nechá ve skále dítě.",
    guilt: "Chamtivost — zlato před dítětem.",
    punishment: "Skála zmizí; zlato → hlína; dítě uvězněno do dalšího roku.",
    motif: "chamtivost · Velký pátek · skála",
    memorablePoint: "Zlato a stříbro se promění v hlínu a kamení.",
    storyReconstructionSlug: "kytice-poklad",
  },
};

export async function buildKyticeExperiencePack(): Promise<KyticeExperiencePack> {
  const doc = await getIngestedDocumentMeta("Kytice.docx");
  const shrnutiIdx = doc.plainText.indexOf("Shrnutí:");
  if (shrnutiIdx < 0) {
    throw new Error("SOURCE Kytice.docx nemá sekci Shrnutí:");
  }
  const summaryRegion = doc.plainText.slice(shrnutiIdx);
  const headers = KYTICE_BALLAD_ORDER.map((s) => KYTICE_SOURCE_HEADERS[s]);

  // Theme / motif overview — verbatim from SOURCE opening
  const themeCs = "Morální provinění člověka a jejich následky";
  const motifOverviewCs =
    "sobeckost, chamtivost, zločin x trest, mateřství, láska, osud";
  assertVerbatimInSource(doc.plainText, themeCs, "theme");
  assertVerbatimInSource(doc.plainText, motifOverviewCs, "motifs");

  const ballads: KyticeBallad[] = [];

  for (let i = 0; i < KYTICE_BALLAD_ORDER.length; i++) {
    const slug = KYTICE_BALLAD_ORDER[i]!;
    const header = KYTICE_SOURCE_HEADERS[slug];
    const teach = TEACHING[slug];
    const storyBrief = extractBalladSummaryFromSource(
      summaryRegion,
      header,
      headers,
    );
    if (storyBrief.length < 20) {
      throw new Error(`Příliš krátké shrnutí pro ${header}`);
    }
    assertVerbatimInSource(doc.plainText, storyBrief.slice(0, 80), `${slug}:start`);
    // Full brief must be in source (whitespace-normalized handled in assert)
    assertVerbatimInSource(doc.plainText, storyBrief, `${slug}:full`);

    const qa = await ensureVerbatimQaFact({
      key: `kytice-ballad-${slug}`,
      documentId: doc.documentId,
      filename: "Kytice.docx",
      sourceStatement: storyBrief,
      title: `Kytice · ${teach.title} — shrnutí (SOURCE)`,
    });
    const { evidence } = toReconstructionEvidence(`ev-${slug}`, qa);

    ballads.push({
      id: deterministicUuid(NS, `ballad:${slug}`),
      slug,
      title: teach.title,
      orderIndex: i,
      storyBrief,
      mainConflict: teach.mainConflict,
      guilt: teach.guilt,
      punishment: teach.punishment,
      motif: teach.motif,
      memorablePoint: teach.memorablePoint,
      evidence: {
        qaItemId: evidence.qaItemId,
        knowledgeUnitId: evidence.knowledgeUnitId,
        publishedStatement: evidence.publishedStatement,
        validationStatus: evidence.validationStatus as
          | "verified_from_source"
          | "corrected",
        filename: "Kytice.docx",
      },
      storyReconstructionSlug: teach.storyReconstructionSlug,
    });
  }

  const games = {
    recognizeByStory: buildRecognizeGame(ballads),
    matchGuiltConsequence: buildGuiltMatchGame(ballads),
    whichBallad: buildWhichBalladGame(ballads),
  };

  return parseKyticeExperiencePack({
    id: deterministicUuid(NS, "pack:kytice"),
    slug: "kytice",
    title: "Kytice — 13 balad",
    author: "Karel Jaromír Erben",
    summary:
      "Interaktivní collection balad ze SOURCE Kytice.docx: konflikt, vina, trest, motiv + hry.",
    themeCs,
    motifOverviewCs,
    sourceFilename: "Kytice.docx",
    literaryWorkHref: "/app/learn/dilo/kytice",
    reconstructionPackHref: "/app/learn/rekonstrukce-pribehu/literarni-dej",
    ballads,
    games,
    requiresVerifiedOnly: true,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

import { deterministicUuid } from "@/server/curriculum/ids";
import { parseTeachPack, type TeachPack } from "@/domain/learning/teach-it-back";

const NS = "dammaturu.teach-it-back";

function id(key: string) {
  return deterministicUuid(NS, key);
}

function ku(key: string, title: string) {
  return { id: id(`ku:${key}`), title };
}

function item(
  key: string,
  label: string,
  synonyms: string[],
  knowledgeUnit: { id: string; title: string },
  required = true,
) {
  return {
    id: id(`cl:${key}`),
    label,
    synonyms,
    knowledgeUnitId: knowledgeUnit.id,
    knowledgeUnitTitle: knowledgeUnit.title,
    required,
  };
}

function inacc(
  key: string,
  label: string,
  patterns: string[],
  correction: string,
) {
  return {
    id: id(`inc:${key}`),
    label,
    patterns,
    correction,
  };
}

/** Teach It Back prompts — explain in own words, KU checklist. */
export function buildCjlTeachBackPack(
  now = new Date().toISOString(),
): TeachPack {
  const kuRomCit = ku("romantismus-cit", "Romantismus — cit a subjektivita");
  const kuRomKon = ku(
    "romantismus-konflikt",
    "Romantismus — konflikt jedince a společnosti",
  );
  const kuRomInd = ku("romantismus-individualita", "Romantismus — individualita");
  const kuRealTyp = ku("realismus-typizace", "Realismus — typizace všedního života");
  const kuRealSoc = ku("realismus-socialni", "Realismus — sociální prostředí");
  const kuRealObj = ku("realismus-objektivita", "Realismus — objektivita");

  const kuMajCit = ku("maj-cit", "Máj — subjektivita a cit");
  const kuMajHrd = ku("maj-hrdina", "Máj — výjimečný hrdina");
  const kuMajKon = ku("maj-konflikt", "Máj — konflikt se společností");
  const kuMajPri = ku("maj-priroda", "Máj — příroda jako zrcadlo citu");
  const kuMajForm = ku("maj-forma", "Máj — lyrickoepická forma");

  const kuBalzac = ku("balzac-goriot", "Balzac — Otec Goriot / realismus");
  const kuDickens = ku("dickens-oliver", "Dickens — sociální realismus");
  const kuOliver = ku("oliver-twist", "Oliver Twist — sociální román");

  const prompts = [
    {
      id: id("p:realismus-vs-romantismus"),
      slug: "realismus-vs-romantismus",
      prompt:
        "Vysvětli vlastními slovy rozdíl mezi realismem a romantismem.",
      checklist: [
        item(
          "rom-cit",
          "romantismus: cit / subjektivita",
          ["cit a subjektivita", "subjektivita", "emoce", "romanticky cit", "romantický cit"],
          kuRomCit,
        ),
        item(
          "rom-kon",
          "romantismus: konflikt jedince a společnosti",
          [
            "konflikt jedince",
            "jedince a spolecnosti",
            "jedince se spolecnosti",
            "proti spolecnosti",
          ],
          kuRomKon,
        ),
        item(
          "rom-ind",
          "romantismus: individualita / výjimečný hrdina",
          ["individualita", "vyjimecny hrdina", "výjimečný hrdina"],
          kuRomInd,
          false,
        ),
        item(
          "real-typ",
          "realismus: typizace všedního života",
          ["typizace", "vsedni zivot", "všední život", "typizuje"],
          kuRealTyp,
        ),
        item(
          "real-soc",
          "realismus: sociální prostředí / společnost",
          [
            "socialni prostredi",
            "sociální prostředí",
            "socialni podminky",
            "spolecenske prostredi",
          ],
          kuRealSoc,
        ),
        item(
          "real-obj",
          "realismus: objektivita / odstup",
          ["objektivita", "objektivni odstup", "objektivnější odstup", "odstup"],
          kuRealObj,
          false,
        ),
      ],
      inaccuracies: [
        inacc(
          "swap-rom-real",
          "Zaměnil znaky romantismu a realismu",
          [
            "romantismus typizuje",
            "romantismus typizace",
            "romantismus vsedni",
            "romantismus všední",
            "realismus subjektivita",
            "realismus cit",
            "realismus je o citu",
          ],
          "Romantismus = cit/subjektivita; realismus = typizace všedního života a sociální prostředí.",
        ),
        inacc(
          "same-thing",
          "Tvrdí, že jde o totéž",
          ["jsou stejne", "jsou stejné", "totéž", "totez", "neni rozdil", "není rozdíl"],
          "Jsou to odlišné směry s jinými důrazy (cit vs typizace reality).",
        ),
      ],
      excellentAnswer:
        "Romantismus zdůrazňuje cit, subjektivitu a často konflikt výjimečného jedince se společností. Realismus naopak typizuje všední život, sleduje sociální prostředí a drží objektivnější odstup — bez romantické idealizace.",
      minRequiredHits: 4,
      tags: ["romantismus", "realismus", "rozlisovani"],
    },
    {
      id: id("p:maj-romanticke"),
      slug: "maj-romanticke",
      prompt: "Vysvětli, proč je Máj romantické dílo.",
      checklist: [
        item(
          "maj-cit",
          "subjektivita / cit (romantický důraz)",
          ["subjektivita", "cit", "emoce", "romant"],
          kuMajCit,
        ),
        item(
          "maj-hrd",
          "výjimečný / romantický hrdina (Vilém)",
          ["hrdina", "vilem", "vilém", "vyjimecny", "individualita"],
          kuMajHrd,
        ),
        item(
          "maj-kon",
          "konflikt jedince se společností / trestem",
          ["konflikt", "spolecnost", "trest", "vina"],
          kuMajKon,
        ),
        item(
          "maj-pri",
          "příroda jako zrcadlo citu / nálady",
          ["priroda", "příroda", "zrcadlo", "krajina"],
          kuMajPri,
        ),
        item(
          "maj-form",
          "lyrickoepická forma",
          ["lyricko", "lyrickoepicka", "lyrickoepická", "epicka", "forma"],
          kuMajForm,
          false,
        ),
      ],
      inaccuracies: [
        inacc(
          "maj-realismus",
          "Označuje Máj za realistické dílo",
          [
            "realisticke dilo",
            "realistické dílo",
            "je realismus",
            "patri k realismu",
            "patří k realismu",
            "typizace vsedniho",
          ],
          "Máj je stěžejní dílo českého romantismu (Mácha), ne realismu.",
        ),
        inacc(
          "maj-erben",
          "Připisuje Máj Erbenovi",
          ["erben", "kytice napsal"],
          "Máj napsal K. H. Mácha; Erben je autor Kytice.",
        ),
      ],
      excellentAnswer:
        "Máj je romantický: subjektivní citový svět, výjimečný hrdina Vilém v konfliktu se společností a trestem, příroda zrcadlí city a náladu, forma je lyrickoepická — typické romantické rysy Máchovy poezie.",
      minRequiredHits: 3,
      tags: ["maj", "romantismus"],
    },
    {
      id: id("p:proc-realismus-balzac"),
      slug: "proc-realismus-balzac",
      prompt:
        "Vysvětli vlastními slovy, proč patří Otec Goriot k realismu (ne k romantismu).",
      checklist: [
        item(
          "g-typ",
          "typizace postav / prostředí pařížské společnosti",
          ["typizace", "spolecnost", "pariz", "paříž", "prostredi"],
          kuRealTyp,
        ),
        item(
          "g-soc",
          "sociální vztahy / peníze / status",
          ["socialni", "penize", "peníze", "status", "vztahy"],
          kuRealSoc,
        ),
        item(
          "g-obj",
          "pozorování soudobé reality (ne idealizace)",
          ["pozorovani", "realita", "soudoba", "idealizace", "objektiv"],
          kuRealObj,
        ),
        item(
          "g-balzac",
          "Balzac / Lidská komedie",
          ["balzac", "goriot", "lidska komedie", "lidská komedie"],
          kuBalzac,
          false,
        ),
      ],
      inaccuracies: [
        inacc(
          "goriot-romantismus",
          "Řadí Goriota k romantismu",
          ["romantismus", "romanticke dilo", "romantické dílo", "subjektivita maje"],
          "Otec Goriot je realistický román Balzaca — sociální typizace, ne romantický citový kult.",
        ),
      ],
      excellentAnswer:
        "Otec Goriot patří k realismu, protože typizuje pařížskou společnost, sleduje sociální vztahy, peníze a status a zobrazuje soudobou realitu bez romantické idealizace — součást Balzacovy Lidské komedie.",
      minRequiredHits: 3,
      tags: ["balzac", "realismus"],
    },
    {
      id: id("p:dickens-socialni"),
      slug: "dickens-socialni",
      prompt:
        "Vysvětli, čím je Dickensův realismus „sociální“ (např. Oliver Twist).",
      checklist: [
        item(
          "d-chud",
          "chudoba / sociální křivdy",
          ["chudoba", "krivdy", "krivda", "utlacovani", "sirotek"],
          kuDickens,
        ),
        item(
          "d-prost",
          "prostředí města / institucí",
          ["mesto", "město", "institut", "sirotinec", "prostredi"],
          kuRealSoc,
        ),
        item(
          "d-typ",
          "typizace postav a situace",
          ["typizace", "typicke", "postavy"],
          kuRealTyp,
        ),
        item(
          "d-oliver",
          "Oliver Twist / Dickens",
          ["oliver", "dickens", "twist"],
          kuOliver,
          false,
        ),
      ],
      inaccuracies: [
        inacc(
          "dickens-romantismus",
          "Zaměňuje Dickense s romantismem",
          ["romantismus", "subjektivita máchy", "máj"],
          "Dickens patří k sociálnímu realismu 19. století, ne k českému romantismu Máje.",
        ),
      ],
      excellentAnswer:
        "Dickensův realismus je sociální: ukazuje chudobu a křivdy, prostředí města a institucí (např. sirotčinec v Oliveru Twistovi) a typizuje postavy i situace soudobé společnosti.",
      minRequiredHits: 3,
      tags: ["dickens", "realismus"],
    },
  ];

  return parseTeachPack({
    id: id("pack:cjl-teach-back"),
    slug: "cjl-teach-back",
    title: "Teach It Back — ČJL vysvětlení",
    summary:
      "Vysvětli vlastními slovy (text nebo hlas). Hodnotíme checklist knowledge units — ne délku textu.",
    prompts,
    createdAt: now,
    updatedAt: now,
  });
}

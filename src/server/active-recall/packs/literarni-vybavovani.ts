import { deterministicUuid } from "@/server/curriculum/ids";
import type { RecallPack } from "@/domain/learning/active-recall";

const NS = "dammaturu.active-recall";

function id(key: string) {
  return deterministicUuid(NS, key);
}

function ku(key: string, title: string) {
  return { id: id(`ku:${key}`), title };
}

function kp(
  key: string,
  label: string,
  synonyms: string[],
  knowledgeUnit: { id: string; title: string },
) {
  return {
    id: id(`kp:${key}`),
    label,
    synonyms,
    knowledgeUnitId: knowledgeUnit.id,
    knowledgeUnitTitle: knowledgeUnit.title,
  };
}

/** Free-recall prompts for ČJL literary history — no choices. */
export function buildLiterarniVybavovaniPack(
  now = new Date().toISOString(),
): RecallPack {
  const kuRealObs = ku("realismus-pozorovani", "Realismus — pozorování reality");
  const kuRealTyp = ku("realismus-typizace", "Realismus — typizace");
  const kuRealSoc = ku("realismus-socialni", "Realismus — sociální prostředí");
  const kuRealObj = ku("realismus-objektivita", "Realismus — objektivita");
  const kuRealSou = ku("realismus-soudobost", "Realismus — soudobá společnost");

  const kuRomCit = ku("romantismus-cit", "Romantismus — cit a subjektivita");
  const kuRomInd = ku("romantismus-individualita", "Romantismus — individualita");
  const kuRomKon = ku(
    "romantismus-konflikt",
    "Romantismus — konflikt jedince a společnosti",
  );
  const kuRomPri = ku("romantismus-priroda", "Romantismus — příroda");
  const kuRomNar = ku("romantismus-minulost", "Romantismus — národní minulost");

  const kuNoObr = ku("no-obrana", "NO — obranná etapa");
  const kuNoUtok = ku("no-utok", "NO — útok / jazykový program");
  const kuNoRom = ku("no-romantismus", "NO — romantická etapa");

  const kuMajVina = ku("maj-vina", "Máj — vina");
  const kuMajCas = ku("maj-cas", "Máj — čas");
  const kuMajPri = ku("maj-priroda", "Máj — příroda");
  const kuMajLyr = ku("maj-forma", "Máj — lyrickoepická forma");

  const prompts = [
    {
      id: id("p:realismus-znaky"),
      slug: "realismus-znaky",
      prompt: "Vyjmenuj 5 hlavních znaků realismu.",
      minExpected: 5,
      keyPoints: [
        kp(
          "r-poz",
          "pozorování / věrné zobrazení reality",
          ["pozorovani", "zobrazeni reality", "věrné zobrazení", "realita"],
          kuRealObs,
        ),
        kp(
          "r-typ",
          "typizace postav a prostředí",
          ["typizace", "typicke postavy", "typické postavy"],
          kuRealTyp,
        ),
        kp(
          "r-soc",
          "důraz na sociální prostředí",
          ["socialni", "společenské prostředí", "prostredi"],
          kuRealSoc,
        ),
        kp(
          "r-obj",
          "objektivita / odstup vypravěče",
          ["objektivita", "objektivni", "odstup"],
          kuRealObj,
        ),
        kp(
          "r-sou",
          "soudobá společnost (ne idealizace)",
          ["soudoba", "soudobá", "bez idealizace", "idealizace"],
          kuRealSou,
        ),
      ],
      modelAnswer:
        "Realismus zobrazuje soudobou společnost věrně (pozorování), typizuje postavy a prostředí, zdůrazňuje sociální podmínky, drží objektivnější odstup a vyhýbá se romantické idealizaci.",
      tags: ["realismus"],
    },
    {
      id: id("p:romantismus-znaky"),
      slug: "romantismus-znaky",
      prompt: "Vyjmenuj hlavní znaky romantismu.",
      minExpected: 4,
      keyPoints: [
        kp(
          "rom-cit",
          "cit / subjektivita",
          ["cit", "subjektivita", "emoce", "pocit"],
          kuRomCit,
        ),
        kp(
          "rom-ind",
          "individualita / výjimečný hrdina",
          ["individualita", "jedinec", "hrdina", "vyjimecny"],
          kuRomInd,
        ),
        kp(
          "rom-kon",
          "konflikt jedince a společnosti",
          ["konflikt", "spolecnost", "proti spolecnosti"],
          kuRomKon,
        ),
        kp(
          "rom-pri",
          "příroda jako zrcadlo citu",
          ["priroda", "příroda"],
          kuRomPri,
        ),
        kp(
          "rom-nar",
          "národní minulost / historie",
          ["minulost", "historie", "narodni"],
          kuRomNar,
        ),
      ],
      modelAnswer:
        "Romantismus staví na citu a subjektivitě, individualitě (často výjimečný hrdina), konfliktu jedince se společností, přírodě a často i národní minulosti.",
      tags: ["romantismus"],
    },
    {
      id: id("p:no-etapy"),
      slug: "no-etapy",
      prompt: "Jaké jsou hlavní etapy Národního obrození?",
      minExpected: 3,
      keyPoints: [
        kp(
          "no-1",
          "obranná etapa",
          ["obranna", "obrana", "1. etapa", "prvni etapa"],
          kuNoObr,
        ),
        kp(
          "no-2",
          "útok / jazykový program",
          ["utok", "jazykovy program", "2. etapa", "druha etapa"],
          kuNoUtok,
        ),
        kp(
          "no-3",
          "romantismus (3. etapa)",
          ["romantismus", "3. etapa", "treti etapa", "romanticka"],
          kuNoRom,
        ),
      ],
      modelAnswer:
        "Národní obrození: 1) obranná etapa, 2) útok / jazykový program, 3) romantismus (cca do 1848).",
      tags: ["narodni-obrozeni"],
    },
    {
      id: id("p:maj-motivy"),
      slug: "maj-motivy",
      prompt: "Co patří k maturitnímu rozboru Máje? Uveď klíčové motivy/formu.",
      minExpected: 3,
      keyPoints: [
        kp("maj-v", "vina", ["vina", "viny"], kuMajVina),
        kp("maj-c", "čas / pomíjivost", ["cas", "casu", "pomijivost"], kuMajCas),
        kp(
          "maj-p",
          "příroda",
          ["priroda", "příroda", "maje"],
          kuMajPri,
        ),
        kp(
          "maj-f",
          "lyrickoepická báseň",
          ["lyrickoepicka", "lyricko-epicka", "lyricko epicka", "basen"],
          kuMajLyr,
        ),
      ],
      modelAnswer:
        "Máj je lyrickoepická báseň; klíčové motivy vina, čas/pomíjivost a příroda (májová krajina vs. tragédie).",
      tags: ["romantismus", "macha"],
    },
    {
      id: id("p:realismus-vs-romantismus"),
      slug: "realismus-vs-romantismus",
      prompt:
        "Jak se realismus liší od romantismu? Uveď aspoň 3 rozdíly vlastními slovy.",
      minExpected: 3,
      keyPoints: [
        kp(
          "diff-obj",
          "objektivita vs. subjektivita/cit",
          ["objektiv", "subjektiv", "cit vs", "misto citu"],
          kuRealObj,
        ),
        kp(
          "diff-soc",
          "soudobá společnost vs. výjimečný jedinec",
          ["soudoba", "spolecnost", "jedinec", "individual"],
          kuRealSou,
        ),
        kp(
          "diff-typ",
          "typizace vs. výjimečný hrdina",
          ["typizace", "hrdina", "vyjimecny"],
          kuRealTyp,
        ),
        kp(
          "diff-ideal",
          "bez idealizace vs. romantická idealizace",
          ["idealizace", "bez idealizace"],
          kuRealObs,
        ),
      ],
      modelAnswer:
        "Realismus jde k objektivnějšímu obrazu soudobé společnosti a typizaci; romantismus k citu, subjektivitě a konfliktu výjimečného jedince. Realismus oslabuje idealizaci.",
      tags: ["realismus", "romantismus"],
    },
  ];

  return {
    id: id("pack:literarni-vybavovani"),
    slug: "literarni-vybavovani",
    title: "Aktivní vybavování — literární historie",
    summary:
      "Piš nebo mluv — bez nabídek. Uvidíš zásahy, mezery, navíc a modelovou odpověď. Každý bod = knowledge unit.",
    prompts,
    createdAt: now,
    updatedAt: now,
  };
}

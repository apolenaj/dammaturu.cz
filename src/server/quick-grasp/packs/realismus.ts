import { deterministicUuid } from "@/server/curriculum/ids";
import {
  parseQuickGraspPack,
  type QuickGraspPack,
} from "@/domain/learning/quick-grasp";

const NS = "dammaturu.quick-grasp";

function id(key: string) {
  return deterministicUuid(NS, key);
}

/**
 * Realismus — Rychle pochopit
 * 6 mikrobloků (2–4 min) + 2 retrieval checkpointy = 8 kroků.
 */
export function buildRealismusQuickGrasp(
  now = new Date().toISOString(),
): QuickGraspPack {
  const pack = {
    id: id("pack:realismus"),
    slug: "realismus",
    title: "Realismus — Rychle pochopit",
    topicSlug: "realismus",
    curriculumSlug: "cjl-beta",
    summary:
      "Šest mikrobloků + dva retrieval checkpointy. Jedna myšlenka, jeden příklad, jedna otázka — bez scrollování textem.",
    steps: [
      {
        type: "micro" as const,
        id: id("realismus:co-je"),
        slug: "co-je-realismus",
        title: "Co je realismus",
        idea: "Realismus chce pravdivý, střízlivý obraz skutečnosti — bez idealizace a přikrášlení.",
        example:
          "Místo hrdiny-génia uvidíš běžného člověka v konkrétním sociálním prostředí (město, vesnice, práce).",
        check: {
          question: "Co realismus především odmítá?",
          choices: [
            "Idealizaci a přikrášlení reality",
            "Jakýkoli popis prostředí",
            "Zájem o člověka",
          ],
          correctIndex: 0,
          explanation: "Klíč je střízlivost a věrnost skutečnosti.",
        },
        estimatedSeconds: 150,
        knowledgeUnitIds: [],
      },
      {
        type: "micro" as const,
        id: id("realismus:proc"),
        slug: "proc-vznikl",
        title: "Proč vznikl",
        idea: "Vzniká jako reakce na romantismus a na společenské změny 19. století (průmysl, města, sociální otázky).",
        example:
          "Autor už nehledá únik do snu, ale ptá se: jak žijí lidé tady a teď?",
        check: {
          question: "Proč realismus vzniká?",
          choices: [
            "Jako reakce na romantismus a společenské změny",
            "Aby zrušil romány",
            "Jen jako módní dekorace",
          ],
          correctIndex: 0,
        },
        estimatedSeconds: 150,
        knowledgeUnitIds: [],
      },
      {
        type: "micro" as const,
        id: id("realismus:znaky"),
        slug: "znaky",
        title: "Znaky",
        idea: "Typické znaky: všední hrdina, detail prostředí, kauzalita, kritický pohled na společnost.",
        example:
          "Detail: popis bytu, práce, řeči postav — „důkaz“ o světě, ne ozdoba.",
        check: {
          question: "Který znak patří k realismu?",
          choices: [
            "Detailní prostředí + všední hrdina",
            "Jen magické motivy",
            "Hrdina mimo čas a prostor",
          ],
          correctIndex: 0,
        },
        estimatedSeconds: 180,
        knowledgeUnitIds: [],
      },
      {
        type: "checkpoint" as const,
        id: id("realismus:cp1"),
        title: "Retrieval checkpoint 1",
        estimatedSeconds: 120,
        knowledgeUnitIds: [],
        items: [
          {
            id: id("realismus:cp1:a"),
            prompt: "Jednou větou: co je realismus?",
            choices: [
              "Střízlivý obraz skutečnosti bez idealizace",
              "Únik do snů a exotiky",
              "Jen rýmovaná poezie",
            ],
            correctIndex: 0,
          },
          {
            id: id("realismus:cp1:b"),
            prompt: "Proti čemu se realismus vymezuje?",
            choices: [
              "Proti romantické idealizaci",
              "Proti jakékoli próze",
              "Proti popisu práce",
            ],
            correctIndex: 0,
          },
          {
            id: id("realismus:cp1:c"),
            prompt: "Co je typický hrdina realismu?",
            choices: [
              "Běžný člověk v sociálním kontextu",
              "Nadpozemský génius bez minulosti",
              "Jen allegorická postava",
            ],
            correctIndex: 0,
          },
        ],
      },
      {
        type: "micro" as const,
        id: id("realismus:kriticky"),
        slug: "kriticky-realismus",
        title: "Kritický realismus",
        idea: "Kritický realismus nejen zobrazuje, ale i kritizuje společenské křivdy a volá po nápravě.",
        example:
          "Román ukáže chudobu a pokrytectví — ne jako senzaci, ale jako problém k řešení.",
        check: {
          question: "Čím se kritický realismus liší od „čistého“ popisu?",
          choices: [
            "Angažovanou kritikou společnosti",
            "Více kouzelných motivů",
            "Odmítáním postav",
          ],
          correctIndex: 0,
        },
        estimatedSeconds: 180,
        knowledgeUnitIds: [],
      },
      {
        type: "micro" as const,
        id: id("realismus:naturalismus"),
        slug: "naturalismus",
        title: "Naturalismus",
        idea: "Naturalismus je krajní směr realismu: člověk jako výsledek dědičnosti a prostředí (determinismus).",
        example:
          "Postava „nemůže jinak“ — biologie a prostředí ji tlačí k osudu.",
        check: {
          question: "Co naturalismus zdůrazňuje?",
          choices: [
            "Dědičnost a vliv prostředí",
            "Svobodnou vůli bez omezení",
            "Jen ideální hrdiny",
          ],
          correctIndex: 0,
        },
        estimatedSeconds: 180,
        knowledgeUnitIds: [],
      },
      {
        type: "micro" as const,
        id: id("realismus:autori"),
        slug: "autori",
        title: "Autoři",
        idea: "Orientace: Francie (Balzac, Flaubert, Zola), Rusko (Tolstoj, Dostojevskij), Anglie (Dickens) — maturitní minimum jmen.",
        example:
          "Zola ≈ naturalismus; Dickens ≈ sociální realismus města; Dostojevskij ≈ psychologie + morálka.",
        check: {
          question: "Který autor se pojí s naturalismem?",
          choices: ["Émile Zola", "Karel Hynek Mácha", "Karel Jaromír Erben"],
          correctIndex: 0,
        },
        estimatedSeconds: 180,
        knowledgeUnitIds: [],
      },
      {
        type: "checkpoint" as const,
        id: id("realismus:cp2"),
        title: "Retrieval checkpoint 2",
        estimatedSeconds: 120,
        knowledgeUnitIds: [],
        items: [
          {
            id: id("realismus:cp2:a"),
            prompt: "Kritický realismus především…",
            choices: [
              "Kritizuje společenské křivdy",
              "Odmítá sociální témata",
              "Je totožný s romantismem",
            ],
            correctIndex: 0,
          },
          {
            id: id("realismus:cp2:b"),
            prompt: "Naturalismus = realismus + …",
            choices: [
              "Determinismus (dědičnost/prostředí)",
              "Jen rýmy",
              "Únik do snu",
            ],
            correctIndex: 0,
          },
          {
            id: id("realismus:cp2:c"),
            prompt: "Dickens typicky zobrazuje…",
            choices: [
              "Sociální realitu města",
              "Jen středověké legendy",
              "Jen přírodní lyriku",
            ],
            correctIndex: 0,
          },
        ],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  return parseQuickGraspPack(pack);
}

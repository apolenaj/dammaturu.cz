import { deterministicUuid } from "@/server/curriculum/ids";
import {
  parseStoryReconstructionPack,
  type ReconstructionStory,
  type StoryReconstructionPack,
} from "@/domain/learning/story-reconstruction";
import {
  assertVerbatimInSource,
  ensureVerbatimQaFact,
  getIngestedDocumentMeta,
  toReconstructionEvidence,
} from "@/server/story-reconstruction/bootstrap";

const NS = "dammaturu.story-reconstruction";

function sid(key: string) {
  return deterministicUuid(NS, key);
}

type StepDraft = {
  key: string;
  /** Exact SOURCE substring (evidence). */
  sourceStatement: string;
  /** Short beat shown on cards — must be substring of sourceStatement. */
  label: string;
};

type StoryDraft = {
  slug: string;
  title: string;
  workTitle: string;
  author: string;
  summary: string;
  filename: string;
  steps: StepDraft[];
};

const STORIES: StoryDraft[] = [
  {
    slug: "maj",
    title: "Máj — dějová linie",
    workTitle: "Máj",
    author: "Karel Hynek Mácha",
    summary: "Seřaď zpěvy a intermezza Máchova Máje.",
    filename: "Máj.docx",
    steps: [
      {
        key: "maj-1",
        label: "1. Zpěv: Popis krásné, májové přírody; Jarmila skočí do Jezera a utopí se.",
        sourceStatement:
          "1. Zpěv: Popis krásné, májové přírody; Jarmila skočí do Jezera a utopí se.",
      },
      {
        key: "maj-2",
        label: "2. Zpěv: Vilém ve vězení přemýšlí; necítí vinu; úvahy o vlastním životě",
        sourceStatement:
          "2. Zpěv: Vilém ve vězení přemýšlí; necítí vinu; úvahy o vlastním životě",
      },
      {
        key: "maj-3",
        label:
          "1. Intermezzo: Příroda společně s duchy připravuje Vilémův pohřeb a volají ho k sobě",
        sourceStatement:
          "1. Intermezzo: Příroda společně s duchy připravuje Vilémův pohřeb a volají ho k sobě",
      },
      {
        key: "maj-4",
        label: "3. Zpěv: Vilémova poprava; loučí se s přírodou, krajinou, vlastí",
        sourceStatement:
          "3. Zpěv: Vilémova poprava; loučí se s přírodou, krajinou, vlastí",
      },
      {
        key: "maj-5",
        label:
          "2. Intermezzo: Je již po smrti Viléma a duchové loupežníků po něm truchlí, truchlí i příroda",
        sourceStatement:
          "2. Intermezzo: Je již po smrti Viléma a duchové loupežníků po něm truchlí, truchlí i příroda",
      },
      {
        key: "maj-6",
        label:
          "4. Zpěv: Do vesnice se vrací poutník/sám autor; ztotožnění Máchy s dějem; „Hynku! Viléme! Jarmilo!“",
        sourceStatement:
          "4. Zpěv: Do vesnice se vrací poutník/sám autor; ztotožnění Máchy s dějem; „Hynku! Viléme! Jarmilo!“",
      },
      {
        key: "maj-7",
        label: "vystupuje ve 4. zpěvu, sám autor",
        sourceStatement: "vystupuje ve 4. zpěvu, sám autor",
      },
      {
        key: "maj-8",
        label: "zamyšlený, vrací se k Vilémovu popravišti",
        sourceStatement: "zamyšlený, vrací se k Vilémovu popravišti",
      },
    ],
  },
  {
    slug: "marysa",
    title: "Maryša — dějová linie",
    workTitle: "Maryša",
    author: "Alois a Vilém Mrštíkové",
    summary: "Seřaď klíčové události sociálního dramatu Maryša.",
    filename: "12. České drama 2. pol 19. stol.docx",
    steps: [
      {
        key: "marysa-1",
        label:
          "Mladá Maryša je dcerou bohatého sedláka Lízala, miluje však Francka, synka z chudé rodiny, který je právě odveden na vojnu do Brna.",
        sourceStatement:
          "Mladá Maryša je dcerou bohatého sedláka Lízala, miluje však Francka, synka z chudé rodiny, který je právě odveden na vojnu do Brna.",
      },
      {
        key: "marysa-2",
        label: "Přišel se za Maryšou rozloučit, ale Lízal ho vyžene.",
        sourceStatement:
          "Přišel se za Maryšou rozloučit, ale Lízal ho vyžene.",
      },
      {
        key: "marysa-3",
        label:
          "Má pro dceru vyhlédnutého jiného ženicha – bohatého mlynáře Vávru, vdovce se třemi dětmi.",
        sourceStatement:
          "Má pro dceru vyhlédnutého jiného ženicha – bohatého mlynáře Vávru, vdovce se třemi dětmi.",
      },
      {
        key: "marysa-4",
        label:
          "Přes Maryšin odpor a prosby přinutí Lízal za vydatné spolupráce své ženy a její tety, aby si Maryša Vávru vzala.",
        sourceStatement:
          "Přes Maryšin odpor a prosby přinutí Lízal za vydatné spolupráce své ženy a její tety, aby si Maryša Vávru vzala.",
      },
      {
        key: "marysa-5",
        label:
          "Manželství není šťastné, Vávra tráví více času v hospodě než doma, Maryšu i bije.",
        sourceStatement:
          "Manželství není šťastné, Vávra tráví více času v hospodě než doma, Maryšu i bije.",
      },
      {
        key: "marysa-6",
        label: "Po dvou letech se vrací Francek z vojny.",
        sourceStatement: "Po dvou letech se vrací Francek z vojny.",
      },
      {
        key: "marysa-7",
        label:
          "Přijde dokonce i do mlýna, kde se Maryšu snaží přesvědčit, aby s ním utekla do Brna.",
        sourceStatement:
          "Přijde dokonce i do mlýna, kde se Maryšu snaží přesvědčit, aby s ním utekla do Brna.",
      },
      {
        key: "marysa-8",
        label: "Otráví Vávru jedem nasypaným do kávy. K činu se přizná.",
        sourceStatement:
          "Otráví Vávru jedem nasypaným do kávy. K činu se přizná.",
      },
    ],
  },
  {
    slug: "otec-goriot",
    title: "Otec Goriot — dějová linie",
    workTitle: "Otec Goriot",
    author: "Honoré de Balzac",
    summary: "Seřaď osudy Goriota a Rastignaca.",
    filename: "2. Realismus ve Francii.docx",
    steps: [
      {
        key: "goriot-1",
        label:
          "Román zobrazuje dva zdánlivě protichůdné osudy lidí, kteří se náhodou ocitnou ve stejném penzionu.",
        sourceStatement:
          "Román zobrazuje dva zdánlivě protichůdné osudy lidí, kteří se náhodou ocitnou ve stejném penzionu.",
      },
      {
        key: "goriot-2",
        label:
          "Jde o příběh Goriota, bývalého obchodníka s nudlemi, a Evžena Rastignaca, mladého studenta práv.",
        sourceStatement:
          "Jde o příběh Goriota, bývalého obchodníka s nudlemi, a Evžena Rastignaca, mladého studenta práv.",
      },
      {
        key: "goriot-3",
        label:
          "Goriot je otcem dvou dcer, které se snaží dostat se do vznešené pařížské společnosti, k čemuž jim má dopomoci otcův majetek.",
        sourceStatement:
          "Goriot je otcem dvou dcer, které se snaží dostat se do vznešené pařížské společnosti, k čemuž jim má dopomoci otcův majetek.",
      },
      {
        key: "goriot-4",
        label:
          "První dcera Anastázie si vezme hraběte, druhá dcera Delfina bankéře.",
        sourceStatement:
          "První dcera Anastázie si vezme hraběte, druhá dcera Delfina bankéře.",
      },
      {
        key: "goriot-5",
        label:
          "Ač jsou obě bohatě provdány, z otce jen vydírají peníze a stydí se za něj.",
        sourceStatement:
          "Ač jsou obě bohatě provdány, z otce jen vydírají peníze a stydí se za něj.",
      },
      {
        key: "goriot-6",
        label: "Ten umírá v chudobě, opuštěn a opovrhován okolím.",
        sourceStatement: "Ten umírá v chudobě, opuštěn a opovrhován okolím.",
      },
      {
        key: "goriot-7",
        label:
          "Student Rastignac je zpočátku obětavý a stará se o umírajícího Goriota.",
        sourceStatement:
          "Student Rastignac je zpočátku obětavý a stará se o umírajícího Goriota.",
      },
      {
        key: "goriot-8",
        label:
          "Později pod vlivem prostředí se mění a ze zištných důvodů se stává milencem jedné z Goriotových dcer.",
        sourceStatement:
          "Později pod vlivem prostředí se mění a ze zištných důvodů se stává milencem jedné z Goriotových dcer.",
      },
    ],
  },
  {
    slug: "zlocin-a-trest",
    title: "Zločin a trest — dějová linie",
    workTitle: "Zločin a trest",
    author: "F. M. Dostojevskij",
    summary: "Seřaď klíčové události Raskolnikovova příběhu.",
    filename: "3. Realismus v Rusku.docx",
    steps: [
      {
        key: "zt-1",
        label:
          "Raskolnikov, chudý student z Petrohradu, aby získal peníze, se rozhodne zabít starou lichvářku.",
        sourceStatement:
          "Raskolnikov, chudý student z Petrohradu, aby získal peníze, se rozhodne zabít starou lichvářku.",
      },
      {
        key: "zt-2",
        label:
          "Během zločinu se náhodně v bytě objeví i její setra, kterou taktéž zavraždí.",
        sourceStatement:
          "Během zločinu se náhodně v bytě objeví i její setra, kterou taktéž zavraždí.",
      },
      {
        key: "zt-3",
        label: "Zahladí veškeré stopy.",
        sourceStatement: "Zahladí veškeré stopy.",
      },
      {
        key: "zt-4",
        label:
          "Snaží se svůj čin racionálně zdůvodnit, ale dostává se do těžké psychické krize.",
        sourceStatement:
          "Snaží se svůj čin racionálně zdůvodnit, ale dostává se do těžké psychické krize.",
      },
      {
        key: "zt-5",
        label:
          "Zamiluje se do Soni, která svou rodinu živí prostitucí.",
        sourceStatement:
          "Zamiluje se do Soni, která svou rodinu živí prostitucí.",
      },
      {
        key: "zt-6",
        label:
          "Postupem času nachází v sobě sílu a přizná se jí ke spáchanému zločinu.",
        sourceStatement:
          "Postupem času nachází v sobě sílu a přizná se jí ke spáchanému zločinu.",
      },
      {
        key: "zt-7",
        label:
          "Raskolnikov se jde udat, je odsouzen na nucené práce na Sibiř a Soňa jej dobrovolně doprovází.",
        sourceStatement:
          "Raskolnikov se jde udat, je odsouzen na nucené práce na Sibiř a Soňa jej dobrovolně doprovází.",
      },
      {
        key: "zt-8",
        label:
          "Nesobecká láska způsobí postupný duševní přerod hlavního hrdiny.",
        sourceStatement:
          "Nesobecká láska způsobí postupný duševní přerod hlavního hrdiny.",
      },
    ],
  },
  {
    slug: "anna-karenina",
    title: "Anna Karenina — dějová linie",
    workTitle: "Anna Karenina",
    author: "Lev N. Tolstoj",
    summary: "Seřaď klíčové milostné a společenské obraty Anny Kareniny.",
    filename: "3. Realismus v Rusku.docx",
    steps: [
      {
        key: "ak-1",
        label:
          "zachycuje osudy ruské šlechtičny Anny Kareniny, která přijíždí z Petrohradu do Moskvy, aby zachránila rozpadající se manželství svého bratra.",
        sourceStatement:
          "zachycuje osudy ruské šlechtičny Anny Kareniny, která přijíždí z Petrohradu do Moskvy, aby zachránila rozpadající se manželství svého bratra.",
      },
      {
        key: "ak-2",
        label:
          "I krátké setkání vdané Anny a Vronského na plese však vznítí vášeň lásky.",
        sourceStatement:
          "I krátké setkání vdané Anny a Vronského na plese však vznítí vášeň lásky.",
      },
      {
        key: "ak-3",
        label:
          "Kitty, zlomena nešťastnou láskou k Vronskému, odjíždí do ciziny.",
        sourceStatement:
          "Kitty, zlomena nešťastnou láskou k Vronskému, odjíždí do ciziny.",
      },
      {
        key: "ak-4",
        label:
          "Ten ji však pronásleduje a Anna se nakonec poddává.",
        sourceStatement:
          "Ten ji však pronásleduje a Anna se nakonec poddává.",
      },
      {
        key: "ak-5",
        label:
          "Po zjištění těhotenství se Anna vyzpovídá manželovi a opustí jej.",
        sourceStatement:
          "Po zjištění těhotenství se Anna vyzpovídá manželovi a opustí jej.",
      },
      {
        key: "ak-6",
        label:
          "Po těžkém porodu Anna odjíždí s Vronským do ciziny",
        sourceStatement:
          "Po těžkém porodu Anna odjíždí s Vronským do ciziny",
      },
      {
        key: "ak-7",
        label:
          "Po svatbě žijí šťastně na venkově.",
        sourceStatement: "Po svatbě žijí šťastně na venkově.",
      },
      {
        key: "ak-8",
        label:
          "Anna nakonec nevidí jiné východisko a rozhodne se svůj život ukončit skokem pod vlak.",
        sourceStatement:
          "Anna nakonec nevidí jiné východisko a rozhodne se svůj život ukončit skokem pod vlak.",
      },
    ],
  },
  {
    slug: "kytice-vodnik",
    title: "Kytice — Vodník",
    workTitle: "Vodník (Kytice)",
    author: "K. J. Erben",
    summary: "Seřaď děj balady Vodník.",
    filename: "Kytice.docx",
    steps: [
      {
        key: "vodnik-1",
        label: "Dcera šla k jezeru a vodník ji stáhl pod hladinu.",
        sourceStatement: "Dcera šla k jezeru a vodník ji stáhl pod hladinu.",
      },
      {
        key: "vodnik-2",
        label: "Měli spolu dítě.",
        sourceStatement: "Měli spolu dítě.",
      },
      {
        key: "vodnik-3",
        label: "Prosila ho, aby se mohla jít ještě rozloučit s matkou.",
        sourceStatement:
          "Prosila ho, aby se mohla jít ještě rozloučit s matkou.",
      },
      {
        key: "vodnik-4",
        label:
          "Přemluvila ho, on si však nechal u sebe jako pojistku jejich dítě a řekl jí, ať se vrátí do půlnoci.",
        sourceStatement:
          "Přemluvila ho, on si však nechal u sebe jako pojistku jejich dítě a řekl jí, ať se vrátí do půlnoci.",
      },
      {
        key: "vodnik-5",
        label: "Půlnoc odbila a vodník bouchal na dveře.",
        sourceStatement: "Půlnoc odbila a vodník bouchal na dveře.",
      },
      {
        key: "vodnik-6",
        label: "Matka však svou dceru držela uvnitř.",
        sourceStatement: "Matka však svou dceru držela uvnitř.",
      },
      {
        key: "vodnik-7",
        label:
          "Zpoza dveří se ozval řev dítěte, pak najednou utichl a něco spadlo.",
        sourceStatement:
          "Zpoza dveří se ozval řev dítěte, pak najednou utichl a něco spadlo.",
      },
      {
        key: "vodnik-8",
        label:
          "Matka otevřela dveře a na zemi viděla tělíčko bez hlavy a hlavu bez tělíčka.",
        sourceStatement:
          "Matka otevřela dveře a na zemi viděla tělíčko bez hlavy a hlavu bez tělíčka.",
      },
    ],
  },
  {
    slug: "kytice-svatebni-kosile",
    title: "Kytice — Svatební košile",
    workTitle: "Svatební košile (Kytice)",
    author: "K. J. Erben",
    summary: "Seřaď děj balady Svatební košile.",
    filename: "Kytice.docx",
    steps: [
      {
        key: "sk-1",
        label: "Dívka se modlí, aby se už její milý vrátil z ciziny.",
        sourceStatement:
          "Dívka se modlí, aby se už její milý vrátil z ciziny.",
      },
      {
        key: "sk-2",
        label:
          "V noci klepe její milý na okno a říká, ať s ním jde, že se stane jeho ženou.",
        sourceStatement:
          "V noci klepe její milý na okno a říká, ať s ním jde, že se stane jeho ženou.",
      },
      {
        key: "sk-3",
        label:
          "Jdou lesem a postupně jí milý zahazuje její modlitební knížky, růženec a křížek.",
        sourceStatement:
          "Jdou lesem a postupně jí milý zahazuje její modlitební knížky, růženec a křížek.",
      },
      {
        key: "sk-4",
        label:
          "Přivedl ji na hřbitov, pochopila, že on už je taky mrtvý.",
        sourceStatement:
          "Přivedl ji na hřbitov, pochopila, že on už je taky mrtvý.",
      },
      {
        key: "sk-5",
        label: "Běžela se schovat. Modlila se.",
        sourceStatement: "Běžela se schovat. Modlila se.",
      },
      {
        key: "sk-6",
        label: "Ráno zakokrhal kohout a vše ustalo.",
        sourceStatement: "Ráno zakokrhal kohout a vše ustalo.",
      },
      {
        key: "sk-7",
        label: "Na každém hrobě byl útržek z košile.",
        sourceStatement: "Na každém hrobě byl útržek z košile.",
      },
      {
        key: "sk-8",
        label: "Rodiče i sourozenci už byli po smrti.",
        sourceStatement: "Rodiče i sourozenci už byli po smrti.",
      },
    ],
  },
  {
    slug: "kytice-zlaty-kolovrat",
    title: "Kytice — Zlatý kolovrat",
    workTitle: "Zlatý kolovrat (Kytice)",
    author: "K. J. Erben",
    summary: "Seřaď děj balady Zlatý kolovrat.",
    filename: "Kytice.docx",
    steps: [
      {
        key: "zk-1",
        label:
          "Král si chce vzít za ženu Dorničku, nevlastní dceru staré babice.",
        sourceStatement:
          "Král si chce vzít za ženu Dorničku, nevlastní dceru staré babice.",
      },
      {
        key: "zk-2",
        label:
          "V lese ji ale zabijí, useknou jí hnáty a vypíchnou oči.",
        sourceStatement:
          "V lese ji ale zabijí, useknou jí hnáty a vypíchnou oči.",
      },
      {
        key: "zk-3",
        label:
          "Matka pak vydává svoji vlastní dceru za Dorničku (byly si podobné).",
        sourceStatement:
          "Matka pak vydává svoji vlastní dceru za Dorničku (byly si podobné).",
      },
      {
        key: "zk-4",
        label: "Konala se svatba. Král musel odjet.",
        sourceStatement: "Konala se svatba. Král musel odjet.",
      },
      {
        key: "zk-5",
        label:
          "Vlastní dcera si koupila od chlapce zlatý kolovrat za nohy, přeslici za ruce a kužel za oči.",
        sourceStatement:
          "Vlastní dcera si koupila od chlapce zlatý kolovrat za nohy, přeslici za ruce a kužel za oči.",
      },
      {
        key: "zk-6",
        label:
          "Stařeček pak hnáty a oči vrátil Dorničce a pomocí živé vody tělo opět srostlo.",
        sourceStatement:
          "Stařeček pak hnáty a oči vrátil Dorničce a pomocí živé vody tělo opět srostlo.",
      },
      {
        key: "zk-7",
        label:
          "Když začala příst, kolovrat řekl pravdu o mordu.",
        sourceStatement:
          "Když začala příst, kolovrat řekl pravdu o mordu.",
      },
      {
        key: "zk-8",
        label:
          "Babice i s dcerou našly v hlubokém lese to, co samy udělaly Dorničce. Vlci je roztrhali.",
        sourceStatement:
          "Babice i s dcerou našly v hlubokém lese to, co samy udělaly Dorničce. Vlci je roztrhali.",
      },
    ],
  },
  {
    slug: "kytice-polednice",
    title: "Kytice — Polednice",
    workTitle: "Polednice (Kytice)",
    author: "K. J. Erben",
    summary: "Seřaď děj balady Polednice.",
    filename: "Kytice.docx",
    steps: [
      {
        key: "pol-1",
        label: "Matka zavolala na své nezbedné dítě polednici.",
        sourceStatement: "Matka zavolala na své nezbedné dítě polednici.",
      },
      {
        key: "pol-2",
        label: "Když polednice skutečně přišla,",
        sourceStatement:
          "Když polednice skutečně přišla, matka své dítě bránila, tiskla ho k sobě tak silně, až ho zadusila.",
      },
      {
        key: "pol-3",
        label: "matka své dítě bránila,",
        sourceStatement:
          "Když polednice skutečně přišla, matka své dítě bránila, tiskla ho k sobě tak silně, až ho zadusila.",
      },
      {
        key: "pol-4",
        label: "tiskla ho k sobě tak silně, až ho zadusila.",
        sourceStatement:
          "Když polednice skutečně přišla, matka své dítě bránila, tiskla ho k sobě tak silně, až ho zadusila.",
      },
    ],
  },
  {
    slug: "kytice-poklad",
    title: "Kytice — Poklad",
    workTitle: "Poklad (Kytice)",
    author: "K. J. Erben",
    summary: "Seřaď děj balady Poklad.",
    filename: "Kytice.docx",
    steps: [
      {
        key: "pok-1",
        label: "Žena šla na Velký pátek ke kostelíčku.",
        sourceStatement: "Žena šla na Velký pátek ke kostelíčku.",
      },
      {
        key: "pok-2",
        label: "najednou byla otevřená skála.",
        sourceStatement:
          "Na cestě, kde vždy stával kámen, najednou byla otevřená skála.",
      },
      {
        key: "pok-3",
        label: "Žena uvnitř našla stříbro, zlato.",
        sourceStatement: "Žena uvnitř našla stříbro, zlato.",
      },
      {
        key: "pok-4",
        label: "Odnesla si ho domů a dítě nechala ve skále.",
        sourceStatement: "Odnesla si ho domů a dítě nechala ve skále.",
      },
      {
        key: "pok-5",
        label: "Skála zmizela.",
        sourceStatement: "Skála zmizela.",
      },
      {
        key: "pok-6",
        label: "Zlato a stříbro se proměnilo v hlínu a kamení.",
        sourceStatement: "Zlato a stříbro se proměnilo v hlínu a kamení.",
      },
      {
        key: "pok-7",
        label: "Za rok, na Velký pátek, se skála znovu objevila.",
        sourceStatement: "Za rok, na Velký pátek, se skála znovu objevila.",
      },
      {
        key: "pok-8",
        label: "Žena vešla dovnitř, popadla své dítě a utíkala pryč.",
        sourceStatement: "Žena vešla dovnitř, popadla své dítě a utíkala pryč.",
      },
    ],
  },
];

/** Svatební košile step 8 is chronologically early — fix order to be plot-correct. */
function fixSvatebniOrder(draft: StoryDraft): StoryDraft {
  if (draft.slug !== "kytice-svatebni-kosile") return draft;
  // Reorder: parents dead (context) first, then prayer, knock, forest, cemetery...
  const byKey = Object.fromEntries(draft.steps.map((s) => [s.key, s]));
  return {
    ...draft,
    steps: [
      byKey["sk-8"]!, // Rodiče i sourozenci už byli po smrti
      byKey["sk-1"]!,
      byKey["sk-2"]!,
      byKey["sk-3"]!,
      byKey["sk-4"]!,
      byKey["sk-5"]!,
      byKey["sk-6"]!,
      byKey["sk-7"]!,
    ],
  };
}

export async function buildLiterarniDejPack(
  nowIso = new Date().toISOString(),
): Promise<StoryReconstructionPack> {
  const evidence: StoryReconstructionPack["evidence"] = {};
  const stories: ReconstructionStory[] = [];

  for (const raw of STORIES.map(fixSvatebniOrder)) {
    const meta = await getIngestedDocumentMeta(raw.filename);
    const steps = [];
    for (let i = 0; i < raw.steps.length; i += 1) {
      const draft = raw.steps[i]!;
      if (!draft.sourceStatement.includes(draft.label)) {
        throw new Error(
          `${raw.slug}/${draft.key}: label musí být substring sourceStatement`,
        );
      }
      assertVerbatimInSource(
        meta.plainText,
        draft.sourceStatement,
        `${raw.slug}/${draft.key}`,
      );
      const item = await ensureVerbatimQaFact({
        key: draft.key,
        documentId: meta.documentId,
        filename: meta.filename,
        sourceStatement: draft.sourceStatement,
        title: `${raw.workTitle} · krok ${i + 1}`,
      });
      const mapped = toReconstructionEvidence(draft.key, item);
      evidence[mapped.id] = mapped.evidence;
      steps.push({
        id: sid(`step:${draft.key}`),
        order: i,
        label: draft.label,
        evidenceId: mapped.id,
      });
    }
    stories.push({
      id: sid(`story:${raw.slug}`),
      slug: raw.slug,
      title: raw.title,
      workTitle: raw.workTitle,
      author: raw.author,
      summary: raw.summary,
      steps,
    });
  }

  const pack: StoryReconstructionPack = {
    id: sid("pack:literarni-dej"),
    slug: "literarni-dej",
    title: "Story Reconstruction — literární děj",
    summary:
      "Seřaď zamíchané dějové události (Máj, Maryša, Otec Goriot, Zločin a trest, Anna Karenina, Kytice). Easy 4 · medium 6 · hard 8+. Po úspěchu vizuální dějová osa. Každý krok = verified SOURCE.",
    requiresVerifiedOnly: true,
    stories,
    evidence,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return parseStoryReconstructionPack(pack);
}

import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppPageHeader } from "@/components/shell/app-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { computeQuickGraspStats } from "@/domain/learning/quick-grasp";
import { getCurrentLearnerAction } from "@/server/actions/onboarding";
import { listLessons } from "@/server/lesson-engine/store";
import { listRecallPacks } from "@/server/active-recall/store";
import { listTeachPacks } from "@/server/teach-it-back/store";
import { listConnectionMapPacks } from "@/server/connection-map/store";
import { listKdoJsemPacks } from "@/server/kdo-jsem/store";
import { listMatchArenaPacks } from "@/server/match-arena/store";
import { listStoryReconstructionPacks } from "@/server/story-reconstruction/store";
import { listNonsensePacks } from "@/server/najdi-nesmysl/store";
import { listSpeedRoundPacks } from "@/server/speed-round/store";
import { listQuickGraspPacks } from "@/server/quick-grasp/store";
import { listStoryPacks } from "@/server/story-mode/store";
import { listTimelinePacks } from "@/server/timeline/store";
import { listLiteraryWorks } from "@/server/literary-work/store";
import { toLiteraryWorkListItem } from "@/domain/learning/literary-work";
import { getKyticeExperiencePack } from "@/server/kytice-experience/store";
import { getMajExamPrepPack } from "@/server/maj-exam-prep/store";
import { getBabickaExperiencePack } from "@/server/babicka-experience/store";

export const metadata: Metadata = { title: "Učit se" };
export const dynamic = "force-dynamic";

const MATURITA_TOOLS = [
  {
    href: "/app/literature",
    title: "Literatura k ústní",
    hint: "Karty knih, mastery, losování.",
  },
  {
    href: "/app/topics",
    title: "Témata kurikula",
    hint: "Moduly ČJL podle exam relevance.",
  },
  {
    href: "/app/cermat",
    title: "CERMAT ČJL",
    hint: "Didaktický trénink po kategoriích.",
  },
  {
    href: "/app/zachran-me",
    title: "Zachraň mě",
    hint: "Nouzový plán, když zbývá málo času.",
  },
] as const;

export default async function LearnPage() {
  const [
    lessons,
    packs,
    stories,
    timelines,
    maps,
    recalls,
    teachPacks,
    games,
    arenas,
    reconstructions,
    nonsensePacks,
    speedPacks,
    literaryWorks,
    kyticePack,
    majPack,
    babickaPack,
    learner,
  ] = await Promise.all([
      listLessons(),
      listQuickGraspPacks(),
      listStoryPacks(),
      listTimelinePacks(),
      listConnectionMapPacks(),
      listRecallPacks(),
      listTeachPacks(),
      listKdoJsemPacks(),
      listMatchArenaPacks(),
      listStoryReconstructionPacks(),
      listNonsensePacks(),
      listSpeedRoundPacks(),
      listLiteraryWorks(),
      getKyticeExperiencePack(),
      getMajExamPrepPack(),
      getBabickaExperiencePack(),
      getCurrentLearnerAction(),
    ]);

  const workItems = literaryWorks.map(toLiteraryWorkListItem);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <AppPageHeader
        title="Učit se"
        purpose="Vyber jeden režim a jdi do hloubky. Maturitní nástroje jsou dole — ne v hlavní navigaci."
        primaryAction={{
          label: "Studium z mých materiálů",
          href: "/app/materials/study",
        }}
        secondaryAction={{
          label: "Zpět na Dnes",
          href: "/app/dashboard",
        }}
      />

      {!learner ? (
        <EmptyState
          title="Nejdřív onboarding"
          description="Bez profilu neumíme ukládat completion a úspěšnost."
          actionLabel="Dokončit onboarding"
          actionHref="/onboarding"
        />
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Maturitní nástroje
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Literatura, témata, CERMAT a nouzový plán — všechno odtud, ať chrome
          zůstane čistý.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {MATURITA_TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="block rounded-xl border border-border bg-surface px-4 py-3 transition hover:border-action/50"
              >
                <p className="font-semibold text-fg">{tool.title}</p>
                <p className="text-caption text-fg-muted">{tool.hint}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Učit se z mých materiálů
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Otázky, vysvětlení a hodnocení jen z toho, co jsi nahrál — s citací a
          jistotou. Když podklad chybí, řekneme to rovnou.
        </p>
        <Link
          href="/app/materials/study"
          className="block rounded-xl border border-border bg-surface p-4 shadow-xs transition hover:border-action/50"
        >
          <p className="font-semibold text-fg">Spustit studium z materiálů</p>
          <p className="mt-1 text-caption text-fg-muted">
            Ověřeno ze zdroje · Pravděpodobné · Vyžaduje kontrolu · Zobrazit
            zdroj
          </p>
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Rychle pochopit
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Mikrobloky 2–5 min (1 myšlenka, 1 příklad, 1 otázka) + retrieval
          checkpoint. Žádné scrollování dlouhým textem.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Literární díla
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Rozbor se stejnými taby (Rychle pochopit → Ústní). Generické schema —
          Máj, Kytice, Babička.
        </p>
        {workItems.length === 0 ? (
          <Card>
            <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
            </CardDescription>
          </Card>
        ) : (
          workItems.map((w) => (
            <Card key={w.slug}>
              <CardHeader>
                <CardTitle>
                  <Link href={w.href} className="hover:text-action">
                    {w.title}
                  </Link>
                </CardTitle>
                <CardDescription className="mt-1">
                  {w.author}
                  {w.yearPublished ? ` · ${w.yearPublished}` : ""} · {w.summary}
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
        <Link
          href="/app/learn/dilo"
          className="text-body-sm font-semibold text-action hover:underline"
        >
          Všechna díla →
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Speciály — Máj, Kytice, Babička
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Aktivní experience ze SOURCE / verified KU — karty, hry, oral.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>
              <Link href="/app/learn/maj" className="hover:text-action">
                {majPack?.title ?? "Máj — exam prep"}
              </Link>
            </CardTitle>
            <CardDescription className="mt-1">
              {majPack
                ? `${majPack.knowledgeUnits.length} KU · 7 aktivit · chybějící KU po simulaci`
                : "Obsah se připravuje — zkus jinou aktivitu."}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <Link href="/app/learn/kytice" className="hover:text-action">
                {kyticePack?.title ?? "Kytice — 13 balad"}
              </Link>
            </CardTitle>
            <CardDescription className="mt-1">
              {kyticePack
                ? `${kyticePack.ballads.length} balad · verified KU`
                : "Obsah se připravuje — zkus jinou aktivitu."}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <Link href="/app/learn/babicka" className="hover:text-action">
                {babickaPack?.title ?? "Babička — experience"}
              </Link>
            </CardTitle>
            <CardDescription className="mt-1">
              {babickaPack
                ? `${babickaPack.knowledgeUnits.length} KU · 6 aktivit · karty / T/F / realismus`
                : "Obsah se připravuje — zkus jinou aktivitu."}
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Speed Round
        </h2>
        <p className="text-body-sm text-fg-secondary">
          60 sekund základních faktů — autor→dílo, pojem→definice, true/false,
          směr→vlastnost. Score, accuracy, streak, response time.
        </p>
        {speedPacks.length === 0 ? (
          <Card>
            <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
            </CardDescription>
          </Card>
        ) : (
          speedPacks.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>
                      <Link
                        href={`/app/learn/speed-round/${s.slug}`}
                        className="hover:text-action"
                      >
                        {s.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {s.summary}
                    </CardDescription>
                    <p className="mt-2 text-caption text-fg-muted">
                      {s.questions.length} otázek · {s.durationMs / 1000} s
                    </p>
                  </div>
                  <Badge tone="warning">60 s</Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Najdi nesmysl
        </h2>
        <p className="text-body-sm text-fg-secondary">
          4 tvrzení · 3 pravda · 1 nesmysl. Odhal chybu, napiš proč, pak
          korektivní vysvětlení (autoři, díla, období, směry, postavy, žánry).
        </p>
        {nonsensePacks.length === 0 ? (
          <Card>
            <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
            </CardDescription>
          </Card>
        ) : (
          nonsensePacks.map((n) => (
            <Card key={n.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>
                      <Link
                        href={`/app/learn/najdi-nesmysl/${n.slug}`}
                        className="hover:text-action"
                      >
                        {n.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {n.summary}
                    </CardDescription>
                    <p className="mt-2 text-caption text-fg-muted">
                      {n.rounds.length} kol
                    </p>
                  </div>
                  <Badge tone="warning">Hra</Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Story Reconstruction
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Seřaď zamíchané dějové události (easy 4 · medium 6 · hard 8+). Po
          úspěchu vizuální dějová osa. Každý krok ze SOURCE.
        </p>
        {reconstructions.length === 0 ? (
          <Card>
            <CardDescription>
              Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se
              vrať později.
            </CardDescription>
          </Card>
        ) : (
          reconstructions.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>
                      <Link
                        href={`/app/learn/rekonstrukce-pribehu/${r.slug}`}
                        className="hover:text-action"
                      >
                        {r.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {r.summary}
                    </CardDescription>
                    <p className="mt-2 text-caption text-fg-muted">
                      {r.stories.length} příběhů ·{" "}
                      {Object.keys(r.evidence).length} verified kroků
                    </p>
                  </div>
                  <Badge tone="warning">Challenge</Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Match Arena
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Spojuj páry (autor↔dílo, dílo↔postava…). Desktop drag/drop, mobil
          klepnutí. Po chybě vysvětlení; slabé páry do review queue.
        </p>
        {arenas.length === 0 ? (
          <Card>
            <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
            </CardDescription>
          </Card>
        ) : (
          arenas.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>
                      <Link
                        href={`/app/learn/match-arena/${a.slug}`}
                        className="hover:text-action"
                      >
                        {a.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {a.summary}
                    </CardDescription>
                    <p className="mt-2 text-caption text-fg-muted">
                      {a.pairs.length} párů · {a.rounds.length} kol
                    </p>
                  </div>
                  <Badge tone="warning">Hra</Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Kdo jsem?
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Herní tipovačka — postupné nápovědy z ověřených SOURCE faktů. Víc bodů
          za dřívější tip.
        </p>
        {games.length === 0 ? (
          <Card>
            <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
            </CardDescription>
          </Card>
        ) : (
          games.map((g) => (
            <Card key={g.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>
                      <Link
                        href={`/app/learn/kdo-jsem/${g.slug}`}
                        className="hover:text-action"
                      >
                        {g.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {g.summary}
                    </CardDescription>
                    <p className="mt-2 text-caption text-fg-muted">
                      {g.mysteries.length} osobností ·{" "}
                      {Object.keys(g.evidence).length} verified faktů
                    </p>
                  </div>
                  <Badge tone="warning">Hra</Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Aktivní vybavování
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Bez nabídek — napiš nebo namluv. Uvidíš zásahy, mezery, navíc a KU
          mapování (částečná znalost ≠ špatně).
        </p>
        {recalls.length === 0 ? (
          <Card>
            <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
            </CardDescription>
          </Card>
        ) : (
          recalls.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>
                      <Link
                        href={`/app/learn/vybavovani/${r.slug}`}
                        className="hover:text-action"
                      >
                        {r.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {r.summary}
                    </CardDescription>
                    <p className="mt-2 text-caption text-fg-muted">
                      {r.prompts.length} výzev ·{" "}
                      {r.prompts.reduce((n, p) => n + p.keyPoints.length, 0)} KU
                    </p>
                  </div>
                  <Badge tone="accent">Recall</Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Teach It Back
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Vysvětli vlastními slovy (text nebo hlas). Feedback: co bylo dobře, co
          chybí, co je nepřesné, výborná odpověď — ne odměna za délku.
        </p>
        {teachPacks.length === 0 ? (
          <Card>
            <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
            </CardDescription>
          </Card>
        ) : (
          teachPacks.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>
                      <Link
                        href={`/app/learn/nauc-zpatky/${t.slug}`}
                        className="hover:text-action"
                      >
                        {t.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {t.summary}
                    </CardDescription>
                    <p className="mt-2 text-caption text-fg-muted">
                      {t.prompts.length} výzev ·{" "}
                      {t.prompts.reduce((n, p) => n + p.checklist.length, 0)}{" "}
                      checklist KU
                    </p>
                  </div>
                  <Badge tone="brand">Teach back</Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Flashcards
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Typed karty + chytré opakování. Odpověz v hlavě, ohodnoť — appka ví,
          co začínáš zapomínat.
        </p>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>
                  <Link href="/app/review" className="hover:text-action">
                    Otevřít Opakovat
                  </Link>
                </CardTitle>
                <CardDescription className="mt-1">
                  Session engine: 8 typů, keyboard, swipe, summary.
                </CardDescription>
              </div>
              <Badge tone="brand">SRS</Badge>
            </div>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Časová osa
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Interaktivní timeline: zoom, filtr autor/dílo/událost/směr, detail,
          chrono quiz, reorder. Přepni Učit se / Seřadit sám.
        </p>
        {timelines.length === 0 ? (
          <Card>
            <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
            </CardDescription>
          </Card>
        ) : (
          timelines.map((tl) => (
            <Card key={tl.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>
                      <Link
                        href={`/app/learn/casova-osa/${tl.slug}`}
                        className="hover:text-action"
                      >
                        {tl.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {tl.summary}
                    </CardDescription>
                    <p className="mt-2 text-caption text-fg-muted">
                      {tl.events.length} položek · {tl.zoomPresets.length} zoomů
                    </p>
                  </div>
                  <Badge tone="warning">Timeline</Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Mapa souvislostí
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Řetězce směr → oblast → autor → dílo. Prohlížej nebo doplň skryté uzly.
        </p>
        {maps.length === 0 ? (
          <Card>
            <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
            </CardDescription>
          </Card>
        ) : (
          maps.map((map) => (
            <Card key={map.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>
                      <Link
                        href={`/app/learn/mapa-souvislosti/${map.slug}`}
                        className="hover:text-action"
                      >
                        {map.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {map.summary}
                    </CardDescription>
                    <p className="mt-2 text-caption text-fg-muted">
                      {map.nodes.length} uzlů · {map.paths.length} cest ·{" "}
                      {map.rootSlugs.length} kořenů
                    </p>
                  </div>
                  <Badge tone="info">Mapa</Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Story Mode
        </h2>
        <p className="text-body-sm text-fg-secondary">
          Historie literatury jako příběh (timeline, příčina→následek, osobnosti).
          Jen verified knowledge units — žádná fikční fakta.
        </p>
        {stories.length === 0 ? (
          <Card>
            <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
            </CardDescription>
          </Card>
        ) : (
          stories.map((story) => (
            <Card key={story.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>
                      <Link
                        href={`/app/learn/pribeh/${story.slug}`}
                        className="hover:text-action"
                      >
                        {story.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {story.summary}
                    </CardDescription>
                    <p className="mt-2 text-caption text-fg-muted">
                      {story.beats.length} scén ·{" "}
                      {Object.keys(story.evidence).length} verified faktů
                    </p>
                  </div>
                  <Badge tone="success">Story</Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Rychle pochopit
        </h2>
        {packs.length === 0 ? (
          <Card>
            <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
            </CardDescription>
          </Card>
        ) : (
          packs.map((pack) => {
            const stats = computeQuickGraspStats(pack, null);
            return (
              <Card key={pack.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>
                        <Link
                          href={`/app/learn/rychle/${pack.slug}`}
                          className="hover:text-action"
                        >
                          {pack.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {pack.summary}
                      </CardDescription>
                      <p className="mt-2 text-caption text-fg-muted">
                        {stats.label} · {stats.remainingLabel} ·{" "}
                        {
                          pack.steps.filter((s) => s.type === "checkpoint")
                            .length
                        }{" "}
                        checkpointy
                      </p>
                    </div>
                    <Badge tone="brand">Rychle</Badge>
                  </div>
                </CardHeader>
              </Card>
            );
          })
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg">
          Plné lekce
        </h2>
        {lessons.length === 0 ? (
          <Card>
            <CardDescription>
Tento obsah zatím není k dispozici. Zkus jinou aktivitu nebo se vrať později.
            </CardDescription>
          </Card>
        ) : (
          lessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>
                      <Link
                        href={`/app/learn/${lesson.slug}`}
                        className="hover:text-action"
                      >
                        {lesson.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {lesson.objective}
                    </CardDescription>
                    <p className="mt-2 text-caption text-fg-muted">
                      {lesson.topicSlug} · {lesson.blocks.length} bloků ·{" "}
                      {lesson.estimatedMinutes} min
                    </p>
                  </div>
                  <Badge tone="accent">Lekce</Badge>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

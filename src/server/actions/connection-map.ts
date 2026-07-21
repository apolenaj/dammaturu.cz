"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import type {
  ConnectionMapMode,
  ConnectionMapPack,
  ConnectionMapProgress,
} from "@/domain/learning/connection-map";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import {
  getConnectionMapPackBySlug,
  getConnectionMapProgress,
  listConnectionMapPacks,
  recordConnectionMapExplore,
  recordConnectionMapFill,
  setConnectionMapMode,
} from "@/server/connection-map/store";

export async function listConnectionMapPacksAction(): Promise<
  ConnectionMapPack[]
> {
  return listConnectionMapPacks();
}

export async function getConnectionMapSessionAction(slug: string): Promise<{
  pack: ConnectionMapPack | null;
  progress: ConnectionMapProgress | null;
  learnerId: string | null;
}> {
  const learnerId = (await getLearnerIdFromCookies()) ?? null;
  const pack = await getConnectionMapPackBySlug(slug);
  const progress =
    learnerId && pack
      ? await getConnectionMapProgress(learnerId, pack.id)
      : null;
  return { pack, progress, learnerId };
}

type Ok = { ok: true; progress: ConnectionMapProgress };
type Fail = { ok: false; error: string };

export async function connectionMapSetModeAction(input: {
  packSlug: string;
  mode: ConnectionMapMode;
}): Promise<Ok | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getConnectionMapPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Mapa nenalezena." };
    const progress = await setConnectionMapMode({
      learnerId,
      pack,
      mode: input.mode,
    });
    track("connection_map_mode", {
      packSlug: input.packSlug,
      mode: input.mode,
    });
    revalidatePath(`/app/learn/mapa-souvislosti/${input.packSlug}`);
    return { ok: true, progress };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function connectionMapExploreAction(input: {
  packSlug: string;
  nodeId: string;
}): Promise<Ok | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getConnectionMapPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Mapa nenalezena." };
    const progress = await recordConnectionMapExplore({
      learnerId,
      pack,
      nodeId: input.nodeId,
    });
    return { ok: true, progress };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function connectionMapFillAction(input: {
  packSlug: string;
  pathId: string;
  allCorrect: boolean;
}): Promise<Ok | Fail> {
  try {
    const learnerId = await getLearnerIdFromCookies();
    if (!learnerId) return { ok: false, error: "Nejdřív dokonči onboarding." };
    const pack = await getConnectionMapPackBySlug(input.packSlug);
    if (!pack) return { ok: false, error: "Mapa nenalezena." };
    const progress = await recordConnectionMapFill({
      learnerId,
      pack,
      pathId: input.pathId,
      allCorrect: input.allCorrect,
    });
    track("connection_map_fill", {
      packSlug: input.packSlug,
      allCorrect: input.allCorrect,
    });
    revalidatePath(`/app/learn/mapa-souvislosti/${input.packSlug}`);
    return { ok: true, progress };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

import type { Metadata } from "next";
import { VysvetliMiToAssistant } from "@/components/materials/vysvetli-mi-to-assistant";
import { getVysvetliDefaultsAction } from "@/server/actions/vysvetli-mi-to";

export const metadata: Metadata = { title: "Vysvětli mi to" };
export const dynamic = "force-dynamic";

export default async function VysvetliMiToPage() {
  const defaults = await getVysvetliDefaultsAction();
  return (
    <div className="px-3 pb-10 sm:px-0">
      <VysvetliMiToAssistant
        materials={defaults.materials}
        aiExplanationsEntitled={defaults.aiExplanationsEntitled}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { ZachranMeWizard } from "@/components/zachran-me/zachran-me-wizard";
import { getZachranMeDefaultsAction } from "@/server/actions/zachran-me";

export const metadata: Metadata = { title: "Zachraň mě" };
export const dynamic = "force-dynamic";

export default async function ZachranMePage() {
  const defaults = await getZachranMeDefaultsAction();
  return (
    <div className="px-3 pb-10 sm:px-0">
      <ZachranMeWizard
        defaults={{
          deadline: defaults.deadline,
          dailyMinutes: defaults.dailyMinutes,
          subjects: defaults.subjects,
        }}
      />
    </div>
  );
}

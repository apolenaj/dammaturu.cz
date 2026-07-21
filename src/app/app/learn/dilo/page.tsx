import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listLiteraryWorksAction } from "@/server/actions/literary-work";

export const metadata: Metadata = { title: "Literární díla" };
export const dynamic = "force-dynamic";

export default async function LiteraryWorksIndexPage() {
  const { items } = await listLiteraryWorksAction();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-3 pb-10 sm:px-0">
      <header className="space-y-2">
        <Badge tone="brand">Rozbory</Badge>
        <h1 className="font-display text-display-md text-fg">Literární díla</h1>
        <p className="text-body-md text-fg-secondary">
          Generický rozbor — stejné taby pro každé dílo. Data z work schema, ne
          hardcoded stránky.
        </p>
      </header>

      {items.length === 0 ? (
        <Card>
          <CardDescription>
            Zatím žádná díla. Spusť{" "}
            <code className="text-body-sm">npm run seed:literary-works</code>.
          </CardDescription>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.slug}>
              <Link href={item.href} className="block">
                <Card className="transition hover:border-action/40">
                  <CardHeader>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>
                      {item.author}
                      {item.yearPublished ? ` · ${item.yearPublished}` : ""} ·{" "}
                      {item.workType}
                    </CardDescription>
                  </CardHeader>
                  <CardDescription className="px-6 pb-4">
                    {item.summary}
                  </CardDescription>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/app/learn"
        className="text-body-sm font-semibold text-action hover:underline"
      >
        ← Učit se
      </Link>
    </div>
  );
}

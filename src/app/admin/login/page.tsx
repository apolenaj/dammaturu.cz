import { adminLoginAction } from "@/server/actions/admin-auth";
import { isAdminAuthenticated } from "@/server/admin-auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin · Přihlášení" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4">
      <h1 className="font-display text-display-md text-fg">Admin přihlášení</h1>
      <p className="mt-2 text-body-md text-fg-secondary">
        Přihlášení jen pro administrátory obsahu.
        {process.env.NODE_ENV !== "production" ? (
          <>
            {" "}
            (Dev: heslo z <code className="text-body-sm">ADMIN_SECRET</code>.)
          </>
        ) : null}
      </p>
      <form action={adminLoginAction} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={params.next ?? "/admin"} />
        <div>
          <label
            htmlFor="admin-password"
            className="text-caption font-semibold uppercase tracking-wider text-fg-muted"
          >
            Heslo
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-body-md text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-action px-5 text-body-sm font-semibold uppercase tracking-wide text-fg-on-brand"
        >
          Vstoupit
        </button>
      </form>
      {params.error ? (
        <p className="mt-4 text-body-sm text-danger" role="alert">
          {params.error}
        </p>
      ) : null}
    </div>
  );
}

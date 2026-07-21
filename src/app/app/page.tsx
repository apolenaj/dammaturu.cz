import { redirect } from "next/navigation";

/** /app → dnešní mise */
export default function AppIndexPage() {
  redirect("/app/dashboard");
}

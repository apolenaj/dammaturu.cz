import { LearnerAppShell } from "@/components/shell/LearnerAppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LearnerAppShell>{children}</LearnerAppShell>;
}

import {
  AppBottomNav,
  AppMobileHeader,
  AppSidebar,
} from "@/components/shell/AppShell";
import { BetaFeedbackWidget } from "@/components/beta/beta-feedback-widget";

export function LearnerAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-paper-wash text-ink">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileHeader />
        <main
          id="main-content"
          className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8"
        >
          {children}
        </main>
        <AppBottomNav />
        <BetaFeedbackWidget />
      </div>
    </div>
  );
}

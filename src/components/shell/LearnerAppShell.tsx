import {
  AppBottomNav,
  AppMobileHeader,
  AppSidebar,
} from "@/components/shell/AppShell";
import { LazyBetaFeedbackWidget } from "@/components/beta/lazy-beta-feedback";

export function LearnerAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh overflow-x-clip bg-paper-wash text-ink">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <AppMobileHeader />
        <main
          id="main-content"
          className="min-w-0 flex-1 px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-7 lg:px-8 lg:pb-10"
        >
          <div className="mx-auto w-full min-w-0 max-w-5xl animate-in-rise">
            {children}
          </div>
        </main>
        <AppBottomNav />
        <LazyBetaFeedbackWidget />
      </div>
    </div>
  );
}

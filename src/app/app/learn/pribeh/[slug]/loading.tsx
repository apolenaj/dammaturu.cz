import { AppLoadingState } from "@/components/shell/app-screen";

export default function StoryModeLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-2 sm:px-0">
      <AppLoadingState label="Načítám příběh…" />
    </div>
  );
}

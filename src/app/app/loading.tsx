export default function AppLoading() {
  return (
    <div
      className="mx-auto w-full max-w-lg animate-pulse space-y-4 px-1 py-8"
      aria-busy="true"
      aria-label="Načítání"
    >
      <div className="h-8 w-2/3 rounded-md bg-subtle" />
      <div className="h-4 w-full rounded-md bg-subtle" />
      <div className="h-4 w-5/6 rounded-md bg-subtle" />
      <div className="mt-6 h-32 rounded-xl bg-subtle" />
    </div>
  );
}

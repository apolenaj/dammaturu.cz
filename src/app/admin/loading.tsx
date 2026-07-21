export default function AdminLoading() {
  return (
    <div
      className="mx-auto w-full max-w-3xl animate-pulse space-y-4 px-1 py-8"
      aria-busy="true"
      aria-label="Načítání admin"
    >
      <div className="h-8 w-1/2 rounded-md bg-subtle" />
      <div className="h-40 rounded-xl bg-subtle" />
    </div>
  );
}

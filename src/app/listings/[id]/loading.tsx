export default function ListingLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="aspect-video rounded-2xl bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-3">
        <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

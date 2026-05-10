export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="grid gap-4 sm:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
      <div className="h-96 rounded-2xl bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

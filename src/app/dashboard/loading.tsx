export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
    </div>
  );
}

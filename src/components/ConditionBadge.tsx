import type { ListingCondition } from "@/types";

const conditionStyles: Record<
  ListingCondition,
  {
    label: string;
    className: string;
  }
> = {
  NEW: {
    label: "New",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
  LIKE_NEW: {
    label: "Like New",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
  },
  GOOD: {
    label: "Good",
    className: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  },
  FAIR: {
    label: "Fair",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  },
};

type ConditionBadgeProps = {
  condition: ListingCondition;
};

export default function ConditionBadge({ condition }: ConditionBadgeProps) {
  const { label, className } = conditionStyles[condition];

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${className}`}>{label}</span>;
}

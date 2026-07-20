import { useLanguage } from "@/lib/i18n";

// Epic 15.1.5: "X of Y days tracked" — the same bar+percentage+label
// idiom already used by GatedGapsCard/HealthScoreCard (ResultsStep.tsx),
// just extracted into its own reusable component since Epic 15 needs it
// in several places (early-signal card, weekly gap card, trend chart).
export function CoverageBadge({ tracked, days }: { tracked: number; days: number }) {
  const { t } = useLanguage();
  const pct = days > 0 ? Math.min(100, Math.round((tracked / days) * 100)) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-ink/30" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] uppercase tracking-widest text-ink/40">
        {t("coverage.badge").replace("{tracked}", String(tracked)).replace("{days}", String(days))}
      </span>
    </div>
  );
}

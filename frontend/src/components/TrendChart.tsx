import { useLanguage } from "@/lib/i18n";
import type { NutritionTrend } from "@/types/api";

// Epic 15.6.3, redesigned: every tracked nutrient as its own line, each
// normalized to % of its own target rather than raw units — plotting
// ~2200 kcal next to ~70g fat on one axis would be unreadable, and % of
// target directly answers "how close to the ideal profile" at every
// point in time, not just the latest one. A dashed line at 100% is the
// "fully met" reference every series is judged against. Hand-rolled SVG,
// consistent with the rest of this app's charts (no charting library).
const WIDTH = 320;
const HEIGHT = 140;
const PADDING = 10;

export interface TrendSeries {
  dimension: string;
  label: string;
  stroke: string; // tailwind stroke-* class
  dot: string; // tailwind fill-* class
  trend: NutritionTrend | null;
}

function seriesPoints(trend: NutritionTrend | null) {
  if (!trend || !trend.has_sufficient_data || trend.target == null || trend.target <= 0) return null;
  return trend.buckets.map((b) => ({
    pct: b.avg_daily_value !== null ? (b.avg_daily_value / trend.target!) * 100 : null,
    confidence: b.confidence,
  }));
}

export function MultiTrendChart({ series }: { series: TrendSeries[] }) {
  const { t } = useLanguage();

  const withData = series
    .map((s) => ({ ...s, points: seriesPoints(s.trend) }))
    .filter((s): s is TrendSeries & { points: NonNullable<ReturnType<typeof seriesPoints>> } => s.points !== null);

  if (withData.length === 0) {
    return <p className="text-sm text-ink/50">{t("trend.insufficientData")}</p>;
  }

  const bucketCount = Math.max(...withData.map((s) => s.points.length));
  const allPct = withData.flatMap((s) => s.points.map((p) => p.pct).filter((v): v is number => v !== null));
  const maxPct = Math.max(120, ...allPct);
  const innerWidth = WIDTH - PADDING * 2;
  const innerHeight = HEIGHT - PADDING * 2;
  const step = bucketCount > 1 ? innerWidth / (bucketCount - 1) : 0;
  const yFor = (pct: number) => PADDING + innerHeight - (pct / maxPct) * innerHeight;
  const refY = yFor(100);

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-32 w-full" role="img" aria-label={t("trend.title")}>
        <line x1={PADDING} y1={refY} x2={WIDTH - PADDING} y2={refY} className="stroke-ink/25" strokeWidth={1} strokeDasharray="4 3" />
        {withData.map((s) => {
          const pts = s.points.map((p, i) => ({ x: PADDING + i * step, y: p.pct !== null ? yFor(p.pct) : null, low: p.confidence === "low" }));
          const path = pts
            .filter((p) => p.y !== null)
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");
          return (
            <g key={s.dimension}>
              <path d={path} fill="none" className={s.stroke} strokeWidth={2} />
              {pts.map((p, i) =>
                p.y !== null ? (
                  <circle key={i} cx={p.x} cy={p.y} r={2.5} className={`${s.dot} ${p.low ? "opacity-40" : ""}`} />
                ) : null,
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3">
        {withData.map((s) => {
          const latest = [...s.points].reverse().find((p) => p.pct !== null);
          return (
            <div key={s.dimension} className={`flex items-center gap-1.5 text-xs ${s.stroke.replace("stroke-", "text-")}`}>
              <span aria-hidden className={`size-2 shrink-0 rounded-full ${s.dot}`} />
              {s.label} · {latest ? `${Math.round(latest.pct!)}%` : "—"}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-ink/35">{t("trend.legendNote")}</p>
    </div>
  );
}

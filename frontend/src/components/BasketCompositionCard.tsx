import { Card, SectionLabel } from "@/components/AppShell";
import { useLanguage } from "@/lib/i18n";
import { CoverageBadge } from "@/components/CoverageBadge";
import type { BasketComposition } from "@/types/api";

// Epic 15.3/15.4 (Tiers 1 & 2): shows the macro % split even before a
// single meal has been confirmed, honestly labeled by `source` so it
// never reads as a claim about what was actually eaten until it is one.
// Grayscale segments deliberately, not red/amber/green — this is a
// neutral composition breakdown, not a status judgement the way the
// weekly gap cards are.
const SEGMENT_TONE = {
  protein: "bg-ink",
  fat: "bg-ink/55",
  carbs: "bg-ink/25",
} as const;

// Deliberately NOT renormalized to protein+fat+carbs' own sum: each value
// is already a % of total calories (backend basket_composition.py), and
// real nutrition data rarely sums macros to exactly 100% of calories
// (fiber/alcohol energy, rounding, category-fallback gaps) — a bar that
// force-fills to 100% would silently contradict the Legend's own
// percentages. Any gap left at the end is real, not a rendering bug.
function CompositionBar({ protein, fat, carbs }: { protein: number; fat: number; carbs: number }) {
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100">
      <div className={SEGMENT_TONE.protein} style={{ width: `${Math.max(0, Math.min(100, protein))}%` }} />
      <div className={SEGMENT_TONE.fat} style={{ width: `${Math.max(0, Math.min(100, fat))}%` }} />
      <div className={SEGMENT_TONE.carbs} style={{ width: `${Math.max(0, Math.min(100, carbs))}%` }} />
    </div>
  );
}

function Legend({ label, pct, tone }: { label: string; pct: number; tone: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-ink/60">
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${tone}`} />
      {label} · {pct.toFixed(0)}%
    </div>
  );
}

export function BasketCompositionCard({ composition }: { composition: BasketComposition | null }) {
  const { t } = useLanguage();

  if (!composition || composition.source === "none" || composition.protein_pct === null) {
    return (
      <Card className="space-y-2">
        <SectionLabel>{t("basket.title")}</SectionLabel>
        <p className="text-sm text-ink/50">{t("basket.empty")}</p>
      </Card>
    );
  }

  const { protein_pct, fat_pct, carb_pct, source, tracking } = composition;
  const title =
    source === "confirmed" ? t("basket.titleConfirmed") : source === "blend" ? t("basket.titleBlend") : t("basket.title");
  const disclaimer =
    source === "confirmed"
      ? t("basket.disclaimerConfirmed")
      : source === "blend"
        ? t("basket.disclaimerBlend")
        : t("basket.disclaimerBasket");

  const remaining = Math.max(0, tracking.threshold - tracking.tracked_days);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>{title}</SectionLabel>
        <CoverageBadge tracked={tracking.tracked_days} days={tracking.threshold} />
      </div>

      <CompositionBar protein={protein_pct ?? 0} fat={fat_pct ?? 0} carbs={carb_pct ?? 0} />

      <div className="flex flex-wrap gap-4">
        <Legend label={t("basket.protein")} pct={protein_pct ?? 0} tone={SEGMENT_TONE.protein} />
        <Legend label={t("basket.fat")} pct={fat_pct ?? 0} tone={SEGMENT_TONE.fat} />
        <Legend label={t("basket.carbs")} pct={carb_pct ?? 0} tone={SEGMENT_TONE.carbs} />
      </div>

      <p className="text-xs text-ink/45">{disclaimer}</p>

      {remaining > 0 ? (
        <p className="text-xs font-medium text-ink/55">
          {t("basket.unlockProgress").replace("{remaining}", String(remaining))}
        </p>
      ) : null}
    </Card>
  );
}

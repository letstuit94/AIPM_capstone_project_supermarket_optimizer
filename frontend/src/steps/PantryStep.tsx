import { useEffect, useState } from "react";
import { SectionLabel, Card, inputCls } from "@/components/AppShell";
import { useLanguage } from "@/lib/i18n";
import {
  getPantry,
  consumePantryItem,
  removePantryItem,
  logManualConsumption,
  getConsumptionLogForDate,
  updatePantryItemMetadata,
  ApiError,
} from "@/lib/api";
import type { PantryItem, ConsumptionLogEntry } from "@/types/api";

const quantityInputCls =
  "w-20 rounded-lg bg-zinc-50 px-2 py-1.5 text-sm text-ink ring-1 ring-black/5 outline-none focus:ring-ink/30";

const MAX_DAYS_BACK = 14;

// Mirrors backend fallback_categories.CATEGORY_NUTRITION's key set — the
// only categories the shelf-life/gram-conversion lookups recognize
// (Epic 12.3, updatePantryItemMetadata falls back to "other" for anything else).
const PANTRY_CATEGORIES = [
  "dairy",
  "grain",
  "vegetable",
  "fruit",
  "protein",
  "snack",
  "drink",
  "other",
] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Noon UTC on the selected day avoids day-boundary ambiguity when the
// backend compares consumed_at against calendar dates — "today" is left
// undefined so the backend's real-time default (now()) is used instead,
// which is more precise than a fixed noon timestamp.
function consumedAtFor(selectedDate: string): string | undefined {
  return selectedDate === todayIso() ? undefined : `${selectedDate}T12:00:00.000Z`;
}

function PantryRow({
  item,
  onConsume,
  onRemove,
  onEditMetadata,
}: {
  item: PantryItem;
  onConsume: (name: string, quantity: number) => Promise<void>;
  onRemove: (name: string, quantity: number) => Promise<void>;
  onEditMetadata: (name: string, unit: string, category: string) => Promise<void>;
}) {
  // Defaults to the full remaining quantity (so confirming everything is
  // still one click) but is editable — a partial amount (5 of 10
  // tomatoes, one glass of a 1L milk) is the normal case, not "all or
  // nothing".
  const [quantity, setQuantity] = useState(String(item.quantity_available));
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [unit, setUnit] = useState(item.unit ?? "");
  const [category, setCategory] = useState(item.category ?? "other");
  const { t } = useLanguage();

  const parsed = Number(quantity);
  const validQuantity = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

  async function handle(action: (name: string, quantity: number) => Promise<void>) {
    if (validQuantity === null) return;
    setBusy(true);
    try {
      // The backend clamps to what's actually on hand too, so a stale
      // or too-large value here never inflates the intake estimate.
      await action(item.normalized_name, Math.min(validQuantity, item.quantity_available));
    } finally {
      setBusy(false);
    }
  }

  async function saveMetadata() {
    setBusy(true);
    try {
      await onEditMetadata(item.normalized_name, unit, category);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <li className="space-y-3 px-5 py-4">
        <p className="text-sm font-medium tracking-tight">{item.normalized_name}</p>
        <div className="flex gap-2">
          <input
            className={inputCls}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder={t("pantry.quantityLabel")}
            disabled={busy}
          />
          <select
            className={inputCls}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={busy}
          >
            {PANTRY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveMetadata}
            disabled={busy}
            className="rounded-full bg-ink px-4 py-2 text-xs font-medium tracking-tight text-canvas disabled:opacity-40"
          >
            {t("review.save")}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={busy}
            className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium tracking-tight text-ink ring-1 ring-black/5"
          >
            {t("review.cancel")}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium tracking-tight">{item.normalized_name}</p>
        <p className="truncate text-xs text-ink/50">
          {item.quantity_available} {item.unit ?? ""} · {item.category ?? t("review.uncategorized")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <input
          type="number"
          min={0}
          max={item.quantity_available}
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={busy}
          className={quantityInputCls}
          aria-label={t("pantry.quantityLabel")}
        />
        <button
          type="button"
          disabled={busy || validQuantity === null}
          onClick={() => handle(onConsume)}
          className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium tracking-tight text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-40"
        >
          {t("pantry.consumed")}
        </button>
        <button
          type="button"
          disabled={busy || validQuantity === null}
          onClick={() => handle(onRemove)}
          className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium tracking-tight text-ink ring-1 ring-black/5 hover:bg-zinc-200 disabled:opacity-40"
        >
          {t("pantry.remove")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing(true)}
          className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium tracking-tight text-ink ring-1 ring-black/5 hover:bg-zinc-200 disabled:opacity-40"
        >
          {t("review.edit")}
        </button>
      </div>
    </li>
  );
}

function DateNav({
  date,
  onChange,
}: {
  date: string;
  onChange: (date: string) => void;
}) {
  const { t } = useLanguage();
  const min = daysAgoIso(MAX_DAYS_BACK);
  const max = todayIso();
  const isToday = date === max;
  const atOldest = date <= min;

  function shift(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    const next = d.toISOString().slice(0, 10);
    if (next < min || next > max) return;
    onChange(next);
  }

  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 ring-1 ring-black/5">
      <button
        type="button"
        onClick={() => shift(-1)}
        disabled={atOldest}
        className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium tracking-tight text-ink ring-1 ring-black/5 hover:bg-zinc-200 disabled:opacity-40"
      >
        ← {t("pantry.previousDay")}
      </button>
      <span className="text-sm font-medium tracking-tight">
        {isToday ? t("pantry.today") : date}
      </span>
      <button
        type="button"
        onClick={() => shift(1)}
        disabled={isToday}
        className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium tracking-tight text-ink ring-1 ring-black/5 hover:bg-zinc-200 disabled:opacity-40"
      >
        {t("pantry.nextDay")} →
      </button>
    </div>
  );
}

function ManualLogForm({
  pantryItemNames,
  onSubmit,
}: {
  pantryItemNames: string[];
  onSubmit: (name: string, quantity: number) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [lastMatch, setLastMatch] = useState<{ name: string; matched: boolean } | null>(null);
  const { t } = useLanguage();

  const parsedQuantity = Number(quantity);
  const canSubmit = name.trim().length > 0 && Number.isFinite(parsedQuantity) && parsedQuantity > 0;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const submittedName = name.trim();
      const matched = await onSubmit(submittedName, parsedQuantity);
      setLastMatch({ name: submittedName, matched });
      setName("");
      setQuantity("1");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="space-y-3">
      <SectionLabel>{t("pantry.manualLogTitle")}</SectionLabel>
      <p className="text-xs text-ink/50">{t("pantry.manualLogBody")}</p>
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder={t("pantry.manualLogNamePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          // Suggests existing pantry names so a typo doesn't silently
          // create an unrelated standalone log entry instead of matching
          // (Epic 12.1) — pure browser autocomplete, no new endpoint.
          list="pantry-item-names"
        />
        <datalist id="pantry-item-names">
          {pantryItemNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <input
          type="number"
          min={0}
          step="any"
          className={quantityInputCls}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={submitting}
          aria-label={t("pantry.quantityLabel")}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-medium tracking-tight text-canvas disabled:opacity-40"
        >
          {t("pantry.manualLogAdd")}
        </button>
      </div>
      {lastMatch ? (
        <p className="text-xs text-ink/50">
          "{lastMatch.name}" —{" "}
          {lastMatch.matched ? t("pantry.matchedGood") : t("pantry.matchedRough")}
        </p>
      ) : null}
    </Card>
  );
}

function DayLog({ entries }: { entries: ConsumptionLogEntry[] }) {
  const { t } = useLanguage();
  if (entries.length === 0) return null;
  return (
    <Card className="space-y-2">
      <SectionLabel>{t("pantry.dayLogTitle")}</SectionLabel>
      <ul className="space-y-1 text-sm text-ink/70">
        {entries.map((entry) => (
          <li key={entry.id}>
            · {entry.normalized_name} ({entry.quantity_consumed})
          </li>
        ))}
      </ul>
    </Card>
  );
}

const REMINDER_THRESHOLD_DAYS = 3;

export function PantryStep() {
  const [items, setItems] = useState<PantryItem[] | null>(null);
  const [daysSinceLastConfirmation, setDaysSinceLastConfirmation] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [logEntries, setLogEntries] = useState<ConsumptionLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  async function loadPantry() {
    try {
      const res = await getPantry();
      setItems(res.items);
      setDaysSinceLastConfirmation(res.days_since_last_confirmation);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("pantry.loadFailed"));
    }
  }

  async function loadLog(date: string) {
    try {
      const res = await getConsumptionLogForDate(date);
      setLogEntries(res.entries);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("pantry.loadFailed"));
    }
  }

  async function loadAll() {
    setError(null);
    await Promise.all([loadPantry(), loadLog(selectedDate)]);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLog(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function handleConsume(name: string, quantity: number) {
    await consumePantryItem(name, quantity, consumedAtFor(selectedDate));
    await loadAll();
  }

  async function handleRemove(name: string, quantity: number) {
    await removePantryItem(name, quantity);
    await loadPantry();
  }

  async function handleManualLog(name: string, quantity: number): Promise<boolean> {
    const result = await logManualConsumption(name, quantity, consumedAtFor(selectedDate));
    await loadAll();
    return result.matched;
  }

  async function handleEditMetadata(name: string, unit: string, category: string) {
    await updatePantryItemMetadata(name, { unit: unit || undefined, category });
    await loadPantry();
  }

  return (
    <section className="space-y-8 px-6 pb-16">
      <header className="space-y-2">
        <SectionLabel>{t("pantry.step")}</SectionLabel>
        <h1 className="text-balance text-4xl font-medium leading-none tracking-tight">
          {t("pantry.title")}
        </h1>
        <p className="max-w-[56ch] text-pretty text-base text-ink/60">{t("pantry.body")}</p>
        {/* Epic 13.2: brief explanation of why daily confirmation matters. */}
        <p className="max-w-[56ch] text-pretty text-xs text-ink/40">{t("pantry.whyItMatters")}</p>
      </header>

      {error ? (
        <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      ) : null}

      {/* Epic 13.1: in-app nudge, no email/push (deliberately out of scope). */}
      {daysSinceLastConfirmation !== null && daysSinceLastConfirmation >= REMINDER_THRESHOLD_DAYS ? (
        <div className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-800 ring-1 ring-amber-200">
          {t("pantry.reminderPrefix")} {daysSinceLastConfirmation} {t("pantry.reminderSuffix")}
        </div>
      ) : null}

      <DateNav date={selectedDate} onChange={setSelectedDate} />

      <DayLog entries={logEntries} />

      <ManualLogForm
        pantryItemNames={items?.map((item) => item.normalized_name) ?? []}
        onSubmit={handleManualLog}
      />

      {items === null && !error ? (
        <p className="text-sm text-ink/50">{t("pantry.loading")}</p>
      ) : null}

      {items && items.length === 0 ? (
        <Card>
          <p className="text-sm text-ink/60">{t("pantry.empty")}</p>
        </Card>
      ) : null}

      {items && items.length > 0 ? (
        <ul className="divide-y divide-black/5 rounded-2xl bg-surface ring-1 ring-black/5">
          {items.map((item) => (
            <PantryRow
              key={item.id}
              item={item}
              onConsume={handleConsume}
              onRemove={handleRemove}
              onEditMetadata={handleEditMetadata}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

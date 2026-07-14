import { useEffect, useState } from "react";
import { SectionLabel, Card, PrimaryButton, inputCls } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import {
  getReceipt,
  updateReceiptItem,
  searchProducts,
  pickItemMatch,
  flagNoMatch,
  ApiError,
} from "@/lib/api";
import type { ReceiptItemRow, ProductSearchResult } from "@/types/api";

// E5-S2/S3/S5: per-item manual search across OFF+BLS, pick (writes a
// verified-match vote), or flag as no-match. Collapsed by default.
function MatchFixer({
  receiptId,
  item,
  onDone,
}: {
  receiptId: string;
  item: ReceiptItemRow;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(item.normalized_name ?? item.raw_name ?? "");
  const [results, setResults] = useState<ProductSearchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function runSearch() {
    if (query.trim().length < 2) return;
    setBusy(true);
    setNote(null);
    try {
      setResults(await searchProducts(query.trim()));
    } finally {
      setBusy(false);
    }
  }

  async function pick(r: ProductSearchResult) {
    setBusy(true);
    try {
      await pickItemMatch(receiptId, item.id, {
        source: r.source,
        matched_name: r.name,
        off_id: r.off_id ?? null,
        bls_code: r.bls_code ?? null,
        nutrition: r.nutrition,
      });
      setNote(t("review.picked"));
      onDone();
    } finally {
      setBusy(false);
    }
  }

  async function noMatch() {
    setBusy(true);
    try {
      await flagNoMatch(receiptId, item.id);
      setNote(t("review.noMatchLogged"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] font-medium tracking-tight text-accent hover:underline"
      >
        {t("review.fixMatch")}
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-zinc-50 p-3 ring-1 ring-black/5">
      <div className="flex gap-2">
        <input
          className={cn(inputCls, "text-sm")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder={t("review.searchPlaceholder")}
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={busy}
          className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-canvas disabled:opacity-40"
        >
          {busy ? t("review.searching") : t("review.searchButton")}
        </button>
      </div>

      {note ? <p className="text-xs text-emerald-600">{note}</p> : null}

      {results && results.length === 0 ? (
        <p className="text-xs text-ink/50">{t("review.noResults")}</p>
      ) : null}

      {results && results.length > 0 ? (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {results.map((r, i) => (
            <li key={`${r.source}-${r.off_id ?? r.bls_code ?? i}`} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-black/5">
              <span className="min-w-0 truncate text-xs text-ink/80">
                <span className="mr-1 rounded bg-zinc-100 px-1 py-0.5 text-[9px] uppercase tracking-widest text-ink/50">
                  {r.source}
                </span>
                {r.name}
                {r.brand ? <span className="text-ink/40"> · {r.brand}</span> : null}
              </span>
              <button
                type="button"
                onClick={() => pick(r)}
                disabled={busy}
                className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white disabled:opacity-40"
              >
                {t("review.useThis")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={noMatch} disabled={busy} className="text-[11px] text-red-600 hover:underline">
          {t("review.noMatch")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-ink/40 hover:underline">
          {t("review.close")}
        </button>
      </div>
    </div>
  );
}

function confidenceLabel(
  confidence: number | null,
  t: (key: string) => string,
): { text: string; tone: string } {
  if (confidence === null) return { text: t("review.confidence.unknown"), tone: "text-ink/40" };
  if (confidence >= 0.8) return { text: t("review.confidence.confident"), tone: "text-emerald-600" };
  if (confidence >= 0.5) return { text: t("review.confidence.uncertain"), tone: "text-amber-600" };
  return { text: t("review.confidence.low"), tone: "text-red-600" };
}

function ItemRow({
  item,
  receiptId,
  onSave,
  onReload,
}: {
  item: ReceiptItemRow;
  receiptId: string;
  onSave: (itemId: string, updates: { normalized_name?: string; quantity?: number; unit?: string; category?: string }) => Promise<void>;
  onReload: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.normalized_name ?? "");
  const [quantity, setQuantity] = useState(String(item.quantity ?? ""));
  const [unit, setUnit] = useState(item.unit ?? "");
  const [category, setCategory] = useState(item.category ?? "");
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();
  const confidence = confidenceLabel(item.confidence, t);

  async function save() {
    setSaving(true);
    try {
      await onSave(item.id, {
        normalized_name: name,
        quantity: quantity ? Number(quantity) : undefined,
        unit,
        category,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <li className="px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium tracking-tight">
              {item.normalized_name || item.raw_name}
            </p>
            <p className="truncate text-xs text-ink/50">
              {item.quantity ?? "?"} {item.unit ?? ""} · {item.category ?? t("review.uncategorized")} ·{" "}
              {t("review.rawPrefix")} "{item.raw_name}"
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className={`text-[11px] uppercase tracking-widest ${confidence.tone}`}>
              {confidence.text}
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium tracking-tight text-ink ring-1 ring-black/5 hover:bg-zinc-200"
            >
              {t("review.edit")}
            </button>
          </div>
        </div>
        <MatchFixer receiptId={receiptId} item={item} onDone={onReload} />
      </li>
    );
  }

  return (
    <li className="space-y-3 px-5 py-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("review.namePlaceholder")} />
        <input className={inputCls} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={t("review.quantityPlaceholder")} />
        <input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t("review.unitPlaceholder")} />
        <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("review.categoryPlaceholder")} />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-ink px-4 py-2 text-xs font-medium tracking-tight text-canvas disabled:opacity-40"
        >
          {saving ? t("review.saving") : t("review.save")}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium tracking-tight text-ink ring-1 ring-black/5"
        >
          {t("review.cancel")}
        </button>
      </div>
    </li>
  );
}

export function ReviewStep({
  receiptId,
  onContinue,
}: {
  receiptId: string;
  onContinue: () => void;
}) {
  const [items, setItems] = useState<ReceiptItemRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  async function load() {
    setError(null);
    try {
      const res = await getReceipt(receiptId);
      setItems(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("review.loadFailed"));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptId]);

  async function handleSave(
    itemId: string,
    updates: { normalized_name?: string; quantity?: number; unit?: string; category?: string },
  ) {
    await updateReceiptItem(receiptId, itemId, updates);
    await load();
  }

  return (
    <section className="space-y-8 px-6 pb-16">
      <header className="space-y-2">
        <SectionLabel>{t("review.step")}</SectionLabel>
        <h1 className="text-balance text-4xl font-medium leading-none tracking-tight">
          {t("review.title")}
        </h1>
        <p className="max-w-[56ch] text-pretty text-base text-ink/60">{t("review.body")}</p>
      </header>

      {error ? (
        <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      ) : null}

      {items === null && !error ? (
        <p className="text-sm text-ink/50">{t("review.loading")}</p>
      ) : null}

      {items && items.length === 0 ? (
        <Card>
          <p className="text-sm text-ink/60">{t("review.noItems")}</p>
        </Card>
      ) : null}

      {items && items.length > 0 ? (
        <ul className="divide-y divide-black/5 rounded-2xl bg-surface ring-1 ring-black/5">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} receiptId={receiptId} onSave={handleSave} onReload={load} />
          ))}
        </ul>
      ) : null}

      <PrimaryButton onClick={onContinue} disabled={!items}>
        {t("review.continueButton")}
      </PrimaryButton>
    </section>
  );
}

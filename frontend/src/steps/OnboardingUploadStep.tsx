import { useRef, useState } from "react";
import { Card, PrimaryButton, SectionLabel, inputCls } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { uploadReceiptFiles, uploadReceiptText, receiptErrorKey, ApiError } from "@/lib/api";
import type { ReceiptUploadProgress, UploadReceiptResponse } from "@/types/api";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

type Mode = "image" | "text";

// The baseline receipt upload — the chat's direct continuation, not the
// general "add another receipt" flow (now embedded in PantryStep.tsx's
// "Lager" page, reachable any time from the nav). Deliberately a
// separate component: different framing (this IS the baseline, not a
// re-upload), different visual language (matches ChatOnboardingStep's
// avatar/serif-headline hero instead of the plain in-app SectionLabel
// header), and it's the one place in the app where completing it always
// means "continue the onboarding journey", never "revisit an existing one".
export function OnboardingUploadStep({
  profileName,
  itemProgress,
  onUploaded,
  onSkip,
}: {
  profileName?: string | null;
  // E1's baseline-upload gate: cumulative food items uploaded so far vs.
  // the target that unlocks the rest of the app. Owned by App.tsx (it's
  // also what decides, after each Review, whether to loop back here or
  // continue) — null only for the brief moment before the first fetch
  // resolves. Named distinctly from the per-file upload `progress` state
  // below (that one tracks "processing 2 of 5 files", not food items).
  itemProgress: ReceiptUploadProgress | null;
  onUploaded: (receiptId: string) => void;
  onSkip: () => void;
}) {
  const [mode, setMode] = useState<Mode>("image");
  const [dragOver, setDragOver] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadReceiptResponse | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [multiSummary, setMultiSummary] = useState<{ ok: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // E3-S1: each selected file is uploaded as its own receipt. We proceed
  // with the first that parsed; any that failed are summarized, never
  // silently dropped.
  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setLoading(true);
    setError(null);
    setMultiSummary(null);
    setProgress(files.length > 1 ? { done: 0, total: files.length } : null);
    try {
      const results = await uploadReceiptFiles(files, (done, total) =>
        setProgress(total > 1 ? { done, total } : null),
      );
      const firstOk = results.find((r) => r.ok);
      const okCount = results.filter((r) => r.ok).length;
      if (firstOk?.response) {
        setResult(firstOk.response);
        if (results.length > 1) setMultiSummary({ ok: okCount, total: results.length });
      } else {
        const failed = results.find((r) => !r.ok);
        setError(t(failed?.errorKey ?? "upload.uploadFailed"));
      }
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  async function handleTextSubmit() {
    if (!pastedText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await uploadReceiptText(pastedText);
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? t(receiptErrorKey(e)) : t("upload.uploadFailed"));
    } finally {
      setLoading(false);
    }
  }

  // First visit (nothing uploaded yet) gets the name-aware intro; every
  // subsequent loop back here (still under target) gets the shorter
  // "keep going" nudge instead of repeating the same greeting.
  const greeting =
    itemProgress && itemProgress.count > 0
      ? t("onboardingUpload.greetingMore")
      : profileName
        ? t("onboardingUpload.greetingWithName").replace("{name}", profileName)
        : t("onboardingUpload.greeting");

  const itemPct = itemProgress
    ? Math.min(100, Math.round((itemProgress.count / itemProgress.target) * 100))
    : 0;

  return (
    <section className="space-y-5 px-6 pb-16">
      <header className="space-y-1.5 text-center">
        <span className="inline-block rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink/50">
          {t("onboardingUpload.badge")}
        </span>
        <h1 className="mx-auto max-w-xl text-balance text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
          {t("onboardingUpload.titleLine1")} <span className="text-accent">{t("onboardingUpload.titleLine2")}</span>
        </h1>
      </header>

      {/* Two-stage progress, continuing the chat's own progress bar
          (ChatOnboardingStep.tsx) — makes the end-to-end journey
          (profile -> baseline receipt) visually explicit as one flow. */}
      <div className="mx-auto flex max-w-md items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-ink/40">
        <span className="flex items-center gap-1.5 text-accent">
          <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[9px] text-white">✓</span>
          {t("onboardingUpload.progressProfile")}
        </span>
        <span className="h-px flex-1 bg-accent" />
        <span className="flex items-center gap-1.5 text-ink">
          <span className="flex size-4 items-center justify-center rounded-full bg-ink text-[9px] text-canvas">2</span>
          {t("onboardingUpload.progressReceipt")}
        </span>
      </div>

      {/* E1's baseline-upload gate: keep uploading until 50 food items are
          logged, across as many receipts as it takes. */}
      {itemProgress ? (
        <div className="mx-auto max-w-md space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-widest text-ink/40">
            <span>{t("onboardingUpload.itemProgressLabel")}</span>
            <span>
              {t("onboardingUpload.itemProgressCount")
                .replace("{count}", String(itemProgress.count))
                .replace("{target}", String(itemProgress.target))}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${itemPct}%` }} />
          </div>
        </div>
      ) : null}

      <Card className="space-y-4">
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm ring-2 ring-white"
          >
            🌱
          </span>
          <p className="max-w-[46ch] rounded-2xl bg-zinc-100 px-4 py-2.5 text-sm text-ink">{greeting}</p>
        </div>

        <div className="flex gap-2 rounded-full bg-surface p-1 ring-1 ring-black/5 w-fit">
          {(["image", "text"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setResult(null);
                setError(null);
              }}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-medium tracking-tight transition-colors",
                mode === m ? "bg-ink text-canvas" : "text-ink/55 hover:text-ink",
              )}
            >
              {m === "image" ? t("upload.tabPhoto") : t("upload.tabText")}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-zinc-50 px-4 py-3 ring-1 ring-black/5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40">
            {t("upload.disclaimerTitle")}
          </p>
          <p className="mt-1 text-xs text-ink/60">{t("upload.disclaimerBody")}</p>
        </div>

        {mode === "image" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const files = Array.from(e.dataTransfer.files ?? []);
              if (files.length) handleFiles(files);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            className={cn(
              "block w-full cursor-pointer rounded-3xl border border-dashed p-10 text-center transition-colors",
              dragOver ? "border-ink/50 bg-zinc-50" : "border-ink/20 bg-zinc-50 hover:border-ink/40",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) handleFiles(files);
              }}
            />
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-white ring-1 ring-black/5">
              <span className="text-lg text-ink/60">↑</span>
            </div>
            <p className="text-sm font-medium tracking-tight">
              {loading
                ? progress
                  ? t("upload.progress").replace("{done}", String(progress.done)).replace("{total}", String(progress.total))
                  : t("upload.dropUploading")
                : t("upload.dropTitle")}
            </p>
            <p className="mt-1 text-xs text-ink/50">{t("upload.dropHint")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <SectionLabel>{t("upload.pasteLabel")}</SectionLabel>
            <textarea
              className={cn(inputCls, "min-h-40 resize-y font-mono text-xs")}
              placeholder={"REWE Markt GmbH\nVollmilch 3,5% 1L    1,29\nVollkornbrot 500g    1,99\n..."}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />
            <PrimaryButton onClick={handleTextSubmit} disabled={loading || !pastedText.trim()}>
              {loading ? t("upload.analyzing") : t("upload.analyzeButton")}
            </PrimaryButton>
          </div>
        )}

        {error ? (
          <div className="space-y-3 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">
            <p>{error}</p>
            {mode === "image" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("text");
                  setError(null);
                }}
                className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium tracking-tight text-red-800 hover:bg-red-200"
              >
                {t("upload.pasteInstead")}
              </button>
            ) : null}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-4 border-t border-black/5 pt-4">
            {multiSummary ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-emerald-200">
                {t("upload.multiDone")
                  .replace("{ok}", String(multiSummary.ok))
                  .replace("{total}", String(multiSummary.total))}
              </p>
            ) : null}
            <div className="flex items-center justify-between">
              <SectionLabel>
                {result.parsed.store}
                {result.parsed.date ? ` · ${result.parsed.date}` : ""} ({result.parsed.scan_quality})
              </SectionLabel>
              <span className="text-xs text-ink/40">
                {result.parsed.items_count} {t("upload.itemsSuffix")}
              </span>
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {result.parsed.items.map((item, i) => (
                <li key={i} className="text-sm text-ink/70">
                  · {item.name}
                  <span className="ml-1 text-xs text-ink/40">
                    {item.quantity}
                    {item.unit ? ` ${item.unit}` : ""}
                    {item.price != null ? ` · ${item.price.toFixed(2)} €` : ""}
                  </span>
                  {item.uncertain ? (
                    <span className="ml-1 text-[10px] uppercase tracking-widest text-ink/35">
                      {t("upload.uncertainTag")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <PrimaryButton onClick={() => onUploaded(result.receipt_id)}>
              {t("upload.reviewButton")}
            </PrimaryButton>
          </div>
        ) : null}
      </Card>

      <button
        type="button"
        onClick={onSkip}
        className="block w-full text-center text-xs font-medium tracking-tight text-ink/50 hover:text-ink"
      >
        {t("onboardingUpload.skip")}
      </button>
    </section>
  );
}

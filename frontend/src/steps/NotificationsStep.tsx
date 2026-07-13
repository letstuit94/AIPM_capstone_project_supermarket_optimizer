import { useEffect, useState } from "react";
import { Card } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { getPantry, getNextCart, listReceipts, ApiError } from "@/lib/api";

// Reached via the bell icon in AppShell.tsx's nav. Built entirely from
// signals the app already computes elsewhere — no new backend endpoint,
// no invented data: a pantry-confirmation reminder (GET /pantry), the
// coach's current message + weekly trend (GET /next-cart), and the most
// recent receipt's status (GET /receipts). "Unread" is a light,
// session-only concept (no persistence) — it resets on reload, since
// there's nowhere to store it per-notification without a real backend
// table for this, which is out of scope for a corporate-design pass.

type NotificationKind = "reminder" | "insight" | "receipt" | "progress";

const KIND_ICON: Record<NotificationKind, string> = {
  reminder: "🧺",
  insight: "🌱",
  receipt: "🧾",
  progress: "📈",
};

interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  unread: boolean;
}

const REMINDER_THRESHOLD_DAYS = 3;

export function NotificationsStep({ profileId }: { profileId: string | null }) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // allSettled: none of these three signals depends on the others
      // succeeding — a brand-new session with no receipts yet still has
      // a (empty) pantry response, just no next-cart/receipts to report.
      const [pantryResult, nextCartResult, receiptsResult] = await Promise.allSettled([
        getPantry(),
        getNextCart(profileId ?? undefined),
        listReceipts(),
      ]);

      const built: Notification[] = [];

      if (pantryResult.status === "fulfilled") {
        const days = pantryResult.value.days_since_last_confirmation;
        if (days !== null && days >= REMINDER_THRESHOLD_DAYS) {
          built.push({
            id: "reminder",
            kind: "reminder",
            title: t("notifications.reminderTitle"),
            detail: t("notifications.reminderDetail").replace("{days}", String(days)),
            unread: true,
          });
        }
      }

      if (nextCartResult.status === "fulfilled") {
        const rec = nextCartResult.value;
        if (rec.coach_message) {
          built.push({
            id: "insight",
            kind: "insight",
            title: t("notifications.insightTitle"),
            detail: rec.coach_message,
            unread: true,
          });
        }
        if (rec.progress?.has_history && rec.progress.message) {
          built.push({
            id: "progress",
            kind: "progress",
            title: t("notifications.progressTitle"),
            detail: rec.progress.message,
            unread: false,
          });
        }
      }

      if (receiptsResult.status === "fulfilled" && receiptsResult.value.receipts.length > 0) {
        // "newest first" (see api/receipts.py) — index 0 is the latest.
        const latest = receiptsResult.value.receipts[0];
        built.push({
          id: `receipt-${latest.id}`,
          kind: "receipt",
          title: t("notifications.receiptTitle"),
          detail:
            latest.status === "processed"
              ? t("notifications.receiptProcessed")
              : t("notifications.receiptUploaded"),
          unread: false,
        });
      }

      if (!cancelled) {
        setNotifications(built);
        if (
          pantryResult.status === "rejected" &&
          nextCartResult.status === "rejected" &&
          receiptsResult.status === "rejected"
        ) {
          setError(
            nextCartResult.reason instanceof ApiError
              ? nextCartResult.reason.message
              : t("notifications.loadFailed"),
          );
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const hasUnread = notifications.some((n) => n.unread);

  return (
    <section className="space-y-6 px-6 pb-16">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-balance text-3xl font-medium leading-none tracking-tight">
            {t("notifications.title")}
          </h1>
          <p className="mt-2 max-w-[48ch] text-pretty text-sm text-ink/60">{t("notifications.body")}</p>
        </div>
        {hasUnread ? (
          <button
            type="button"
            onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}
            className="shrink-0 text-xs font-medium tracking-tight text-ink/50 hover:text-ink"
          >
            {t("notifications.markAllRead")}
          </button>
        ) : null}
      </header>

      {loading ? <p className="text-sm text-ink/50">{t("notifications.loading")}</p> : null}

      {error ? (
        <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      ) : null}

      {!loading && !error && notifications.length === 0 ? (
        <p className="text-sm text-ink/50">{t("notifications.empty")}</p>
      ) : null}

      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn("flex items-start gap-3", n.unread && "ring-1 ring-accent/40")}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-base">
                {KIND_ICON[n.kind]}
              </span>
              <div className="flex-1 space-y-1">
                <p className={cn("text-sm", n.unread ? "font-semibold text-ink" : "text-ink/70")}>
                  {n.title}
                </p>
                <p className="text-xs text-ink/50">{n.detail}</p>
              </div>
              {n.unread ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" /> : null}
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}

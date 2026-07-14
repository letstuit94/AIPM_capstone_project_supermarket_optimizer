import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";

// Demo entry point, shown before the app shell / nav mounts (see App.tsx) —
// a marketing-style hero, not another internal app screen, but now on the
// same canvas/ink/accent tokens (index.css) as the rest of the app —
// corporate-design pass retired the separate hand-rolled cream/serif
// palette this used to have, so there's one visual identity, not two.
//
// "Log in" leads to the demo account picker (AccountPickerStep.tsx), not
// straight to the dashboard — there's no real auth in this MVP, so
// picking an identity is how the demo simulates "signing in".
export function LandingStep({
  onRegister,
  onLogin,
}: {
  onRegister: () => void;
  onLogin: () => void;
}) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink antialiased">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-8">
        <span className="flex items-center gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Logo className="size-3.5" />
          </span>
          <span className="text-sm font-medium tracking-tight">NutriWise</span>
        </span>
        <div className="flex gap-1 rounded-full bg-surface p-1 text-xs ring-1 ring-black/5">
          {(["en", "de"] as const).map((lng) => (
            <button
              key={lng}
              type="button"
              onClick={() => setLanguage(lng)}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium uppercase tracking-widest transition-colors",
                language === lng ? "bg-ink text-canvas" : "text-ink/50 hover:text-ink",
              )}
            >
              {lng}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <span className="inline-block rounded-full bg-zinc-100 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink/50">
          {t("landing.badge")}
        </span>

        <h1 className="mx-auto mt-6 max-w-2xl text-balance text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          {t("landing.titleLine1")}
          <br />
          <span className="text-accent">{t("landing.titleLine2")}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-[52ch] text-pretty text-base leading-relaxed text-ink/60">
          {t("landing.body")}
        </p>

        <div className="mx-auto mt-10 flex max-w-sm flex-col gap-3">
          <button
            type="button"
            onClick={onRegister}
            className="w-full rounded-full bg-accent px-6 py-4 text-sm font-semibold tracking-tight text-white shadow-sm transition-opacity hover:opacity-90"
          >
            {t("landing.registerCta")}
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="w-full rounded-full bg-transparent px-6 py-3.5 text-sm font-medium tracking-tight text-ink ring-1 ring-black/15 transition-colors hover:bg-zinc-100"
          >
            {t("landing.loginCta")}
          </button>
        </div>

        <p className="mt-4 text-xs text-ink/50">{t("landing.subtext")}</p>

        <div className="relative mt-16 overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-black/5">
          <div className="flex aspect-[16/10] items-end justify-center p-8 sm:aspect-[16/8]">
            <p className="max-w-sm text-pretty text-sm font-medium text-ink/60">
              {t("landing.imageCaption")}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

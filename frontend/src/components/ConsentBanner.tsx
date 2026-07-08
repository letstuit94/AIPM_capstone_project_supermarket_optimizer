import { Card, PrimaryButton, SectionLabel } from "@/components/AppShell";

export function ConsentBanner({ onAccept }: { onAccept: () => void }) {
  return (
    <section className="space-y-8 px-6 pb-16">
      <header className="space-y-2">
        <SectionLabel>Before you start</SectionLabel>
        <h1 className="text-balance text-4xl font-medium leading-none tracking-tight">
          Not medical advice.
        </h1>
        <p className="max-w-[56ch] text-pretty text-base text-ink/60">
          NutriWise estimates your nutrition from what you buy, not what you
          actually eat. It isn't a diagnosis, a meal plan, or medical advice —
          always consult a professional for that.
        </p>
      </header>

      <Card className="space-y-5">
        <ul className="space-y-2 text-sm text-ink/70">
          <li>· Every result is estimated from your shopping habits, not actual intake.</li>
          <li>· Your receipt and profile answers are processed only to generate this recommendation.</li>
          <li>· You can permanently delete your receipt and profile at any time via "Delete my data" in the footer.</li>
          <li>· Nothing is shared with third parties.</li>
        </ul>
        <PrimaryButton onClick={onAccept}>I understand, continue</PrimaryButton>
      </Card>
    </section>
  );
}

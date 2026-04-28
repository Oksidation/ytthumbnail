import { Check } from "lucide-react";
import { Container } from "@/components/site/Container";
import { CREDIT_PACKS } from "@/lib/stripe";
import { BuyButton } from "./BuyButton";

const FEATURES_BY_PACK: Record<string, string[]> = {
  starter: [
    "30 thumbnail credits",
    "1, 2, or 4 variations per generation",
    "Reference image upload",
    "All style presets",
    "Credits never expire",
  ],
  pro: [
    "100 thumbnail credits",
    "Everything in Starter",
    "Priority generation queue",
    "Generation history & re-prompts",
    "Better per-image price ($0.25)",
  ],
  studio: [
    "400 thumbnail credits",
    "Everything in Pro",
    "Best per-image price ($0.20)",
    "Bulk download as ZIP",
    "Email support",
  ],
};

export function PricingTable() {
  return (
    <section id="pricing" className="border-y border-border/60 bg-muted/20 py-20 md:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
            Pricing
          </p>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Pay once. Use anytime.
          </h2>
          <p className="mt-4 text-muted-foreground">
            No subscriptions. No monthly resets. Buy a pack of credits, spend
            them whenever — they never expire.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`relative rounded-2xl border p-6 ${
                pack.popular
                  ? "border-accent bg-background glow-accent"
                  : "border-border/60 bg-background"
              }`}
            >
              {pack.popular ? (
                <span className="absolute -top-3 right-4 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-accent-foreground">
                  Most popular
                </span>
              ) : null}
              <h3 className="text-lg font-semibold">{pack.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black">{pack.priceLabel}</span>
                <span className="text-sm text-muted-foreground">one-time</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {pack.credits} credits · ${(pack.perImageCents / 100).toFixed(2)}/image
              </p>

              <BuyButton pack={pack.id} popular={pack.popular}>
                Buy {pack.name}
              </BuyButton>

              <ul className="mt-6 space-y-2 text-sm">
                {FEATURES_BY_PACK[pack.id].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 text-accent" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New accounts get <span className="text-foreground">3 free credits</span> on signup. No card required.
        </p>
      </Container>
    </section>
  );
}

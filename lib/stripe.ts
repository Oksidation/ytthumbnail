import "server-only";
import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  cached = new Stripe(requireEnv("STRIPE_SECRET_KEY", "Stripe checkout"), {
    apiVersion: "2026-04-22.dahlia",
  });
  return cached;
}

export type CreditPackId = "starter" | "pro" | "studio";

export interface CreditPack {
  id: CreditPackId;
  name: string;
  credits: number;
  priceCents: number;
  priceLabel: string;
  perImageCents: number;
  /** Resolves the env var name; the actual price ID comes from process.env. */
  envKey: "STRIPE_PRICE_STARTER" | "STRIPE_PRICE_PRO" | "STRIPE_PRICE_STUDIO";
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 30,
    priceCents: 900,
    priceLabel: "$9",
    perImageCents: 30,
    envKey: "STRIPE_PRICE_STARTER",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 100,
    priceCents: 2500,
    priceLabel: "$25",
    perImageCents: 25,
    envKey: "STRIPE_PRICE_PRO",
    popular: true,
  },
  {
    id: "studio",
    name: "Studio",
    credits: 400,
    priceCents: 7900,
    priceLabel: "$79",
    perImageCents: 20,
    envKey: "STRIPE_PRICE_STUDIO",
  },
];

export function getCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function getStripePriceId(pack: CreditPack): string {
  return requireEnv(pack.envKey, "Stripe checkout");
}

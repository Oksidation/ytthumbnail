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

export interface ReceiptInfo {
  paymentIntentId: string;
  amountCents: number;
  currency: string;
  paidAt: Date | null;
  status: "paid" | "pending" | "failed";
  receiptUrl: string | null;
  packName: string | null;
}

/**
 * Fetch a single payment intent + its latest charge so we can show the
 * Stripe-hosted receipt URL on the account page. Returns null if the PI is
 * inaccessible (deleted, wrong account, network failure).
 */
export async function fetchReceipt(
  paymentIntentId: string,
  expectedCredits?: number,
): Promise<ReceiptInfo | null> {
  try {
    const pi = await stripe().paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    const charge =
      pi.latest_charge && typeof pi.latest_charge !== "string"
        ? pi.latest_charge
        : null;

    const status: ReceiptInfo["status"] =
      pi.status === "succeeded"
        ? "paid"
        : pi.status === "requires_payment_method" || pi.status === "canceled"
          ? "failed"
          : "pending";

    const packName =
      typeof expectedCredits === "number"
        ? (CREDIT_PACKS.find((p) => p.credits === expectedCredits)?.name ?? null)
        : null;

    return {
      paymentIntentId: pi.id,
      amountCents: pi.amount_received ?? pi.amount,
      currency: pi.currency,
      paidAt: pi.created ? new Date(pi.created * 1000) : null,
      status,
      receiptUrl: charge?.receipt_url ?? null,
      packName,
    };
  } catch {
    return null;
  }
}

export async function fetchReceipts(
  payments: Array<{ paymentIntentId: string; credits: number }>,
): Promise<ReceiptInfo[]> {
  const settled = await Promise.allSettled(
    payments.map((p) => fetchReceipt(p.paymentIntentId, p.credits)),
  );
  return settled
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((r): r is ReceiptInfo => r !== null);
}

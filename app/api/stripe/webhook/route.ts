import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireEnv } from "@/lib/env";

// Stripe webhooks need the raw request body for signature verification.
// Do not parse it.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      rawBody,
      sig,
      requireEnv("STRIPE_WEBHOOK_SECRET", "Stripe webhook"),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "verify_failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    // We only care about the completed-checkout event; ignore the rest.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const userId = session.metadata?.user_id;
  const credits = Number(session.metadata?.credits ?? "0");
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!userId || !credits || !paymentIntentId) {
    return NextResponse.json({ error: "missing_metadata" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("topup_credits", {
    p_user_id: userId,
    p_amount: credits,
    p_stripe_payment_intent_id: paymentIntentId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

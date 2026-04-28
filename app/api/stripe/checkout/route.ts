import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { stripe, getCreditPack, getStripePriceId } from "@/lib/stripe";
import { serverEnv } from "@/lib/env";

const schema = z.object({
  pack: z.enum(["starter", "pro", "studio"]),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_pack" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pack = getCreditPack(parsed.data.pack);
  if (!pack) {
    return NextResponse.json({ error: "invalid_pack" }, { status: 400 });
  }

  const env = serverEnv();
  const priceId = getStripePriceId(pack);

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    success_url: `${env.NEXT_PUBLIC_SITE_URL}/account?topup=success`,
    cancel_url: `${env.NEXT_PUBLIC_SITE_URL}/pricing?topup=cancelled`,
    // The webhook reads these to credit the right account with the right amount.
    metadata: {
      user_id: user.id,
      pack_id: pack.id,
      credits: pack.credits.toString(),
    },
    payment_intent_data: {
      metadata: {
        user_id: user.id,
        pack_id: pack.id,
        credits: pack.credits.toString(),
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "stripe_no_url" }, { status: 500 });
  }
  return NextResponse.json({ url: session.url });
}

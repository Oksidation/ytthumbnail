"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.email(),
  next: z.string().optional(),
});

export type SendMagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

export async function sendMagicLink(
  _prev: SendMagicLinkState,
  formData: FormData,
): Promise<SendMagicLinkState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: "Please enter a valid email." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const callbackUrl = new URL("/auth/callback", siteUrl);
  if (parsed.data.next) {
    callbackUrl.searchParams.set("next", parsed.data.next);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }
  return { status: "sent", email: parsed.data.email };
}

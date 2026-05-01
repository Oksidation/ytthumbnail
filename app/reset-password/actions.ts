"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.email() });

export type ResetState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: "Please enter a valid email." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  // After clicking the email link, Supabase sends the user to /auth/callback
  // (which exchanges the code) and we forward them to /auth/reset to set the
  // new password.
  const callbackUrl = new URL("/auth/callback", siteUrl);
  callbackUrl.searchParams.set("next", "/auth/reset");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl.toString(),
  });

  if (error) {
    return { status: "error", message: error.message };
  }
  return { status: "sent", email: parsed.data.email };
}

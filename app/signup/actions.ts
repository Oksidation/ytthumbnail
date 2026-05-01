"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  next: z.string().optional(),
});

export type SignupState =
  | { status: "idle" }
  | { status: "confirm"; email: string }
  | { status: "error"; message: string };

export async function signupWithPassword(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Email must be valid and password at least 8 characters.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const callbackUrl = new URL("/auth/callback", siteUrl);
  if (parsed.data.next) {
    callbackUrl.searchParams.set("next", parsed.data.next);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: callbackUrl.toString() },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  // If Supabase requires email confirmation, no session is returned.
  // If confirmation is disabled, we get a session and can go straight in.
  if (!data.session) {
    return { status: "confirm", email: parsed.data.email };
  }

  const next = parsed.data.next;
  redirect(next && next.startsWith("/") ? next : "/dashboard");
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export type LoginState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function loginWithPassword(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: "Please enter a valid email and password." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  const next = parsed.data.next;
  redirect(next && next.startsWith("/") ? next : "/dashboard");
}

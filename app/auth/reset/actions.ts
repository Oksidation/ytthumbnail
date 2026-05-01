"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  password: z.string().min(8).max(128),
});

export type UpdateState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function updatePasswordAction(
  _prev: UpdateState,
  formData: FormData,
): Promise<UpdateState> {
  const parsed = schema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Password must be at least 8 characters.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message: "Reset link expired or invalid. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  redirect("/dashboard");
}

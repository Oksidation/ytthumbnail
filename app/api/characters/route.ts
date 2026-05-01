import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CharacterRow } from "@/lib/db-types";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  imagePaths: z.array(z.string().min(1)).min(1).max(5),
});

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: characters, error } = await supabase
    .from("characters")
    .select("id, user_id, name, image_paths, created_at")
    .order("created_at", { ascending: false })
    .returns<CharacterRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ characters: characters ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Each image path must belong to this user (storage RLS already enforces
  // upload ownership via the references bucket policies, but we double-check).
  for (const path of parsed.data.imagePaths) {
    if (!path.startsWith(`${user.id}/`)) {
      return NextResponse.json(
        { error: "invalid_image_path", path },
        { status: 400 },
      );
    }
  }

  const { data, error } = await supabase
    .from("characters")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      image_paths: parsed.data.imagePaths,
    })
    .select("id, user_id, name, image_paths, created_at")
    .single<CharacterRow>();

  if (error || !data) {
    return NextResponse.json(
      { error: "insert_failed", message: error?.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ character: data });
}

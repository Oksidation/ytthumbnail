import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generationRateLimit } from "@/lib/ratelimit";
import { moderatePrompt } from "@/lib/moderation";
import { generateConcepts } from "@/lib/concepts";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  title: z.string().min(4).max(200),
  count: z.union([z.literal(8), z.literal(12), z.literal(20)]),
  stylePreset: z.string().optional(),
  referencePath: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
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

  // Reuse the generation rate limiter to protect against concept-spam too.
  const limiter = generationRateLimit();
  if (limiter) {
    const limit = await limiter.limit(`concepts:${user.id}`);
    if (!limit.success) {
      return NextResponse.json(
        { error: "rate_limited", retryAfter: limit.reset },
        { status: 429 },
      );
    }
  }

  // Moderate the user's title before sending it to the LLM.
  const mod = await moderatePrompt(parsed.data.title);
  if (!mod.ok) {
    return NextResponse.json(
      { error: "moderated", message: mod.reason },
      { status: 400 },
    );
  }

  // Confirm reference path (if provided) belongs to this user.
  let referencePath: string | null = null;
  if (parsed.data.referencePath) {
    if (!parsed.data.referencePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "invalid_reference" }, { status: 400 });
    }
    referencePath = parsed.data.referencePath;
  }

  let concepts;
  try {
    concepts = await generateConcepts({
      title: parsed.data.title,
      count: parsed.data.count,
      stylePresetId: parsed.data.stylePreset,
      hasReference: Boolean(referencePath),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "concept_failure";
    return NextResponse.json({ error: "concept_failure", message }, { status: 502 });
  }

  // Persist via service-role to insert concept_set + concepts atomically-ish.
  const admin = createSupabaseAdminClient();
  const { data: setRow, error: setErr } = await admin
    .from("concept_sets")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      style_preset: parsed.data.stylePreset ?? null,
      reference_image_path: referencePath,
      count: parsed.data.count,
    })
    .select("id")
    .single<{ id: string }>();

  if (setErr || !setRow) {
    return NextResponse.json(
      { error: "concept_set_insert_failed", message: setErr?.message },
      { status: 500 },
    );
  }

  const conceptRows = concepts.map((c, i) => ({
    concept_set_id: setRow.id,
    position: i,
    label: c.label,
    badge: c.badge,
    prompt: c.prompt,
  }));

  const { data: insertedConcepts, error: conceptErr } = await admin
    .from("concepts")
    .insert(conceptRows)
    .select("id, position, label, badge, prompt");

  if (conceptErr) {
    // Best-effort cleanup of the empty set.
    await admin.from("concept_sets").delete().eq("id", setRow.id);
    return NextResponse.json(
      { error: "concept_insert_failed", message: conceptErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    conceptSetId: setRow.id,
    concepts: insertedConcepts,
  });
}

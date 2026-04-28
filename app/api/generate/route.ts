import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generationRateLimit } from "@/lib/ratelimit";
import { moderatePrompt } from "@/lib/moderation";
import { generateImages } from "@/lib/openai";
import { buildPrompt } from "@/lib/presets";

export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z
  .object({
    prompt: z.string().min(8).max(500),
    stylePreset: z.string().optional(),
    variations: z.number().int().min(1).max(4),
    referencePath: z.string().optional(),
    parentGenerationId: z.uuid().optional(),
    parentOutputIndex: z.number().int().min(0).max(3).optional(),
  })
  .refine(
    (v) =>
      !(v.referencePath && v.parentGenerationId),
    { message: "referencePath and parentGenerationId are mutually exclusive" },
  )
  .refine(
    (v) =>
      v.parentGenerationId
        ? typeof v.parentOutputIndex === "number"
        : true,
    { message: "parentOutputIndex is required when parentGenerationId is set" },
  );

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  // 1. Authenticate
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Rate-limit: 10 per hour per user (skipped if Upstash not configured).
  const limiter = generationRateLimit();
  if (limiter) {
    const limit = await limiter.limit(user.id);
    if (!limit.success) {
      return NextResponse.json(
        { error: "rate_limited", retryAfter: limit.reset },
        { status: 429 },
      );
    }
  }

  // 3. Moderate
  const mod = await moderatePrompt(parsed.data.prompt);
  if (!mod.ok) {
    return NextResponse.json({ error: "moderated", message: mod.reason }, { status: 400 });
  }

  // 4. Resolve reference image source.
  //    - User-uploaded: parsed.data.referencePath in `references` bucket
  //    - Edit chain: parent's output[i] in `thumbnails` bucket
  let referencePath: string | null = null;
  let referenceBucket: "references" | "thumbnails" = "references";
  let parentGenerationId: string | null = null;
  let parentOutputIndex: number | null = null;

  if (parsed.data.referencePath) {
    if (!parsed.data.referencePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "invalid_reference" }, { status: 400 });
    }
    referencePath = parsed.data.referencePath;
    referenceBucket = "references";
  } else if (parsed.data.parentGenerationId) {
    // RLS scopes this to the current user's rows only.
    const { data: parent, error: parentErr } = await supabase
      .from("generations")
      .select("id, output_paths, status")
      .eq("id", parsed.data.parentGenerationId)
      .single<{ id: string; output_paths: string[]; status: string }>();

    if (parentErr || !parent) {
      return NextResponse.json({ error: "parent_not_found" }, { status: 404 });
    }
    if (parent.status !== "completed") {
      return NextResponse.json({ error: "parent_not_completed" }, { status: 400 });
    }
    const idx = parsed.data.parentOutputIndex!;
    if (idx >= parent.output_paths.length) {
      return NextResponse.json({ error: "parent_index_out_of_range" }, { status: 400 });
    }
    referencePath = parent.output_paths[idx];
    referenceBucket = "thumbnails";
    parentGenerationId = parent.id;
    parentOutputIndex = idx;
  }

  const admin = createSupabaseAdminClient();

  // 5. Atomic credit debit + generations row insert
  const { data: debitRows, error: debitError } = await admin.rpc(
    "debit_credits_for_generation",
    {
      p_user_id: user.id,
      p_amount: parsed.data.variations,
      p_prompt: parsed.data.prompt,
      p_style_preset: parsed.data.stylePreset ?? null,
      p_reference_image_path: referencePath,
      p_variations: parsed.data.variations,
      p_parent_generation_id: parentGenerationId,
      p_parent_output_index: parentOutputIndex,
    },
  );

  if (debitError) {
    if (debitError.message.includes("insufficient_credits")) {
      return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });
    }
    return NextResponse.json({ error: debitError.message }, { status: 500 });
  }

  const generationId = (debitRows as Array<{ generation_id: string }>)[0]?.generation_id;
  if (!generationId) {
    return NextResponse.json({ error: "debit_no_id" }, { status: 500 });
  }

  // From here on, ANY failure must refund the credits before returning.
  try {
    // 6. Optionally fetch reference image (from the bucket resolved above)
    let referenceBuffer: Buffer | undefined;
    let referenceContentType: string | undefined;
    if (referencePath) {
      const { data: refData, error: refError } = await admin.storage
        .from(referenceBucket)
        .download(referencePath);
      if (refError || !refData) throw new Error("reference_download_failed");
      referenceBuffer = Buffer.from(await refData.arrayBuffer());
      referenceContentType = refData.type;
    }

    // 7. Call OpenAI
    const buffers = await generateImages({
      prompt: buildPrompt(parsed.data.prompt, parsed.data.stylePreset),
      variations: parsed.data.variations,
      referenceImage: referenceBuffer,
      referenceImageContentType: referenceContentType,
    });

    // 8. Resize to 1280x720 and upload
    const outputPaths: string[] = [];
    for (let i = 0; i < buffers.length; i++) {
      const resized = await sharp(buffers[i])
        .resize(1280, 720, { fit: "cover" })
        .png({ quality: 90 })
        .toBuffer();
      const path = `${user.id}/${generationId}/${i}.png`;
      const { error: upErr } = await admin.storage
        .from("thumbnails")
        .upload(path, resized, { contentType: "image/png", upsert: true });
      if (upErr) throw new Error(`upload_failed_${i}: ${upErr.message}`);
      outputPaths.push(path);
    }

    // 9. Mark complete
    const { error: updErr } = await admin
      .from("generations")
      .update({ status: "completed", output_paths: outputPaths })
      .eq("id", generationId);
    if (updErr) throw new Error(`status_update_failed: ${updErr.message}`);

    return NextResponse.json({ generationId, outputPaths });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";

    // Refund credits + mark failed
    await admin.rpc("refund_credits", {
      p_user_id: user.id,
      p_amount: parsed.data.variations,
      p_generation_id: generationId,
    });
    await admin
      .from("generations")
      .update({ status: "failed", error: message })
      .eq("id", generationId);

    return NextResponse.json(
      { error: "generation_failed", message },
      { status: 500 },
    );
  }
}

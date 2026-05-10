import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generationRateLimit } from "@/lib/ratelimit";
import { moderatePrompt } from "@/lib/moderation";
import { generateImages } from "@/lib/openai";
import { buildPrompt } from "@/lib/presets";
import { proofreadImage } from "@/lib/image-critic";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_IMAGE_PROOFREAD_ROUNDS = 3;

const schema = z
  .object({
    // `prompt` is required UNLESS `conceptId` is provided (then we read it
    // from the concept row server-side). We can't make it conditional in pure
    // Zod cleanly, so we default to optional + .refine() below.
    prompt: z.string().min(8).max(2000).optional(),
    stylePreset: z.string().optional(),
    variations: z.number().int().min(1).max(4),
    referencePath: z.string().optional(),
    parentGenerationId: z.uuid().optional(),
    parentOutputIndex: z.number().int().min(0).max(3).optional(),
    conceptId: z.uuid().optional(),
    batchId: z.uuid().optional(),
  })
  .refine(
    (v) =>
      [v.referencePath, v.parentGenerationId, v.conceptId].filter(Boolean)
        .length <= 1,
    {
      message:
        "referencePath, parentGenerationId, and conceptId are mutually exclusive",
    },
  )
  .refine(
    (v) =>
      v.parentGenerationId
        ? typeof v.parentOutputIndex === "number"
        : true,
    { message: "parentOutputIndex is required when parentGenerationId is set" },
  )
  .refine(
    (v) => Boolean(v.prompt) || Boolean(v.conceptId),
    { message: "prompt is required (unless conceptId is provided)" },
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

  // 3. Resolve effective prompt + style + references based on input source.
  //    Three mutually-exclusive paths (enforced by Zod):
  //      (a) referencePath: one-off user-uploaded reference + free-form prompt
  //      (b) parentGenerationId: edit existing thumbnail + free-form edit prompt
  //      (c) conceptId: render an LLM-generated concept (uses concept's prompt
  //          + concept set's style + reference OR character images)
  let effectivePrompt = parsed.data.prompt ?? "";
  let effectiveStylePreset: string | null = parsed.data.stylePreset ?? null;
  // Reference sources: ALL come from the same bucket, but may be multiple
  // images (character) or a single image (one-off / parent edit).
  const refSources: { path: string; bucket: "references" | "thumbnails" }[] = [];
  let primaryReferencePath: string | null = null;
  let parentGenerationId: string | null = null;
  let parentOutputIndex: number | null = null;
  let conceptId: string | null = null;

  if (parsed.data.referencePath) {
    if (!parsed.data.referencePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "invalid_reference" }, { status: 400 });
    }
    refSources.push({ path: parsed.data.referencePath, bucket: "references" });
    primaryReferencePath = parsed.data.referencePath;
  } else if (parsed.data.parentGenerationId) {
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
    refSources.push({ path: parent.output_paths[idx], bucket: "thumbnails" });
    primaryReferencePath = parent.output_paths[idx];
    parentGenerationId = parent.id;
    parentOutputIndex = idx;
  } else if (parsed.data.conceptId) {
    // RLS via concept_sets join enforces ownership.
    const { data: concept, error: conceptErr } = await supabase
      .from("concepts")
      .select(
        "id, prompt, concept_set_id, concept_sets!inner(style_preset, reference_image_path, character_id, user_id)",
      )
      .eq("id", parsed.data.conceptId)
      .single<{
        id: string;
        prompt: string;
        concept_set_id: string;
        concept_sets: {
          style_preset: string | null;
          reference_image_path: string | null;
          character_id: string | null;
          user_id: string;
        };
      }>();

    if (conceptErr || !concept) {
      return NextResponse.json({ error: "concept_not_found" }, { status: 404 });
    }
    effectivePrompt = concept.prompt;
    effectiveStylePreset = concept.concept_sets.style_preset;
    conceptId = concept.id;

    // Character takes precedence over single reference if both exist.
    if (concept.concept_sets.character_id) {
      const { data: character } = await supabase
        .from("characters")
        .select("image_paths")
        .eq("id", concept.concept_sets.character_id)
        .single<{ image_paths: string[] }>();
      if (character?.image_paths?.length) {
        for (const path of character.image_paths) {
          refSources.push({ path, bucket: "references" });
        }
        primaryReferencePath = character.image_paths[0];
      }
    } else if (concept.concept_sets.reference_image_path) {
      refSources.push({
        path: concept.concept_sets.reference_image_path,
        bucket: "references",
      });
      primaryReferencePath = concept.concept_sets.reference_image_path;
    }
  }

  // 4. Moderate the effective prompt (concepts already moderated via title,
  //    but the LLM-generated prompt itself is freshly checked here).
  const mod = await moderatePrompt(effectivePrompt);
  if (!mod.ok) {
    return NextResponse.json({ error: "moderated", message: mod.reason }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // 5. Atomic credit debit + generations row insert
  const { data: debitRows, error: debitError } = await admin.rpc(
    "debit_credits_for_generation",
    {
      p_user_id: user.id,
      p_amount: parsed.data.variations,
      p_prompt: effectivePrompt,
      p_style_preset: effectiveStylePreset,
      p_reference_image_path: primaryReferencePath,
      p_variations: parsed.data.variations,
      p_parent_generation_id: parentGenerationId,
      p_parent_output_index: parentOutputIndex,
      p_batch_id: parsed.data.batchId ?? null,
      p_concept_id: conceptId,
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
    // 6. Download all reference images in parallel (1-5 of them) and normalize
    //    each one through sharp before sending to OpenAI. The image edit
    //    endpoint rejects images in unusual color modes (CMYK from print
    //    workflows, palette PNG, wide-gamut Display P3 from iPhone, alpha
    //    channels) with a 400 "invalid image file or mode" error. Forcing
    //    everything through sharp → 8-bit sRGB JPEG eliminates that class of
    //    failures regardless of what the user uploaded.
    const referenceImages = await Promise.all(
      refSources.map(async ({ path, bucket }) => {
        const { data: refData, error: refError } = await admin.storage
          .from(bucket)
          .download(path);
        if (refError || !refData) {
          throw new Error(`reference_download_failed: ${path}`);
        }
        const raw = Buffer.from(await refData.arrayBuffer());
        try {
          const normalized = await sharp(raw)
            .rotate() // honor EXIF orientation (must be the first transform)
            .flatten({ background: "#ffffff" }) // strip alpha onto white
            .toColorspace("srgb")
            .jpeg({ quality: 95 })
            .toBuffer();
          return { buffer: normalized, contentType: "image/jpeg" };
        } catch (e) {
          throw new Error(
            `reference_decode_failed (${path}): ${
              e instanceof Error ? e.message : "unknown"
            }`,
          );
        }
      }),
    );

    // 7. Call OpenAI. For concept-driven renders the prompt is already a
    //    complete LLM-authored prompt — don't re-append style suffixes.
    const finalPrompt = conceptId
      ? effectivePrompt
      : buildPrompt(effectivePrompt, effectiveStylePreset ?? undefined);
    const initialBuffers = await generateImages({
      prompt: finalPrompt,
      variations: parsed.data.variations,
      referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
    });

    // 7b. Vision proofread loop.
    //    Skip for user-driven edits (parentGenerationId): in that flow the user
    //    explicitly asked to change one specific thing and we trust their
    //    intent. Auto-proofreading would revert their edits.
    //    For initial concept-driven and one-off reference renders: run the
    //    critic; if it fails, edit with the critic's edit_prompt as the
    //    instruction and the current image as the primary reference.
    const skipProofread = Boolean(parsed.data.parentGenerationId);
    const finalBuffers: Buffer[] = [];
    for (let i = 0; i < initialBuffers.length; i++) {
      let current = initialBuffers[i];

      if (!skipProofread) {
        for (let round = 1; round <= MAX_IMAGE_PROOFREAD_ROUNDS; round++) {
          let verdict;
          try {
            verdict = await proofreadImage({
              imageBuffer: current,
              imageMimeType: "image/png",
              conceptPrompt: finalPrompt,
            });
          } catch (err) {
            console.warn(
              `[image-critic] variation ${i} round ${round}: critic call failed, shipping current — ${
                err instanceof Error ? err.message : "unknown"
              }`,
            );
            break;
          }

          console.info(
            `[image-critic] variation ${i} round ${round}: pass=${verdict.pass}` +
              (verdict.pass ? "" : ` — ${verdict.reason}`),
          );

          if (verdict.pass) break;
          if (round === MAX_IMAGE_PROOFREAD_ROUNDS) {
            console.warn(
              `[image-critic] variation ${i}: max rounds (${MAX_IMAGE_PROOFREAD_ROUNDS}) hit — shipping last edited version`,
            );
            break;
          }
          if (!verdict.editPrompt) {
            console.warn(
              `[image-critic] variation ${i}: critic failed without an editPrompt — shipping current`,
            );
            break;
          }

          // Edit: pass the current image as the primary reference plus the
          // original character/reference images if any (preserves face fidelity).
          try {
            const edited = await generateImages({
              prompt: verdict.editPrompt,
              variations: 1,
              referenceImages: [
                { buffer: current, contentType: "image/png" },
                ...referenceImages,
              ],
            });
            if (edited[0]) {
              current = edited[0];
            } else {
              console.warn(
                `[image-critic] variation ${i} round ${round}: edit returned no buffer — shipping prior`,
              );
              break;
            }
          } catch (err) {
            console.warn(
              `[image-critic] variation ${i} round ${round}: edit call failed, shipping prior — ${
                err instanceof Error ? err.message : "unknown"
              }`,
            );
            break;
          }
        }
      }

      finalBuffers.push(current);
    }

    // 8. Resize to 1280x720 and upload
    const outputPaths: string[] = [];
    for (let i = 0; i < finalBuffers.length; i++) {
      const resized = await sharp(finalBuffers[i])
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

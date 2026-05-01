import "server-only";
import OpenAI from "openai";
import { serverEnv } from "@/lib/env";

let cached: OpenAI | null = null;

export function openai(): OpenAI {
  if (cached) return cached;
  cached = new OpenAI({ apiKey: serverEnv().OPENAI_API_KEY });
  return cached;
}

export interface GenerateImagesInput {
  prompt: string;
  variations: number;
  /** Optional reference image as a Buffer (e.g., user's face). */
  referenceImage?: Buffer;
  referenceImageContentType?: string;
}

/**
 * Calls the OpenAI image model and returns N PNG buffers (one per variation).
 * The buffers are at the model's native size; resize/crop to 1280x720 happens
 * downstream with sharp.
 */
export async function generateImages(
  input: GenerateImagesInput,
): Promise<Buffer[]> {
  const env = serverEnv();
  const model = env.OPENAI_IMAGE_MODEL;
  const client = openai();

  // gpt-image-2 supports flexible sizes (any multiple of 16, ratio <=3:1,
  // max edge 3840). 1280x720 is YouTube's native thumbnail spec, so we
  // request it directly — no cropping, no text clipping.
  // (gpt-image-1/1.5 only support 1024x1024, 1536x1024, 1024x1536. The cast
  // bypasses the SDK's stricter type which hasn't been updated for v2 yet.)
  const size = "1280x720" as "1024x1024";

  // gpt-image-2 doesn't accept input_fidelity (always high) — sending it
  // would error. gpt-image-1/1.5 do accept it. We detect by model name.
  const isV2 = model.startsWith("gpt-image-2");

  let response: { data?: Array<{ b64_json?: string | null }> };
  if (input.referenceImage) {
    const file = await OpenAI.toFile(
      input.referenceImage,
      "reference.png",
      { type: input.referenceImageContentType ?? "image/png" },
    );
    const editParams: Record<string, unknown> = {
      model,
      prompt: input.prompt,
      n: input.variations,
      size,
      image: file,
      quality: "medium",
    };
    if (!isV2) {
      // For gpt-image-1.x: explicitly preserve face/brand fidelity.
      editParams.input_fidelity = "high";
    }
    response = (await client.images.edit(
      editParams as unknown as Parameters<typeof client.images.edit>[0],
    )) as typeof response;
  } else {
    response = (await client.images.generate({
      model,
      prompt: input.prompt,
      n: input.variations,
      size,
      quality: "medium",
    } as Parameters<typeof client.images.generate>[0])) as typeof response;
  }

  const data = response.data ?? [];
  if (data.length === 0) {
    throw new Error("openai_no_images_returned");
  }

  return data.map((d) => {
    if (!d.b64_json) throw new Error("openai_missing_b64");
    return Buffer.from(d.b64_json, "base64");
  });
}

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

  // 1536x1024 is the widest 3:2 size accepted by gpt-image. We resize to
  // 1280x720 with sharp downstream.
  const size = "1536x1024";

  let response: { data?: Array<{ b64_json?: string | null }> };
  if (input.referenceImage) {
    const file = await OpenAI.toFile(
      input.referenceImage,
      "reference.png",
      { type: input.referenceImageContentType ?? "image/png" },
    );
    response = (await client.images.edit({
      model,
      prompt: input.prompt,
      n: input.variations,
      size,
      image: file,
    } as Parameters<typeof client.images.edit>[0])) as typeof response;
  } else {
    response = (await client.images.generate({
      model,
      prompt: input.prompt,
      n: input.variations,
      size,
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

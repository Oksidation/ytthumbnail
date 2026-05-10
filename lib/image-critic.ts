import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { requireEnv, serverEnv } from "@/lib/env";

export interface ImageVerdict {
  pass: boolean;
  reason: string | null;
  editPrompt: string | null;
}

let cached: Anthropic | null = null;

function anthropic(): Anthropic {
  if (cached) return cached;
  cached = new Anthropic({
    apiKey: requireEnv("ANTHROPIC_API_KEY", "image critic"),
  });
  return cached;
}

// =============================================================================
// SYSTEM PROMPT — strict thumbnail-shipping reviewer. Static, cached.
// =============================================================================
const SYSTEM_PROMPT = `You are a senior YouTube thumbnail quality reviewer. You see the rendered image and decide whether it's ready to ship to a creator. You compare the image against the original concept brief and look for issues only a human creator would catch.

You are STRICT. If the image has even one shippable defect, you fail it — the edit step is cheap and shipping a polished thumbnail matters more than throughput.

# Pass criteria (ALL must hold)

1. **Overlay text is legible and spelled correctly** — every word is readable at thumbnail size, no AI typos, no garbled letterforms, no missing characters. If the concept specified exact text in quotes, the rendered text MUST match those exact words.

2. **Composition matches the concept** — the focal subject described in the concept brief is actually visible, dominant, and positioned roughly where the brief asked. Pattern (Shocked Face, Big Number, etc.) reads at a glance.

3. **No image artifacts** — no extra limbs, distorted hands, broken faces, melted features, double pupils, gibberish micro-text in the background, broken edges, weird object morphology.

4. **Mobile-readable at thumbnail size** — when shrunk to ~200×113 px the main subject and overlay text still register. High contrast, no muddy mid-tones.

5. **Brand-safe** — no NSFW content, no slurs, no logos of real brands or copyrighted IP, no inappropriate imagery.

6. **Aspect and framing intact** — 16:9 composition, no critical content cropped at edges, overlay text fully inside the frame.

7. **Typography directives honored** — overlay text has the specs the concept asked for: heaviest weight, all-caps default, thick outline, drop shadow, white base with one or two highlighted words in vivid yellow or red.

# Output rules

- \`pass\`: true ONLY if all 7 hold. Default to failing on any doubt.
- \`reason\`: null if pass=true. Otherwise one short sentence (max 25 words) naming the SPECIFIC failure(s). Be concrete: name what's wrong and where.
- \`edit_prompt\`: null if pass=true. Otherwise a 1–3 sentence edit instruction that can be sent directly to an AI image editor to fix the issue. Be specific about what to change and what to keep. Examples:
  - "Redo the overlay text to read 'I QUIT MY JOB' exactly, in tall condensed all-caps sans-serif, white letters with 5px black outline. Keep the subject and background unchanged."
  - "Fix the subject's right hand — currently has six fingers. Smooth, anatomically correct hand. Keep everything else the same."
  - "Improve contrast: deepen the background to a darker navy so the white overlay text pops more. Keep composition unchanged."

Do NOT propose edits that would change concept identity (e.g., switching pattern, changing the typography style). Edits target shipping defects, not redirection.`;

const MAX_REASON_FALLBACK = "unspecified rendering defect";

export interface ProofreadImageInput {
  imageBuffer: Buffer;
  imageMimeType?: string;
  conceptPrompt: string;
}

export async function proofreadImage(
  input: ProofreadImageInput,
): Promise<ImageVerdict> {
  const env = serverEnv();
  const model = env.ANTHROPIC_VISION_MODEL;
  const client = anthropic();
  type CreateParams = Parameters<typeof client.messages.create>[0];

  const mediaType = input.imageMimeType ?? "image/png";
  const base64 = input.imageBuffer.toString("base64");

  const userText = `Review this rendered thumbnail against the concept brief below.

Concept brief that produced this image:
"""
${input.conceptPrompt}
"""

Decide pass/fail using the 7 criteria. If fail, name the specific defect and give a concrete edit_prompt that fixes JUST that defect.`;

  const params: CreateParams = {
    model,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["pass", "reason", "edit_prompt"],
          properties: {
            pass: { type: "boolean" },
            reason: {
              type: ["string", "null"],
              description: "Null when pass=true; otherwise <=25 words.",
            },
            edit_prompt: {
              type: ["string", "null"],
              description:
                "Null when pass=true; otherwise 1-3 sentence edit instruction for gpt-image-2.",
            },
          },
        },
      },
    },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          { type: "text", text: userText },
        ],
      },
    ],
  } as unknown as CreateParams;

  const response = await client.messages.create(params);

  const textBlock = (
    response as unknown as { content: Array<{ type: string; text?: string }> }
  ).content.find((b) => b.type === "text" && typeof b.text === "string");

  if (!textBlock || !textBlock.text) {
    throw new Error("image_critic_no_text");
  }

  let parsed: Partial<ImageVerdict>;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error("image_critic_invalid_json");
  }

  if (typeof parsed.pass !== "boolean") {
    throw new Error("image_critic_no_pass");
  }

  const reason =
    parsed.pass === true
      ? null
      : (parsed.reason ?? MAX_REASON_FALLBACK);
  const editPrompt =
    parsed.pass === true ? null : (parsed.editPrompt ?? parsed.reason ?? null);

  return {
    pass: parsed.pass,
    reason,
    editPrompt,
  };
}

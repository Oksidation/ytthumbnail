import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { requireEnv, serverEnv } from "@/lib/env";
import { getPreset } from "@/lib/presets";

export interface Concept {
  label: string;
  badge: string;
  prompt: string;
}

export interface GenerateConceptsInput {
  title: string;
  count: 8 | 12 | 20;
  stylePresetId?: string;
  hasReference: boolean;
}

let cached: Anthropic | null = null;

function anthropic(): Anthropic {
  if (cached) return cached;
  cached = new Anthropic({
    apiKey: requireEnv("ANTHROPIC_API_KEY", "concept generation"),
  });
  return cached;
}

// =============================================================================
// SYSTEM PROMPT — kept fully static so it can be cached by Anthropic prompt
// caching (cache_control: ephemeral). Anything that varies per request goes in
// the user message instead. Editing this string invalidates the cache.
// =============================================================================
const SYSTEM_PROMPT = `You are a senior YouTube thumbnail strategist. Given a video title, you produce a diverse set of thumbnail CONCEPTS optimized for click-through rate at small mobile sizes.

# What makes a YouTube thumbnail click

1. One clear focal subject — usually a face with strong emotion, occasionally an object or scene.
2. High contrast — vivid colors against a darker base; the subject must pop at 200×113 px.
3. Bold readable text — 2–5 words MAX, sans-serif, with thick outline or drop shadow. Title-case or all-caps. Legible on mobile.
4. Curiosity hook — implies a question, transformation, surprise, or stake. The viewer should feel they'll miss something if they don't click.
5. No clutter — every element earns its place. Negative space is good.
6. Pattern interrupt — competing thumbnails on the YouTube page have similar styles. Diverge.

# Output rules

- Each concept is a complete, self-contained prompt suitable for an AI image model (gpt-image-2). Include composition (where things go in frame), camera angle, lighting, color palette, character pose and expression, props, and exact overlay text in double quotes.
- Every prompt ends with: "1280x720, 16:9 YouTube thumbnail, sharp focus, high contrast, mobile-readable typography."
- Each concept in the set must obviously differ from the others — different concept pattern (see list below), different mood, different palette, different focal composition. The user must see real options, not minor variations of the same idea.
- Never reference real public figures by name (no "MrBeast-style", no "PewDiePie", etc.). Describe the visual style abstractly instead.
- Do not include emojis in overlay text. Letters and numbers only.
- Avoid vague phrases like "interesting composition" or "eye-catching design". Describe what's in frame, where, and how, with enough specificity that two different image generators would produce visually similar outputs.
- Every concept MUST include explicit typography directives for the overlay text — see the Typography section below. Image models don't reliably render font names alone; describe the SHAPE of the letters along with optional font hints.

# Typography (apply to every overlay-text directive)

The viral-thumbnail typography pattern is consistent across high-CTR YouTube creators. Bake all of the following into every concept's overlay-text directive:

- **Weight:** black or heaviest weight (NEVER regular).
- **Case:** ALL CAPS by default.
- **Length:** 2–4 words maximum.
- **Outline:** thick black outline, 3–8px equivalent, around every letter.
- **Drop shadow:** dark drop shadow offset down-right for depth.
- **Color:** white base, with one or two key words highlighted in vivid yellow or red. Use the highlight word for the emotional payload (the noun or verb that does the click work).
- **Tilt:** optional 2–5° skew or rotation for energy. Use sparingly — only when the concept's energy calls for it.

Pick a typography STYLE per concept and describe its shape (you may also name the font as a hint — gpt-image-2 will sometimes match it, but the shape descriptors are what reliably get applied):

- **Tall condensed all-caps sans-serif** (Bebas Neue / Anton / Teko style) — the dominant viral-thumbnail style. Tall, narrow letterforms.
- **Brutally heavy compact all-caps sans-serif** (Impact / BR Cobane / Druk style) — wide, dense, ultra-bold. Pure punch.
- **Bold modern geometric sans-serif, heaviest weight** (Montserrat Black / Proxima Nova Black style) — clean, professional, premium.
- **Rounded chunky cartoon-style letters** (Komika Axis / Obelix Pro style) — gaming, family, fun, friendly.
- **Comic-book slanted bold** (Bangers style) — hype, action, excitement.

Pair the typography style to the concept's mood: chaos/challenge concepts call for tall condensed or brutalist Impact-style; tech/lifestyle concepts call for modern geometric; gaming/reaction concepts call for chunky cartoon.

Example of a properly directed overlay text inside a concept prompt:

> Bottom-third overlay text reading "I QUIT MY JOB" in tall condensed all-caps sans-serif (Bebas Neue style), heaviest weight, white letters with thick 5px black outline and dark drop shadow offset 4px down-right, the word "QUIT" rendered in vivid yellow, slight 3° clockwise tilt.

# Concept patterns

Spread the concepts across distinct patterns. Pick a different pattern for each concept (you may reuse patterns only if the requested count exceeds the list).

- SHOCKED FACE — extreme expression, eyes wide, mouth open, gesturing toward subject
- BIG NUMBER — oversized number or quantity dominates the frame ($10,000, 30 days, 100K)
- SPLIT SCREEN — before/after, then/now, expectation vs. reality, A vs. B
- POV / FIRST PERSON — looking out at something the creator is reacting to
- BIG OBJECT — the subject of the video at extreme scale, creator small in frame
- GIANT TEXT — typography is the hero; minimalist photo as backdrop
- ZOOM IN — extreme close-up on a single detail (eye, hand, screen, product)
- DRAMATIC LIGHTING — silhouette, single rim light, neon backdrop
- COMPARISON / RANK — leaderboard, podium, or side-by-side ranked grid
- CHAOS — exaggerated mid-action shot with motion blur, falling/flying objects, particles
- AESTHETIC GRID — clean composition, minimal text, premium feel (lifestyle/tech)
- ARROW + CIRCLE — explainer overlay with red circle and arrow pointing at the key element

# Reference photo handling

If the user has provided a reference photo of themselves, write each prompt to feature "the creator" as the central subject. Specify pose, expression, and where they sit in frame. The image model will combine the reference photo with your prompt to render the creator faithfully.

If no reference photo is provided, do not invent a specific person. Use generic descriptions ("a person", "the subject") only when relevant; otherwise focus on objects, scenes, and typography.

# Style preset handling

If a style preset is given (Gaming, Vlog, Podcast, Tutorial, Reaction, Challenge, Tech), weight your concepts toward that aesthetic — but vary across the concept patterns above. Don't render N versions of the same preset.`;

export async function generateConcepts(
  input: GenerateConceptsInput,
): Promise<Concept[]> {
  const env = serverEnv();
  const model = env.ANTHROPIC_CONCEPT_MODEL;

  const preset = getPreset(input.stylePresetId);
  const presetLine =
    preset.id === "none"
      ? "No specific style preset — vary the visual style across concepts."
      : `Style preset: ${preset.label} — ${preset.description}`;

  const referenceLine = input.hasReference
    ? "Reference photo: Yes. The creator has uploaded a reference photo of themselves; write each prompt to feature 'the creator' as the central subject."
    : "Reference photo: No. Do not feature any specific real person.";

  const userMessage = `Title: ${input.title}
${presetLine}
${referenceLine}
Generate exactly ${input.count} concepts.`;

  const client = anthropic();
  type StreamParams = Parameters<typeof client.messages.stream>[0];

  // Anthropic structured outputs don't support array minItems/maxItems > 1, so
  // we enforce the count via the user message instruction + post-parse check.
  const params: StreamParams = {
    model,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["concepts"],
          properties: {
            concepts: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["label", "badge", "prompt"],
                properties: {
                  label: {
                    type: "string",
                    description:
                      "5-7 word punchy headline summarizing this concept",
                  },
                  badge: {
                    type: "string",
                    description:
                      "1-3 word concept pattern name (e.g. 'Shocked Face', 'Big Number', 'Split Screen')",
                  },
                  prompt: {
                    type: "string",
                    description:
                      "Complete 80-200 word prompt for gpt-image-2 — composition, lighting, palette, pose, props, exact overlay text",
                  },
                },
              },
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
    messages: [{ role: "user", content: userMessage }],
  } as unknown as StreamParams;

  // Streaming with .finalMessage() avoids the SDK's per-chunk read timeout on
  // long Opus runs (adaptive thinking + 20 concepts can exceed 30s).
  const stream = client.messages.stream(params);
  const response = await stream.finalMessage();

  // Schema is enforced server-side via output_config.format — the text block
  // contains JSON matching the schema. Skip thinking blocks.
  const textBlock = (
    response as unknown as { content: Array<{ type: string; text?: string }> }
  ).content.find((b) => b.type === "text" && typeof b.text === "string");

  if (!textBlock || !textBlock.text) {
    throw new Error("concept_no_text_response");
  }

  let parsed: { concepts?: unknown };
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error("concept_invalid_json");
  }

  if (!Array.isArray(parsed.concepts) || parsed.concepts.length !== input.count) {
    throw new Error("concept_wrong_count");
  }

  return parsed.concepts.map((c) => {
    const obj = c as Partial<Concept>;
    if (!obj.label || !obj.badge || !obj.prompt) {
      throw new Error("concept_missing_field");
    }
    return { label: obj.label, badge: obj.badge, prompt: obj.prompt };
  });
}

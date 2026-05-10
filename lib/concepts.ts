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

interface Verdict {
  index: number;
  pass: boolean;
  reason: string | null;
}

const MAX_ROUNDS = 5;

let cached: Anthropic | null = null;

function anthropic(): Anthropic {
  if (cached) return cached;
  cached = new Anthropic({
    apiKey: requireEnv("ANTHROPIC_API_KEY", "concept generation"),
  });
  return cached;
}

// =============================================================================
// GENERATOR SYSTEM PROMPT — static, cached.
// =============================================================================
const GENERATOR_SYSTEM_PROMPT = `You are a senior YouTube thumbnail strategist. Given a video title, you produce a diverse set of thumbnail CONCEPTS optimized for click-through rate at small mobile sizes.

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

// =============================================================================
// CRITIC SYSTEM PROMPT — static, cached. Evaluates each concept against 10
// pass criteria; any failure flips pass=false with a one-sentence reason.
// =============================================================================
const CRITIC_SYSTEM_PROMPT = `You are a senior YouTube thumbnail critic. You evaluate AI-generated thumbnail concepts against high-CTR best practices and decide which ones are good enough to ship and which need to be redone.

You are STRICT. If a concept is even slightly off, fail it — the regeneration step is cheap and quality matters more than throughput.

# Pass criteria

A concept passes ONLY if ALL of the following apply:

1. **Specific focal subject** — names who or what is in frame (a person, an object, a scene), not just a vague "subject".
2. **Composition described** — camera angle, layout (close-up / wide / split-screen / grid / etc.), and where each major element sits in frame.
3. **Overlay-text directive present** — 2–5 words in double quotes, with typography specs that include ALL of: weight (heaviest/black), case (all-caps default), thick outline, drop shadow, color treatment (white base + one or two highlighted words in yellow/red).
4. **Color palette concrete** — names colors or describes contrast specifically; not just "vibrant" or "high contrast" alone.
5. **Curiosity / emotion hook tied to the title** — there's an obvious reason the viewer would click. Implies a question, transformation, stake, or surprise.
6. **One of the named concept patterns** — explicitly uses one of: SHOCKED FACE, BIG NUMBER, SPLIT SCREEN, POV/FIRST PERSON, BIG OBJECT, GIANT TEXT, ZOOM IN, DRAMATIC LIGHTING, COMPARISON/RANK, CHAOS, AESTHETIC GRID, ARROW + CIRCLE.
7. **Not vague** — no "interesting composition", "eye-catching design", "compelling visual", "striking", "dynamic". Every claim must be backed by what's actually in frame.
8. **Not a duplicate of another concept in the same set** — distinct pattern OR distinct focal subject OR distinct palette. Two SHOCKED FACE concepts with the same expression on the same character with similar colors are duplicates.
9. **No real public figures named** — no "MrBeast-style", "PewDiePie", "Trump", etc.
10. **Format-correct** — ends with the required "1280x720, 16:9 YouTube thumbnail, sharp focus, high contrast, mobile-readable typography." footer.

# Output rules

For each concept (by its array index 0..N-1), return:
- \`index\`: the array index in the input
- \`pass\`: true if and only if ALL 10 criteria are satisfied
- \`reason\`: null if pass=true; otherwise a single short sentence (max 20 words) naming the specific failure(s)

Reason examples:
- "vague composition — no focal subject named"
- "no overlay-text directive"
- "missing typography weight/outline/shadow specs"
- "duplicate of concept #3 (same SHOCKED FACE on same subject with similar palette)"
- "missing 1280x720 footer"

Be objective. If unsure, fail it.`;

// =============================================================================
// Builder for the user message — shared by initial generation and the post-
// critique regeneration. Reuses the same shape so the model interprets both
// consistently.
// =============================================================================
function buildUserMessage(
  input: GenerateConceptsInput,
  count: number,
  failuresContext: string | null = null,
): string {
  const preset = getPreset(input.stylePresetId);
  const presetLine =
    preset.id === "none"
      ? "No specific style preset — vary the visual style across concepts."
      : `Style preset: ${preset.label} — ${preset.description}`;

  const referenceLine = input.hasReference
    ? "Reference photo: Yes. The creator has uploaded a reference photo of themselves; write each prompt to feature 'the creator' as the central subject."
    : "Reference photo: No. Do not feature any specific real person.";

  const base = `Title: ${input.title}
${presetLine}
${referenceLine}
Generate exactly ${count} concepts.`;

  if (failuresContext) {
    return `${base}

These are replacement concepts. The previous attempts at these slots were rejected by a quality critic. Each replacement MUST address the corresponding critique:

${failuresContext}

Return exactly ${count} new concepts, in the SAME ORDER as the failures listed above.`;
  }

  return base;
}

// =============================================================================
// Round 1: initial generation
// =============================================================================
async function generateInitial(
  input: GenerateConceptsInput,
): Promise<Concept[]> {
  return callGenerator(input, input.count, null);
}

// =============================================================================
// Replacement generation: feed back the critic's reasons.
// =============================================================================
async function regenerate(
  input: GenerateConceptsInput,
  failures: { concept: Concept; reason: string }[],
): Promise<Concept[]> {
  const context = failures
    .map(
      (f, i) =>
        `${i + 1}. Reason: ${f.reason}\n   Original prompt: ${f.concept.prompt}`,
    )
    .join("\n\n");
  return callGenerator(input, failures.length, context);
}

async function callGenerator(
  input: GenerateConceptsInput,
  count: number,
  failuresContext: string | null,
): Promise<Concept[]> {
  const env = serverEnv();
  const model = env.ANTHROPIC_CONCEPT_MODEL;
  const client = anthropic();
  type StreamParams = Parameters<typeof client.messages.stream>[0];

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
        text: GENERATOR_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      { role: "user", content: buildUserMessage(input, count, failuresContext) },
    ],
  } as unknown as StreamParams;

  const stream = client.messages.stream(params);
  const response = await stream.finalMessage();

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

  if (!Array.isArray(parsed.concepts) || parsed.concepts.length !== count) {
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

// =============================================================================
// Critic: returns pass/fail + reason for each concept.
// =============================================================================
async function proofread(
  concepts: Concept[],
  input: GenerateConceptsInput,
): Promise<Verdict[]> {
  const env = serverEnv();
  const model = env.ANTHROPIC_CONCEPT_MODEL;
  const client = anthropic();
  type StreamParams = Parameters<typeof client.messages.stream>[0];

  const conceptsForReview = concepts
    .map(
      (c, i) =>
        `Concept #${i}: ${c.label} [${c.badge}]
Prompt: ${c.prompt}`,
    )
    .join("\n\n---\n\n");

  const userMessage = `Video title (for context — concepts must hook this): "${input.title}"
Style preset hint: ${getPreset(input.stylePresetId).label}
Number of concepts to review: ${concepts.length}

Concepts to evaluate:

${conceptsForReview}

Return a verdict for each concept (index 0..${concepts.length - 1}).`;

  const params: StreamParams = {
    model,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["verdicts"],
          properties: {
            verdicts: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["index", "pass", "reason"],
                properties: {
                  index: { type: "integer", minimum: 0 },
                  pass: { type: "boolean" },
                  reason: {
                    type: ["string", "null"],
                    description:
                      "null if pass=true; otherwise <=20 words naming the specific failure(s)",
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
        text: CRITIC_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  } as unknown as StreamParams;

  const stream = client.messages.stream(params);
  const response = await stream.finalMessage();

  const textBlock = (
    response as unknown as { content: Array<{ type: string; text?: string }> }
  ).content.find((b) => b.type === "text" && typeof b.text === "string");

  if (!textBlock || !textBlock.text) {
    throw new Error("critic_no_text_response");
  }

  let parsed: { verdicts?: unknown };
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error("critic_invalid_json");
  }

  if (!Array.isArray(parsed.verdicts)) {
    throw new Error("critic_no_verdicts");
  }

  // Build a map by index so we can tolerate out-of-order responses.
  const byIndex = new Map<number, Verdict>();
  for (const v of parsed.verdicts) {
    const obj = v as Partial<Verdict>;
    if (typeof obj.index !== "number" || typeof obj.pass !== "boolean") {
      continue;
    }
    byIndex.set(obj.index, {
      index: obj.index,
      pass: obj.pass,
      reason: obj.pass ? null : (obj.reason ?? "unspecified failure"),
    });
  }

  // Fill missing indices as pass (defensive — shouldn't happen with strict
  // structured outputs but better than throwing).
  return concepts.map(
    (_, i) => byIndex.get(i) ?? { index: i, pass: true, reason: null },
  );
}

// =============================================================================
// Orchestrator. Loops up to MAX_ROUNDS times, regenerating any concept that
// fails the critic with the failure reason fed back as guidance.
// =============================================================================
export async function generateConcepts(
  input: GenerateConceptsInput,
): Promise<Concept[]> {
  let concepts = await generateInitial(input);

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const verdicts = await proofread(concepts, input);
    const failedIndices: number[] = [];
    const failedConcepts: { concept: Concept; reason: string }[] = [];

    for (const v of verdicts) {
      if (!v.pass) {
        failedIndices.push(v.index);
        failedConcepts.push({
          concept: concepts[v.index],
          reason: v.reason ?? "unspecified failure",
        });
      }
    }

    const passCount = concepts.length - failedIndices.length;
    console.info(
      `[concepts] round ${round}: ${passCount}/${concepts.length} passed critic` +
        (failedIndices.length > 0
          ? ` — regenerating ${failedIndices.length} (reasons: ${failedConcepts.map((f) => f.reason).join(" | ")})`
          : ""),
    );

    if (failedIndices.length === 0) break;
    if (round === MAX_ROUNDS) {
      console.warn(
        `[concepts] max rounds (${MAX_ROUNDS}) reached with ${failedIndices.length} concepts still failing — shipping anyway`,
      );
      break;
    }

    const replacements = await regenerate(input, failedConcepts);
    failedIndices.forEach((origIdx, i) => {
      if (replacements[i]) {
        concepts[origIdx] = replacements[i];
      }
    });
  }

  return concepts;
}

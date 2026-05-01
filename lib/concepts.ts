import "server-only";
import { openai } from "@/lib/openai";
import { serverEnv } from "@/lib/env";
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

export async function generateConcepts(
  input: GenerateConceptsInput,
): Promise<Concept[]> {
  const env = serverEnv();
  const model = env.OPENAI_CONCEPT_MODEL;

  const preset = getPreset(input.stylePresetId);
  const presetLine =
    preset.id === "none"
      ? "No specific style preset — vary the visual style across concepts."
      : `Style preset: ${preset.label} — ${preset.description}.`;

  const referenceLine = input.hasReference
    ? "The creator has uploaded a reference photo of themselves; write prompts that feature 'the creator' as the central subject."
    : "No reference photo uploaded; do not feature any specific real person.";

  const system = `You are a YouTube thumbnail strategist. Given a video title, produce ${input.count} distinct thumbnail concepts optimized for high CTR on YouTube.

Each concept must be a complete, self-contained prompt for an AI image generator (gpt-image-2). Describe composition, lighting, character action, color palette, props, and any overlay text. Each prompt should be 60–200 words.

Vary aggressively across the ${input.count} concepts — different compositions (close-up, wide, split-screen, layered), different moods (shocked, triumphant, mysterious, comedic), different palettes, different overlay-text styles, different visual hooks. The user must see real options, not minor variations of the same idea.

Always include a punchy bottom-bar overlay text suggestion in each prompt. Always specify "1280x720, 16:9 aspect ratio".

Output strictly matches the JSON schema provided.`;

  const user = `Title: ${input.title}\n${presetLine}\n${referenceLine}`;

  const client = openai();
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "thumbnail_concepts",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            concepts: {
              type: "array",
              minItems: input.count,
              maxItems: input.count,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  label: {
                    type: "string",
                    description: "5-7 word punchy headline for this concept",
                  },
                  badge: {
                    type: "string",
                    description: "1-2 word style tag (e.g. 'Shock Reaction', 'Split Screen', 'Big Number')",
                  },
                  prompt: {
                    type: "string",
                    description: "Full self-contained prompt for gpt-image-2, 60-200 words",
                  },
                },
                required: ["label", "badge", "prompt"],
              },
            },
          },
          required: ["concepts"],
        },
      },
    },
  } as Parameters<typeof client.chat.completions.create>[0]);

  const content = (response as {
    choices?: Array<{ message?: { content?: string | null } }>;
  }).choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("concept_llm_no_content");
  }

  let parsed: { concepts?: unknown };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("concept_llm_invalid_json");
  }

  if (!Array.isArray(parsed.concepts) || parsed.concepts.length !== input.count) {
    throw new Error("concept_llm_wrong_count");
  }

  return parsed.concepts.map((c) => {
    const obj = c as Partial<Concept>;
    if (!obj.label || !obj.badge || !obj.prompt) {
      throw new Error("concept_llm_missing_field");
    }
    return { label: obj.label, badge: obj.badge, prompt: obj.prompt };
  });
}

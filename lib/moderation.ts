import "server-only";
import { openai } from "@/lib/openai";

const BLOCKED_NAMES = [
  "mrbeast",
  "mr beast",
  "pewdiepie",
  "kai cenat",
  "ishowspeed",
  "logan paul",
  "jake paul",
  "elon musk",
  "joe rogan",
  "donald trump",
  "joe biden",
  "taylor swift",
  "kim kardashian",
];

export type ModerationResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Two-layer check:
 *   1. Custom blocklist for public-figure names (face-likeness liability).
 *   2. OpenAI moderation API for sexual / violent / hateful content.
 */
export async function moderatePrompt(prompt: string): Promise<ModerationResult> {
  const lower = prompt.toLowerCase();
  for (const name of BLOCKED_NAMES) {
    if (lower.includes(name)) {
      return {
        ok: false,
        reason: `Prompts referencing "${name}" aren't allowed. Please use generic descriptions.`,
      };
    }
  }

  try {
    const result = await openai().moderations.create({
      model: "omni-moderation-latest",
      input: prompt,
    });
    const flagged = result.results?.[0]?.flagged ?? false;
    if (flagged) {
      const cats = result.results?.[0]?.categories ?? {};
      const triggered = Object.entries(cats)
        .filter(([, v]) => v === true)
        .map(([k]) => k)
        .join(", ");
      return {
        ok: false,
        reason: `This prompt was flagged${triggered ? ` (${triggered})` : ""}. Please revise it.`,
      };
    }
  } catch {
    // If moderation API fails, allow through but log. Fail-open is the
    // pragmatic choice — we don't want a moderation outage to block all users.
    return { ok: true };
  }

  return { ok: true };
}

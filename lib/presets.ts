export type StylePresetId =
  | "none"
  | "gaming"
  | "vlog"
  | "podcast"
  | "tutorial"
  | "reaction"
  | "challenge"
  | "tech";

export interface StylePreset {
  id: StylePresetId;
  label: string;
  description: string;
  /** Suffix appended to the user prompt to push the model toward the style. */
  promptSuffix: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "none",
    label: "None",
    description: "Use my prompt as-is, no style hints.",
    promptSuffix: "",
  },
  {
    id: "gaming",
    label: "Gaming",
    description: "Bold colors, action poses, dramatic lighting.",
    promptSuffix:
      " YouTube thumbnail, 1280x720, vibrant saturated colors, dramatic rim lighting, action-pose subject, bold sans-serif title overlay, slight motion blur, cinematic composition.",
  },
  {
    id: "vlog",
    label: "Vlog",
    description: "Warm, lifestyle-style, expressive face.",
    promptSuffix:
      " YouTube thumbnail, 1280x720, warm natural lighting, lifestyle vlog aesthetic, expressive emotional face, shallow depth of field, golden-hour color grade.",
  },
  {
    id: "podcast",
    label: "Podcast",
    description: "Clean, brand-forward, microphone visible.",
    promptSuffix:
      " YouTube thumbnail, 1280x720, professional podcast studio aesthetic, on-axis microphone, soft key lighting, brand-forward color blocks, large bold sans-serif title.",
  },
  {
    id: "tutorial",
    label: "Tutorial",
    description: "Clear, instructional, with arrow/circle annotations.",
    promptSuffix:
      " YouTube thumbnail, 1280x720, clean instructional layout, large readable title, red circle and arrow annotations highlighting the subject, soft drop shadows, white background variant.",
  },
  {
    id: "reaction",
    label: "Reaction",
    description: "Shocked-face split layout with the subject reacting.",
    promptSuffix:
      " YouTube thumbnail, 1280x720, split-screen reaction layout, exaggerated shocked expression on left, subject of reaction on right, high contrast, bright outline strokes around the face.",
  },
  {
    id: "challenge",
    label: "Challenge",
    description: "MrBeast-style high-contrast, big number overlay.",
    promptSuffix:
      " YouTube thumbnail, 1280x720, ultra high contrast, oversized bold typography for a number or quantity, vivid primary colors, dramatic facial expression, clean cutout subject on graphic background.",
  },
  {
    id: "tech",
    label: "Tech",
    description: "Sleek product shot, dark gradient, neon accents.",
    promptSuffix:
      " YouTube thumbnail, 1280x720, sleek tech product photography, dark gradient background, neon cyan and magenta accent lighting, sharp focused product shot, minimalist sans-serif title.",
  },
];

export function getPreset(id: string | undefined): StylePreset {
  return STYLE_PRESETS.find((p) => p.id === id) ?? STYLE_PRESETS[0];
}

export function buildPrompt(userPrompt: string, presetId: string | undefined): string {
  const preset = getPreset(presetId);
  return `${userPrompt.trim()}${preset.promptSuffix}`;
}

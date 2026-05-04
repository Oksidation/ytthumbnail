export type GenerationStatus = "pending" | "completed" | "failed" | "moderated";

export interface ProfileRow {
  id: string;
  email: string;
  credits_balance: number;
  created_at: string;
}

export interface GenerationRow {
  id: string;
  user_id: string;
  prompt: string;
  style_preset: string | null;
  reference_image_path: string | null;
  variations: number;
  output_paths: string[];
  status: GenerationStatus;
  credits_used: number;
  error: string | null;
  created_at: string;
  parent_generation_id: string | null;
  parent_output_index: number | null;
  batch_id: string | null;
  concept_id: string | null;
  rating: number | null;
  rated_at: string | null;
}

export interface ConceptSetRow {
  id: string;
  user_id: string;
  title: string;
  style_preset: string | null;
  reference_image_path: string | null;
  character_id: string | null;
  count: number;
  created_at: string;
}

export interface CharacterRow {
  id: string;
  user_id: string;
  name: string;
  image_paths: string[];
  created_at: string;
}

export interface ConceptRow {
  id: string;
  concept_set_id: string;
  position: number;
  label: string;
  badge: string | null;
  prompt: string;
  created_at: string;
}

export interface CreditTransactionRow {
  id: string;
  user_id: string;
  delta: number;
  reason: "signup_bonus" | "topup" | "generation" | "refund";
  stripe_payment_intent_id: string | null;
  generation_id: string | null;
  created_at: string;
}

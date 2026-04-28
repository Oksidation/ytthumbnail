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

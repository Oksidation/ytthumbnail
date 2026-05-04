import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SIGN_TTL_SECONDS = 60 * 60; // 1 hour

export async function signThumbnailUrl(path: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from("thumbnails")
    .createSignedUrl(path, SIGN_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function signThumbnailUrls(paths: string[]): Promise<(string | null)[]> {
  return Promise.all(paths.map(signThumbnailUrl));
}

export async function signReferenceUrl(path: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from("references")
    .createSignedUrl(path, SIGN_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function signReferenceUrls(paths: string[]): Promise<(string | null)[]> {
  return Promise.all(paths.map(signReferenceUrl));
}

/**
 * Service-role signer. Bypasses storage RLS — use ONLY in admin contexts
 * where the caller is already verified as an admin.
 */
export async function signThumbnailUrlAdmin(path: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from("thumbnails")
    .createSignedUrl(path, SIGN_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function signReferenceUrlAdmin(path: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from("references")
    .createSignedUrl(path, SIGN_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

import { createSupabaseServerClient } from "@/lib/supabase/server";

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

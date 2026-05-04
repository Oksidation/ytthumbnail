// Hardcoded admin allowlist. Two emails only. Add/remove here.
// Compared case-insensitively at runtime.
const ADMIN_EMAILS = new Set([
  "insideinsightfx@gmail.com",
  "krystallis@insideinsight.at",
]);

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase());
}

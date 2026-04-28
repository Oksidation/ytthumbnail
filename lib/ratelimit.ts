import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { serverEnv } from "@/lib/env";

let cached: Ratelimit | null = null;
let warned = false;

/**
 * Returns the configured limiter, or null if Upstash isn't wired up yet.
 * Callers must treat null as "rate limiting disabled" — fine for prototyping,
 * not safe for production. Wire Upstash before going live.
 */
export function generationRateLimit(): Ratelimit | null {
  if (cached) return cached;
  const env = serverEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    if (!warned) {
      console.warn(
        "[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is DISABLED. Set them before going to production.",
      );
      warned = true;
    }
    return null;
  }
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  cached = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "rl:gen",
    analytics: false,
  });
  return cached;
}

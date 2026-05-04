"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Compact 5-star rating widget. One click sets the rating; no submit button,
 * no confirmation modal. Optimistic update + RPC call. Stays passive — no
 * popups or interruptions, just always visible under each rendered thumbnail.
 */
export function RatingStars({
  generationId,
  initialRating,
}: {
  generationId: string;
  initialRating: number | null;
}) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [hover, setHover] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function rate(n: number) {
    if (pending) return;
    const previous = rating;
    setRating(n); // optimistic
    setError(null);

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: rpcError } = await supabase.rpc("rate_generation", {
        p_generation_id: generationId,
        p_rating: n,
      });
      if (rpcError) {
        setRating(previous); // rollback
        setError("Failed to save");
      }
    });
  }

  return (
    <div
      className="flex items-center gap-1"
      onMouseLeave={() => setHover(null)}
    >
      <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        Rate
      </span>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover ?? rating ?? 0) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={pending}
            onMouseEnter={() => setHover(n)}
            onClick={() => rate(n)}
            aria-label={`Rate ${n} out of 5`}
            className="rounded p-0.5 transition disabled:cursor-not-allowed disabled:opacity-60 hover:scale-110"
          >
            <Star
              size={14}
              className={
                filled
                  ? "fill-amber-400 stroke-amber-400"
                  : "stroke-muted-foreground"
              }
            />
          </button>
        );
      })}
      {error ? (
        <span className="ml-2 text-[10px] text-red-400">{error}</span>
      ) : null}
    </div>
  );
}

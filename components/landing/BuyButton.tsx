"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreditPackId } from "@/lib/stripe";

export function BuyButton({
  pack,
  popular,
  children,
}: {
  pack: CreditPackId;
  popular?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pack }),
      });
      if (res.status === 401) {
        router.push(`/login?next=/pricing`);
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout.");
        setLoading(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Network error.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={buy}
        disabled={loading}
        className={`mt-6 block w-full rounded-md px-4 py-2.5 text-center text-sm font-semibold transition disabled:opacity-60 ${
          popular
            ? "bg-accent text-accent-foreground hover:opacity-90"
            : "border border-border bg-muted/40 hover:bg-muted"
        }`}
      >
        {loading ? "Loading..." : children}
      </button>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </>
  );
}

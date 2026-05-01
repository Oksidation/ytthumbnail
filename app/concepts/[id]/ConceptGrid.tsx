"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import type { ConceptRow } from "@/lib/db-types";

export function ConceptGrid({
  concepts,
  creditsBalance,
}: {
  concepts: Pick<ConceptRow, "id" | "label" | "badge" | "prompt" | "position">[];
  creditsBalance: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const selectedCount = selected.size;
  const insufficient = selectedCount > creditsBalance;

  const sorted = useMemo(
    () => [...concepts].sort((a, b) => a.position - b.position),
    [concepts],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function render() {
    if (selectedCount === 0 || insufficient) return;
    setSubmitting(true);
    setErrors([]);

    const batchId = crypto.randomUUID();
    const ids = [...selected];

    const results = await Promise.allSettled(
      ids.map((conceptId) =>
        fetch("/api/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conceptId, batchId, variations: 1 }),
        }).then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message ?? data.error ?? `http_${res.status}`);
          }
          return res.json();
        }),
      ),
    );

    const failures = results
      .map((r, i) => ({ r, label: sorted.find((c) => c.id === ids[i])?.label }))
      .filter(({ r }) => r.status === "rejected")
      .map(({ r, label }) =>
        `${label ?? "concept"}: ${r.status === "rejected" ? (r.reason as Error).message : ""}`,
      );

    if (failures.length === results.length) {
      // All failed — stay on page so user can see errors
      setErrors(failures);
      setSubmitting(false);
      return;
    }

    // At least one fired — go to the batch page; failed ones won't appear there.
    router.push(`/batch/${batchId}`);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((c) => {
          const isSelected = selected.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`group relative text-left rounded-2xl border p-5 transition ${
                isSelected
                  ? "border-accent bg-accent/10"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <div
                className={`absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full border transition ${
                  isSelected
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background text-transparent"
                }`}
              >
                <Check size={14} />
              </div>
              {c.badge ? (
                <span className="inline-block rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {c.badge}
                </span>
              ) : null}
              <h3 className="mt-2 pr-8 text-base font-semibold leading-tight">
                {c.label}
              </h3>
              <p className="mt-3 line-clamp-5 text-xs text-muted-foreground">
                {c.prompt}
              </p>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-4 z-30 mt-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur">
          <div className="text-sm">
            <p className="font-medium">
              {selectedCount} concept{selectedCount === 1 ? "" : "s"} selected ·{" "}
              {selectedCount} credit{selectedCount === 1 ? "" : "s"} will be used
            </p>
            <p className="text-muted-foreground">{creditsBalance} available</p>
          </div>
          <button
            type="button"
            onClick={render}
            disabled={selectedCount === 0 || insufficient || submitting}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            <Sparkles size={18} />
            {submitting
              ? "Rendering..."
              : insufficient
                ? "Not enough credits"
                : selectedCount === 0
                  ? "Pick at least one"
                  : `Render ${selectedCount}`}
          </button>
        </div>
      </div>

      {errors.length > 0 ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-200/90">
          <p className="font-semibold text-red-300">Some renders failed:</p>
          <ul className="mt-2 list-disc pl-5">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import type { ConceptRow } from "@/lib/db-types";

type RenderStatus = "queued" | "rendering" | "done" | "failed";

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
  const [renderStatus, setRenderStatus] = useState<Map<string, RenderStatus>>(
    new Map(),
  );
  const [errors, setErrors] = useState<string[]>([]);

  const selectedCount = selected.size;
  const insufficient = selectedCount > creditsBalance;

  const sorted = useMemo(
    () => [...concepts].sort((a, b) => a.position - b.position),
    [concepts],
  );

  function toggle(id: string) {
    if (submitting) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function markStatus(conceptId: string, status: RenderStatus) {
    setRenderStatus((prev) => {
      const next = new Map(prev);
      next.set(conceptId, status);
      return next;
    });
  }

  async function render() {
    if (selectedCount === 0 || insufficient) return;
    setSubmitting(true);
    setErrors([]);

    const batchId = crypto.randomUUID();
    const ids = [...selected];

    // Initialize all as queued, then immediately mark as rendering since each
    // fetch starts firing right away.
    const initial = new Map<string, RenderStatus>(
      ids.map((id) => [id, "rendering" as RenderStatus]),
    );
    setRenderStatus(initial);

    const results = await Promise.allSettled(
      ids.map((conceptId) =>
        fetch("/api/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conceptId, batchId, variations: 1 }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(
                data.message ?? data.error ?? `http_${res.status}`,
              );
            }
            markStatus(conceptId, "done");
            return res.json();
          })
          .catch((err) => {
            markStatus(conceptId, "failed");
            throw err;
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
      setErrors(failures);
      setSubmitting(false);
      return;
    }
    router.push(`/batch/${batchId}`);
  }

  // Progress computation while rendering.
  const renderIds = useMemo(() => [...selected], [selected]);
  const doneCount = [...renderStatus.values()].filter((s) => s === "done").length;
  const failedCount = [...renderStatus.values()].filter((s) => s === "failed")
    .length;
  const totalCount = renderIds.length;
  const progressPct =
    totalCount > 0 ? Math.round(((doneCount + failedCount) / totalCount) * 100) : 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((c) => {
          const isSelected = selected.has(c.id);
          const status = renderStatus.get(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              disabled={submitting}
              className={`group relative text-left rounded-2xl border p-5 transition ${
                isSelected
                  ? "border-accent bg-accent/10"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40"
              } ${submitting ? "cursor-not-allowed opacity-80" : ""}`}
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
              {isSelected && status ? (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium">
                  <StatusBadge status={status} />
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-4 z-30 mt-8">
        {submitting ? (
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/40 bg-background/95 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">
                Rendering {totalCount} thumbnail{totalCount === 1 ? "" : "s"}...
              </p>
              <p className="text-sm font-medium text-accent tabular-nums">
                {doneCount}/{totalCount} done
                {failedCount > 0 ? ` · ${failedCount} failed` : ""}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Each thumbnail goes through render → vision proofread →
              auto-edit until perfect. Takes 30–150 seconds per image, all
              rendering in parallel. We&apos;ll take you to the batch view
              when they&apos;re ready.
            </p>
            <ul className="mt-4 max-h-48 space-y-1.5 overflow-y-auto text-xs">
              {renderIds.map((id) => {
                const concept = sorted.find((c) => c.id === id);
                const status = renderStatus.get(id) ?? "queued";
                return (
                  <li key={id} className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="line-clamp-1 flex-1 text-muted-foreground">
                      {concept?.label ?? id}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur">
            <div className="text-sm">
              <p className="font-medium">
                {selectedCount} concept{selectedCount === 1 ? "" : "s"} selected
                · {selectedCount} credit{selectedCount === 1 ? "" : "s"} will
                be used
              </p>
              <p className="text-muted-foreground">{creditsBalance} available</p>
            </div>
            <button
              type="button"
              onClick={render}
              disabled={selectedCount === 0 || insufficient}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              <Sparkles size={18} />
              {insufficient
                ? "Not enough credits"
                : selectedCount === 0
                  ? "Pick at least one"
                  : `Render ${selectedCount}`}
            </button>
          </div>
        )}
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

function StatusBadge({ status }: { status: RenderStatus }) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400">
        <CheckCircle2 size={12} />
        Done
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-red-400">
        <XCircle size={12} />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Loader2 size={12} className="animate-spin" />
      Rendering...
    </span>
  );
}

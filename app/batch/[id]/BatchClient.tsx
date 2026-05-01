"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

export interface BatchRow {
  id: string;
  label: string;
  status: "pending" | "completed" | "failed" | "moderated";
  url: string | null;
  error: string | null;
}

export function BatchClient({
  batchId,
  rows,
}: {
  batchId: string;
  rows: BatchRow[];
}) {
  const router = useRouter();
  const anyPending = rows.some((r) => r.status === "pending");

  useEffect(() => {
    if (!anyPending) return;
    const timer = setInterval(() => {
      router.refresh();
    }, 2500);
    return () => clearInterval(timer);
  }, [anyPending, router]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <div
          key={r.id}
          className="overflow-hidden rounded-xl border border-border/60 bg-muted/20"
        >
          <div className="relative aspect-video bg-muted">
            {r.status === "completed" && r.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.url}
                alt={r.label}
                className="h-full w-full object-cover"
              />
            ) : r.status === "failed" || r.status === "moderated" ? (
              <div className="grid h-full place-items-center p-4 text-center text-xs text-red-300/80">
                {r.error ?? r.status}
              </div>
            ) : (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-accent" />
                  Rendering...
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 p-3">
            <span className="line-clamp-1 text-sm font-medium">{r.label}</span>
            {r.status === "completed" && r.url ? (
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/generate/${r.id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold hover:bg-muted/40"
                >
                  <Pencil size={12} />
                  Edit
                </Link>
                <a
                  href={r.url}
                  download={`thumbly-${batchId}-${r.id.slice(0, 8)}.png`}
                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90"
                >
                  Download
                </a>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

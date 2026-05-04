"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { EditPanel } from "./EditPanel";
import { RatingStars } from "@/components/generate/RatingStars";

export function ResultClient({
  generationId,
  urls,
  creditsBalance,
  initialRating,
}: {
  generationId: string;
  urls: (string | null)[];
  creditsBalance: number;
  initialRating: number | null;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {urls.map((url, i) =>
          url ? (
            <div
              key={i}
              className={`overflow-hidden rounded-xl border bg-muted/20 transition ${
                editingIndex === i
                  ? "border-accent"
                  : "border-border/60"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Thumbnail ${i + 1}`}
                className="aspect-video w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 p-3">
                <span className="text-sm text-muted-foreground">
                  Variation {i + 1}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingIndex(i)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted/40"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  <a
                    href={url}
                    download={`thumbly-${generationId}-${i + 1}.png`}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90"
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
          ) : null,
        )}
      </div>

      <div className="mt-4 flex items-center justify-end">
        <RatingStars
          generationId={generationId}
          initialRating={initialRating}
        />
      </div>

      {editingIndex !== null ? (
        <EditPanel
          sourceGenerationId={generationId}
          outputCount={urls.length}
          selectedIndex={editingIndex}
          onIndexChange={setEditingIndex}
          onClose={() => setEditingIndex(null)}
          creditsBalance={creditsBalance}
        />
      ) : null}
    </>
  );
}

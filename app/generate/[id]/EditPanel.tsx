"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Wand2, X } from "lucide-react";

const VARIATION_OPTIONS = [1, 2, 4] as const;

export function EditPanel({
  sourceGenerationId,
  outputCount,
  selectedIndex,
  onClose,
  onIndexChange,
  creditsBalance,
}: {
  sourceGenerationId: string;
  outputCount: number;
  selectedIndex: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  creditsBalance: number;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [variations, setVariations] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insufficient = creditsBalance < variations;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (insufficient) {
      setError("Not enough credits.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          variations,
          parentGenerationId: sourceGenerationId,
          parentOutputIndex: selectedIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) setError("Not enough credits.");
        else if (res.status === 429)
          setError("Slow down — you're rate-limited. Try again in a few minutes.");
        else setError(data.message ?? data.error ?? "Edit failed.");
        setSubmitting(false);
        return;
      }
      router.push(`/generate/${data.generationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 rounded-2xl border border-accent/40 bg-muted/30 p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Edit this thumbnail</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe what to change. The AI will re-render variation #{selectedIndex + 1} with your edit.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close edit panel"
        >
          <X size={18} />
        </button>
      </div>

      {outputCount > 1 ? (
        <div className="mt-5">
          <p className="text-sm font-medium">Editing variation</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from({ length: outputCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onIndexChange(i)}
                className={`rounded-md border px-3 py-1.5 text-sm transition ${
                  i === selectedIndex
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                }`}
              >
                #{i + 1}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <label htmlFor="edit-prompt" className="block text-sm font-medium">
          What should change?
        </label>
        <textarea
          id="edit-prompt"
          required
          minLength={8}
          maxLength={500}
          rows={3}
          placeholder='e.g. "Change the background to dark blue" or "Replace the title with I QUIT"'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="mt-2 w-full rounded-md border border-border bg-background px-4 py-3 text-base outline-none ring-accent/40 focus:border-accent focus:ring-2"
        />
      </div>

      <div className="mt-5">
        <p className="block text-sm font-medium">Variations</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {VARIATION_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setVariations(n)}
              className={`rounded-md border px-3 py-2 text-sm transition ${
                variations === n
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              {n} {n === 1 ? "image" : "images"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <p className="font-medium">
            {variations} credit{variations > 1 ? "s" : ""} will be used
          </p>
          <p className="text-muted-foreground">{creditsBalance} available</p>
        </div>
        <button
          type="submit"
          disabled={submitting || insufficient}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          <Wand2 size={18} />
          {submitting ? "Editing..." : "Apply edit"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </form>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, Sparkles, Plus } from "lucide-react";
import { STYLE_PRESETS } from "@/lib/presets";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const COUNT_OPTIONS = [8, 12, 20] as const;

// Stage timings (ms from submit) and labels for the estimated progress bar.
// Total expected duration ~60s for 12 concepts with 1–2 critic rounds.
// Progress eases to 90% over EXPECTED_DURATION_MS and holds until the real
// response arrives, then snaps to 100%.
const EXPECTED_DURATION_MS = 65_000;
const STAGES: { at: number; label: string }[] = [
  { at: 0, label: "Uploading and warming up..." },
  { at: 4_000, label: "Writing thumbnail concepts..." },
  { at: 28_000, label: "Quality-checking against viral best practices..." },
  { at: 42_000, label: "Refining weaker concepts..." },
  { at: 56_000, label: "Final polish..." },
];

export interface CharacterOption {
  id: string;
  name: string;
  imageCount: number;
  coverUrl: string | null;
}

export function GenerateForm({
  characters,
}: {
  characters: CharacterOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [stylePreset, setStylePreset] = useState<string>("none");
  const [count, setCount] = useState<number>(12);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>(STAGES[0].label);
  const [error, setError] = useState<string | null>(null);

  // Drive the estimated progress animation while submitting.
  useEffect(() => {
    if (!submitting) return;
    const start = Date.now();
    setProgress(0);
    setStage(STAGES[0].label);
    const id = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const ratio = Math.min(elapsed / EXPECTED_DURATION_MS, 1);
      // Ease-out so it feels snappy early and slows near the cap.
      const pct = 90 * (1 - Math.pow(1 - ratio, 2));
      setProgress(pct);
      const current = STAGES.filter((s) => elapsed >= s.at).pop();
      if (current) setStage(current.label);
    }, 200);
    return () => window.clearInterval(id);
  }, [submitting]);

  function pickCharacter(id: string | null) {
    setCharacterId(id);
    if (id) setReferenceFile(null);
  }

  function pickFile(file: File | null) {
    setReferenceFile(file);
    if (file) setCharacterId(null);
  }

  async function uploadReference(file: File): Promise<string> {
    setUploading(true);
    try {
      const signRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error ?? "sign_failed");

      const supabase = createSupabaseBrowserClient();
      const { error: upErr } = await supabase.storage
        .from("references")
        .uploadToSignedUrl(signData.path, signData.token, file, {
          contentType: file.type,
          upsert: true,
        });
      if (upErr) throw upErr;
      return signData.path as string;
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      let referencePath: string | undefined;
      if (referenceFile) {
        referencePath = await uploadReference(referenceFile);
      }
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          count,
          stylePreset,
          referencePath,
          characterId: characterId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429)
          setError("Slow down — try again in a few minutes.");
        else setError(data.message ?? data.error ?? "Concept generation failed.");
        setSubmitting(false);
        setProgress(0);
        return;
      }
      setProgress(100);
      setStage("Done — taking you to your concepts...");
      router.push(`/concepts/${data.conceptSetId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setSubmitting(false);
      setProgress(0);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Video title
        </label>
        <input
          id="title"
          type="text"
          required
          minLength={4}
          maxLength={200}
          placeholder="e.g. I tried Apple's new Vision Pro for 30 days"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-2 w-full rounded-md border border-border bg-muted/40 px-4 py-3 text-base outline-none ring-accent/40 focus:border-accent focus:ring-2"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Just your YouTube title — we&apos;ll write the thumbnail concepts for you.
        </p>
      </div>

      <div>
        <p className="block text-sm font-medium">Style preset</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STYLE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setStylePreset(p.id)}
              className={`rounded-md border px-3 py-2 text-sm transition ${
                stylePreset === p.id
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="block text-sm font-medium">Character (optional)</p>
          <Link
            href="/characters/new"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <Plus size={12} />
            New
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a saved character (1–5 images) for best face fidelity, or upload
          a single photo below.
        </p>

        {characters.length === 0 ? (
          <div className="mt-2 rounded-md border border-dashed border-border/80 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
            No characters yet.{" "}
            <Link href="/characters/new" className="text-accent hover:underline">
              Create one
            </Link>{" "}
            to save 4–5 reference photos for reuse.
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => pickCharacter(null)}
              className={`rounded-md border px-3 py-2 text-sm transition ${
                characterId === null && !referenceFile
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              None
            </button>
            {characters.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pickCharacter(c.id)}
                className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-sm transition ${
                  characterId === c.id
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                }`}
              >
                {c.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.coverUrl}
                    alt={c.name}
                    className="h-8 w-8 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 shrink-0 rounded bg-muted" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-foreground">{c.name}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {c.imageCount} image{c.imageCount === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!characterId ? (
        <div>
          <p className="block text-sm font-medium">One-off reference image (optional)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Drop a single photo for this generation only. PNG/JPG/WebP, ≤8 MB.
          </p>
          <label
            htmlFor="reference"
            className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-sm text-muted-foreground hover:bg-muted/50"
          >
            <Upload size={16} />
            {referenceFile ? referenceFile.name : "Click to upload"}
          </label>
          <input
            id="reference"
            type="file"
            className="sr-only"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </div>
      ) : null}

      <div>
        <p className="block text-sm font-medium">How many concepts?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Concepts are free. You only spend credits on the ones you choose to render.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`rounded-md border px-3 py-2 text-sm transition ${
                count === n
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              {n} concepts
            </button>
          ))}
        </div>
      </div>

      {submitting || uploading ? (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">
              {uploading ? "Uploading reference..." : "Generating concepts"}
            </p>
            <p className="text-sm font-medium text-accent tabular-nums">
              {Math.round(progress)}%
            </p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {uploading ? "Almost there..." : stage}
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${uploading ? 5 : progress}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Typical: 30–90 seconds. Keep this tab open — we&apos;ll redirect
            you when concepts are ready.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="text-sm">
            <p className="font-medium">No credits used yet</p>
            <p className="text-muted-foreground">
              You&apos;ll pick which concepts to render on the next page.
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-semibold text-accent-foreground transition hover:opacity-90"
          >
            <Sparkles size={18} />
            Generate concepts
          </button>
        </div>
      )}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}

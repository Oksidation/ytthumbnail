"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, Sparkles } from "lucide-react";
import { STYLE_PRESETS } from "@/lib/presets";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const COUNT_OPTIONS = [8, 12, 20] as const;

export function GenerateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [stylePreset, setStylePreset] = useState<string>("none");
  const [count, setCount] = useState<number>(12);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429)
          setError("Slow down — try again in a few minutes.");
        else setError(data.message ?? data.error ?? "Concept generation failed.");
        setSubmitting(false);
        return;
      }
      router.push(`/concepts/${data.conceptSetId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setSubmitting(false);
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
        <p className="block text-sm font-medium">Reference image (optional)</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload a photo of yourself or your brand. Concepts will feature you
          as the central subject. Max 8 MB.
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
          onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
        />
      </div>

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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="text-sm">
          <p className="font-medium">No credits used yet</p>
          <p className="text-muted-foreground">
            You&apos;ll pick which concepts to render on the next page.
          </p>
        </div>
        <button
          type="submit"
          disabled={submitting || uploading}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          <Sparkles size={18} />
          {uploading
            ? "Uploading..."
            : submitting
              ? "Generating concepts..."
              : "Generate concepts"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}

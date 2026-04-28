"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, Wand2 } from "lucide-react";
import { STYLE_PRESETS } from "@/lib/presets";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const VARIATION_OPTIONS = [1, 2, 4] as const;

export function GenerateForm({ creditsBalance }: { creditsBalance: number }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [stylePreset, setStylePreset] = useState<string>("none");
  const [variations, setVariations] = useState<number>(2);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insufficient = creditsBalance < variations;

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
    if (insufficient) {
      setError("Not enough credits. Buy a pack on the pricing page.");
      return;
    }
    setSubmitting(true);
    try {
      let referencePath: string | undefined;
      if (referenceFile) {
        referencePath = await uploadReference(referenceFile);
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          stylePreset,
          variations,
          referencePath,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setError("Not enough credits.");
        } else if (res.status === 429) {
          setError("Slow down — you're rate-limited. Try again in a few minutes.");
        } else {
          setError(data.message ?? data.error ?? "Generation failed.");
        }
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
    <form onSubmit={onSubmit} className="space-y-8">
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium">
          Video title or description
        </label>
        <textarea
          id="prompt"
          required
          minLength={8}
          maxLength={500}
          rows={3}
          placeholder="e.g. I tried Apple's new Vision Pro for 30 days"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="mt-2 w-full rounded-md border border-border bg-muted/40 px-4 py-3 text-base outline-none ring-accent/40 focus:border-accent focus:ring-2"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          One sentence is best. Mention emotion, action, or stakes for higher CTR.
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
          Upload a photo of yourself or your brand asset. Max 8 MB. PNG/JPG/WebP.
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
        <p className="block text-sm font-medium">Variations</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Each variation costs 1 credit.
        </p>
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="text-sm">
          <p className="font-medium">{variations} credit{variations > 1 ? "s" : ""} will be used</p>
          <p className="text-muted-foreground">{creditsBalance} available</p>
        </div>
        <button
          type="submit"
          disabled={submitting || uploading || insufficient}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          <Wand2 size={18} />
          {uploading
            ? "Uploading..."
            : submitting
              ? "Generating..."
              : "Generate"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}

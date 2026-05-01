"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Sparkles } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_IMAGES = 5;

export function CreateCharacterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    const next = [...files];
    for (const f of picked) {
      if (next.length >= MAX_IMAGES) break;
      next.push(f);
    }
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  function removeAt(i: number) {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  async function uploadOne(file: File): Promise<string> {
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
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (files.length === 0) {
      setError("Add at least one image.");
      return;
    }
    setSubmitting(true);
    try {
      const imagePaths = await Promise.all(files.map(uploadOne));
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), imagePaths }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Could not save character.");
        setSubmitting(false);
        return;
      }
      router.push(`/characters/${data.character.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Character name
        </label>
        <input
          id="name"
          type="text"
          required
          minLength={2}
          maxLength={80}
          placeholder="e.g. Me, John (host), Brand mascot"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full rounded-md border border-border bg-muted/40 px-4 py-3 text-base outline-none ring-accent/40 focus:border-accent focus:ring-2"
        />
      </div>

      <div>
        <p className="block text-sm font-medium">
          Reference photos ({files.length}/{MAX_IMAGES})
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload 4–5 photos for best face fidelity. Front, side, smiling, with
          and without your usual outfit. PNG/JPG/WebP, ≤8 MB each.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {previews.map((src, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Reference ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black"
                aria-label={`Remove image ${i + 1}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {files.length < MAX_IMAGES ? (
            <label
              htmlFor="character-files"
              className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/30 text-xs text-muted-foreground hover:bg-muted/50"
            >
              <span className="flex flex-col items-center gap-1">
                <Upload size={18} />
                Add image
              </span>
            </label>
          ) : null}
        </div>
        <input
          id="character-files"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <button
          type="submit"
          disabled={submitting || files.length === 0}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          <Sparkles size={18} />
          {submitting ? "Saving..." : "Create character"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}

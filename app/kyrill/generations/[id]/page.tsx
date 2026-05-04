import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/Container";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  signThumbnailUrlAdmin,
  signReferenceUrlAdmin,
} from "@/lib/storage";

export const metadata = {
  title: "Admin · generation",
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";

interface FullGen {
  id: string;
  user_id: string;
  prompt: string;
  style_preset: string | null;
  reference_image_path: string | null;
  variations: number;
  output_paths: string[];
  status: "pending" | "completed" | "failed" | "moderated";
  credits_used: number;
  error: string | null;
  created_at: string;
  parent_generation_id: string | null;
  parent_output_index: number | null;
  batch_id: string | null;
  concept_id: string | null;
  rating: number | null;
  rated_at: string | null;
}

interface ProfileLite {
  id: string;
  email: string;
  credits_balance: number;
  created_at: string;
}

interface ConceptDetail {
  id: string;
  position: number;
  label: string;
  badge: string | null;
  prompt: string;
  concept_set_id: string;
}

interface ConceptSetDetail {
  id: string;
  title: string;
  style_preset: string | null;
  reference_image_path: string | null;
  character_id: string | null;
  count: number;
  created_at: string;
}

interface CharacterDetail {
  id: string;
  name: string;
  image_paths: string[];
}

export default async function AdminGenerationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const me = await getCurrentUser();
  if (!me || !isAdmin(me.email)) notFound();

  const admin = createSupabaseAdminClient();

  const { data: gen } = await admin
    .from("generations")
    .select(
      "id, user_id, prompt, style_preset, reference_image_path, variations, output_paths, status, credits_used, error, created_at, parent_generation_id, parent_output_index, batch_id, concept_id, rating, rated_at",
    )
    .eq("id", id)
    .single<FullGen>();

  if (!gen) notFound();

  // Profile, concept, parent, children, siblings, character — all in parallel
  const [
    profileRes,
    conceptRes,
    parentRes,
    childrenRes,
    siblingsRes,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, credits_balance, created_at")
      .eq("id", gen.user_id)
      .single<ProfileLite>(),
    gen.concept_id
      ? admin
          .from("concepts")
          .select("id, position, label, badge, prompt, concept_set_id")
          .eq("id", gen.concept_id)
          .single<ConceptDetail>()
      : Promise.resolve({ data: null }),
    gen.parent_generation_id
      ? admin
          .from("generations")
          .select("id, prompt, status, output_paths, created_at")
          .eq("id", gen.parent_generation_id)
          .single<{
            id: string;
            prompt: string;
            status: string;
            output_paths: string[];
            created_at: string;
          }>()
      : Promise.resolve({ data: null }),
    admin
      .from("generations")
      .select("id, prompt, status, output_paths, created_at")
      .eq("parent_generation_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    gen.batch_id
      ? admin
          .from("generations")
          .select("id, prompt, status, output_paths, created_at")
          .eq("batch_id", gen.batch_id)
          .neq("id", id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const profile = profileRes.data ?? null;
  const concept = conceptRes.data ?? null;
  const parent = parentRes.data ?? null;
  const children = childrenRes.data ?? [];
  const siblings = siblingsRes.data ?? [];

  // Concept set + character (sequential after concept resolved)
  let conceptSet: ConceptSetDetail | null = null;
  let character: CharacterDetail | null = null;
  if (concept?.concept_set_id) {
    const { data: cs } = await admin
      .from("concept_sets")
      .select(
        "id, title, style_preset, reference_image_path, character_id, count, created_at",
      )
      .eq("id", concept.concept_set_id)
      .single<ConceptSetDetail>();
    conceptSet = cs ?? null;
    if (cs?.character_id) {
      const { data: ch } = await admin
        .from("characters")
        .select("id, name, image_paths")
        .eq("id", cs.character_id)
        .single<CharacterDetail>();
      character = ch ?? null;
    }
  }

  // Sign output URLs
  const outputUrls = await Promise.all(
    (gen.output_paths ?? []).map((p) => signThumbnailUrlAdmin(p)),
  );

  // Sign reference image (lives in `references` for user uploads OR in
  // `thumbnails` if it's a parent's output for an edit chain)
  let referenceUrl: string | null = null;
  if (gen.reference_image_path) {
    referenceUrl = gen.parent_generation_id
      ? await signThumbnailUrlAdmin(gen.reference_image_path)
      : await signReferenceUrlAdmin(gen.reference_image_path);
  }

  // Character images (always in `references` bucket)
  const characterUrls: (string | null)[] = character
    ? await Promise.all(
        character.image_paths.map((p) => signReferenceUrlAdmin(p)),
      )
    : [];

  // Sibling first-output thumbnails
  const siblingUrls = await Promise.all(
    siblings.map(async (s) => ({
      gen: s,
      url: s.output_paths?.[0]
        ? await signThumbnailUrlAdmin(s.output_paths[0])
        : null,
    })),
  );
  const childrenUrls = await Promise.all(
    children.map(async (s) => ({
      gen: s,
      url: s.output_paths?.[0]
        ? await signThumbnailUrlAdmin(s.output_paths[0])
        : null,
    })),
  );
  const parentUrl =
    parent && parent.output_paths?.[0]
      ? await signThumbnailUrlAdmin(parent.output_paths[0])
      : null;

  return (
    <main className="flex-1 py-12">
      <Container className="max-w-6xl">
        <Link
          href="/kyrill"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to admin overview
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-accent">
              Generation
            </p>
            <h1 className="mt-1 break-all font-mono text-lg">{gen.id}</h1>
          </div>
          <div className="flex items-center gap-3">
            {gen.rating ? (
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                {gen.rating}★ rated
                {gen.rated_at
                  ? ` ${new Date(gen.rated_at).toLocaleDateString()}`
                  : ""}
              </span>
            ) : (
              <span className="rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
                Unrated
              </span>
            )}
            <StatusBadge status={gen.status} />
          </div>
        </div>

        {/* Outputs */}
        <Section title="Outputs">
          {outputUrls.length === 0 ? (
            <Empty>No images rendered (status: {gen.status}).</Empty>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {outputUrls.map((url, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl border border-border/60 bg-muted/20"
                >
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Variation ${i + 1}`}
                        className="aspect-video w-full object-cover"
                      />
                    </a>
                  ) : (
                    <div className="grid aspect-video place-items-center text-xs text-muted-foreground">
                      Failed to sign URL
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 text-xs text-muted-foreground">
                    <span>Variation {i + 1}</span>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        Open full size
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Error */}
        {gen.error ? (
          <Section title="Error">
            <pre className="overflow-x-auto rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-xs text-red-200">
              {gen.error}
            </pre>
          </Section>
        ) : null}

        {/* User */}
        <Section title="User">
          {profile ? (
            <div className="grid gap-4 rounded-xl border border-border/60 bg-muted/20 p-5 sm:grid-cols-3">
              <Field label="Email" value={profile.email} />
              <Field label="Current balance" value={profile.credits_balance} />
              <Field
                label="Member since"
                value={new Date(profile.created_at).toLocaleDateString()}
              />
            </div>
          ) : (
            <Empty>Profile missing.</Empty>
          )}
        </Section>

        {/* Source */}
        <Section title="Source">
          {conceptSet ? (
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Video title" value={conceptSet.title} />
                <Field
                  label="Style preset"
                  value={conceptSet.style_preset ?? "—"}
                />
                <Field
                  label="Concept set count"
                  value={`${conceptSet.count} concepts`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Concept set ID:{" "}
                <span className="font-mono">{conceptSet.id}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
              <p className="text-sm text-muted-foreground">
                {gen.parent_generation_id
                  ? "Edit chain — derived from a previous generation."
                  : "Direct generation (no concept set). Free-form prompt + optional reference."}
              </p>
            </div>
          )}
        </Section>

        {/* Concept */}
        {concept ? (
          <Section title="Concept">
            <div className="space-y-3 rounded-xl border border-accent/30 bg-accent/5 p-5">
              <div className="flex flex-wrap items-center gap-3">
                {concept.badge ? (
                  <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    {concept.badge}
                  </span>
                ) : null}
                <h3 className="font-semibold">{concept.label}</h3>
                <span className="text-xs text-muted-foreground">
                  position {concept.position}
                </span>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">
                  Full concept prompt (sent to gpt-image-2)
                </summary>
                <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-background p-4 font-mono text-xs leading-relaxed">
                  {concept.prompt}
                </pre>
              </details>
            </div>
          </Section>
        ) : null}

        {/* Final prompt sent to model (always shown) */}
        <Section title="Prompt sent to gpt-image-2">
          <pre className="whitespace-pre-wrap break-words rounded-xl border border-border/60 bg-muted/20 p-5 font-mono text-xs leading-relaxed">
            {gen.prompt}
          </pre>
        </Section>

        {/* Reference image */}
        {referenceUrl || character ? (
          <Section title="Reference inputs">
            <div className="space-y-4">
              {referenceUrl ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                    {gen.parent_generation_id
                      ? "Parent thumbnail (edit chain)"
                      : "Single reference image"}
                  </p>
                  <a href={referenceUrl} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={referenceUrl}
                      alt="Reference"
                      className="max-h-80 rounded-lg object-contain"
                    />
                  </a>
                  <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
                    {gen.reference_image_path}
                  </p>
                </div>
              ) : null}

              {character ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                    Character: {character.name} ({character.image_paths.length}{" "}
                    images)
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {characterUrls.map((url, i) =>
                      url ? (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-square overflow-hidden rounded border border-border/60"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`${character.name} ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </a>
                      ) : null,
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}

        {/* Edit chain — parent */}
        {parent ? (
          <Section title="Edit chain — parent">
            <Link
              href={`/kyrill/generations/${parent.id}`}
              className="flex gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 transition hover:bg-muted/40"
            >
              <div className="aspect-video w-40 shrink-0 overflow-hidden rounded bg-muted">
                {parentUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={parentUrl}
                    alt={parent.prompt}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm">{parent.prompt}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Output index used: {gen.parent_output_index}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(parent.created_at).toLocaleString()} ·{" "}
                  {parent.status}
                </p>
              </div>
            </Link>
          </Section>
        ) : null}

        {/* Edit chain — children */}
        {childrenUrls.length > 0 ? (
          <Section title={`Edits derived from this (${childrenUrls.length})`}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {childrenUrls.map(({ gen: c, url }) => (
                <Link
                  key={c.id}
                  href={`/kyrill/generations/${c.id}`}
                  className="overflow-hidden rounded-xl border border-border/60 bg-muted/20 transition hover:bg-muted/40"
                >
                  <div className="aspect-video bg-muted">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={c.prompt}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-xs">{c.prompt}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleString()} · {c.status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        ) : null}

        {/* Batch siblings */}
        {siblingUrls.length > 0 ? (
          <Section
            title={`Batch siblings (${siblingUrls.length} other rendered concepts)`}
            subtitle={`Batch ID: ${gen.batch_id}`}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {siblingUrls.map(({ gen: s, url }) => (
                <Link
                  key={s.id}
                  href={`/kyrill/generations/${s.id}`}
                  className="overflow-hidden rounded-xl border border-border/60 bg-muted/20 transition hover:bg-muted/40"
                >
                  <div className="aspect-video bg-muted">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={s.prompt}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-xs">{s.prompt}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(s.created_at).toLocaleString()} · {s.status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        ) : null}

        {/* Raw row */}
        <Section title="Raw row (debug)">
          <details>
            <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">
              Show JSON
            </summary>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-border/60 bg-muted/20 p-4 font-mono text-[11px] leading-relaxed">
              {JSON.stringify(
                {
                  ...gen,
                  concept,
                  conceptSet,
                  character: character
                    ? {
                        id: character.id,
                        name: character.name,
                        image_count: character.image_paths.length,
                      }
                    : null,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </Section>
      </Container>
    </main>
  );
}

// ---------------------------------------------------------------------------

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle ? (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm break-words">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "completed"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : status === "failed" || status === "moderated"
        ? "bg-red-500/15 text-red-300 border-red-500/30"
        : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${color}`}
    >
      {status}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

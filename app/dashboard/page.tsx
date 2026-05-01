import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { Container } from "@/components/site/Container";
import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { getUserWithProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signThumbnailUrl } from "@/lib/storage";
import type { ConceptSetRow, GenerationRow } from "@/lib/db-types";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, profile } = await getUserWithProfile();
  if (!user) redirect("/login?next=/dashboard");

  const supabase = await createSupabaseServerClient();
  const [{ data: gens }, { data: sets }] = await Promise.all([
    supabase
      .from("generations")
      .select(
        "id, user_id, prompt, style_preset, reference_image_path, variations, output_paths, status, credits_used, error, created_at, parent_generation_id, parent_output_index, batch_id, concept_id",
      )
      .order("created_at", { ascending: false })
      .limit(24)
      .returns<GenerationRow[]>(),
    supabase
      .from("concept_sets")
      .select("id, user_id, title, style_preset, reference_image_path, count, created_at")
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<ConceptSetRow[]>(),
  ]);

  const cards = await Promise.all(
    (gens ?? []).map(async (g) => {
      const firstPath = g.output_paths?.[0];
      const url = firstPath ? await signThumbnailUrl(firstPath) : null;
      return { gen: g, url };
    }),
  );

  return (
    <>
      <NavBar />
      <main className="flex-1 py-12">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Your thumbnails</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile?.credits_balance ?? 0} credits remaining ·{" "}
                <Link href="/pricing" className="text-accent hover:underline">
                  buy more
                </Link>
              </p>
            </div>
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 font-semibold text-accent-foreground hover:opacity-90"
            >
              <Plus size={18} />
              New thumbnail
            </Link>
          </div>

          {cards.length === 0 ? (
            <div className="mt-16 rounded-2xl border border-dashed border-border/80 p-12 text-center">
              <h2 className="text-lg font-semibold">No thumbnails yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You have {profile?.credits_balance ?? 0} free credits ready to go. Generate your first thumbnail.
              </p>
              <Link
                href="/generate"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 font-semibold text-accent-foreground hover:opacity-90"
              >
                <Plus size={18} />
                Generate your first thumbnail
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map(({ gen, url }) => (
                <Link
                  key={gen.id}
                  href={`/generate/${gen.id}`}
                  className="group block overflow-hidden rounded-xl border border-border/60 bg-muted/20"
                >
                  <div className="relative aspect-video bg-muted">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={gen.prompt}
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-muted-foreground">
                        {gen.status === "pending" ? "Generating..." : gen.status}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm">{gen.prompt}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(gen.created_at).toLocaleDateString()} ·{" "}
                      {gen.variations} variation{gen.variations > 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {sets && sets.length > 0 ? (
            <section className="mt-16">
              <h2 className="text-xl font-semibold tracking-tight">
                Recent concept sets
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Re-pick from any of these to render different thumbnails.
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {sets.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/concepts/${s.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 transition hover:bg-muted/40"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                        <Sparkles size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{s.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.count} concepts ·{" "}
                          {new Date(s.created_at).toLocaleDateString()}
                        </p>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </Container>
      </main>
      <Footer />
    </>
  );
}

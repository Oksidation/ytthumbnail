import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/site/Container";
import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { getUserWithProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signThumbnailUrls } from "@/lib/storage";
import type { GenerationRow } from "@/lib/db-types";
import { ResultPoller } from "./ResultPoller";
import { ResultClient } from "./ResultClient";

export const metadata = { title: "Result" };
export const dynamic = "force-dynamic";

const SELECT_COLS =
  "id, user_id, prompt, style_preset, reference_image_path, variations, output_paths, status, credits_used, error, created_at, parent_generation_id, parent_output_index";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await getUserWithProfile();
  if (!user) redirect(`/login?next=/generate/${id}`);

  const supabase = await createSupabaseServerClient();
  const { data: gen } = await supabase
    .from("generations")
    .select(SELECT_COLS)
    .eq("id", id)
    .single<GenerationRow>();

  if (!gen) notFound();

  const urls = await signThumbnailUrls(gen.output_paths ?? []);

  let parent: { id: string; prompt: string } | null = null;
  if (gen.parent_generation_id) {
    const { data: p } = await supabase
      .from("generations")
      .select("id, prompt")
      .eq("id", gen.parent_generation_id)
      .single<{ id: string; prompt: string }>();
    if (p) parent = p;
  }

  return (
    <>
      <NavBar />
      <main className="flex-1 py-12">
        <Container>
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to dashboard
            </Link>
            <Link
              href="/generate"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
            >
              New thumbnail
            </Link>
          </div>

          {parent ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Edited from{" "}
              <Link
                href={`/generate/${parent.id}`}
                className="text-accent hover:underline"
              >
                {parent.prompt.slice(0, 80)}
                {parent.prompt.length > 80 ? "…" : ""}
              </Link>
            </p>
          ) : null}

          <h1 className={`${parent ? "mt-2" : "mt-6"} text-2xl font-bold tracking-tight`}>
            {gen.prompt}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {gen.variations} variation{gen.variations > 1 ? "s" : ""} ·{" "}
            {gen.style_preset ?? "no preset"} ·{" "}
            {new Date(gen.created_at).toLocaleString()}
          </p>

          {gen.status === "pending" ? (
            <ResultPoller id={gen.id} />
          ) : gen.status === "failed" ? (
            <div className="mt-12 rounded-2xl border border-red-500/40 bg-red-500/5 p-6 text-sm">
              <p className="font-semibold text-red-300">Generation failed</p>
              <p className="mt-2 text-red-200/80">
                {gen.error ?? "Unknown error."} Your credits have been refunded.
              </p>
              <Link
                href="/generate"
                className="mt-4 inline-flex rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
              >
                Try again
              </Link>
            </div>
          ) : (
            <ResultClient
              generationId={gen.id}
              urls={urls}
              creditsBalance={profile?.credits_balance ?? 0}
            />
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}

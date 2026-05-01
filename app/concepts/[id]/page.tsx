import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/site/Container";
import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { getUserWithProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ConceptGrid } from "./ConceptGrid";
import type { ConceptSetRow, ConceptRow } from "@/lib/db-types";

export const metadata = { title: "Pick concepts" };
export const dynamic = "force-dynamic";

export default async function ConceptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await getUserWithProfile();
  if (!user) redirect(`/login?next=/concepts/${id}`);

  const supabase = await createSupabaseServerClient();
  const { data: set } = await supabase
    .from("concept_sets")
    .select("id, user_id, title, style_preset, reference_image_path, count, created_at")
    .eq("id", id)
    .single<ConceptSetRow>();

  if (!set) notFound();

  const { data: concepts } = await supabase
    .from("concepts")
    .select("id, concept_set_id, position, label, badge, prompt, created_at")
    .eq("concept_set_id", id)
    .order("position", { ascending: true })
    .returns<ConceptRow[]>();

  return (
    <>
      <NavBar />
      <main className="flex-1 py-12">
        <Container className="max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to dashboard
            </Link>
            <Link
              href="/generate"
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted/40"
            >
              Generate new concepts
            </Link>
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight">{set.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {set.count} concept{set.count === 1 ? "" : "s"} ·{" "}
            {set.style_preset ?? "no preset"}
            {set.reference_image_path ? " · with reference photo" : ""} ·{" "}
            {new Date(set.created_at).toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the ones you like — only what you select gets rendered as images.
          </p>

          <div className="mt-8">
            <ConceptGrid
              concepts={concepts ?? []}
              creditsBalance={profile?.credits_balance ?? 0}
            />
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

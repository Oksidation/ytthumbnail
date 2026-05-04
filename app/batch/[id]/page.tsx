import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/site/Container";
import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signThumbnailUrl } from "@/lib/storage";
import { BatchClient, type BatchRow } from "./BatchClient";

export const metadata = { title: "Batch results" };
export const dynamic = "force-dynamic";

interface JoinedRow {
  id: string;
  status: BatchRow["status"];
  output_paths: string[];
  error: string | null;
  created_at: string;
  rating: number | null;
  concept: { label: string } | null;
}

export default async function BatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/batch/${id}`);

  const supabase = await createSupabaseServerClient();
  const { data: gens } = await supabase
    .from("generations")
    .select(
      "id, status, output_paths, error, created_at, rating, concept:concepts(label)",
    )
    .eq("batch_id", id)
    .order("created_at", { ascending: true })
    .returns<JoinedRow[]>();

  if (!gens || gens.length === 0) notFound();

  const rows: BatchRow[] = await Promise.all(
    gens.map(async (g) => {
      const firstPath = g.output_paths?.[0];
      const url =
        g.status === "completed" && firstPath
          ? await signThumbnailUrl(firstPath)
          : null;
      return {
        id: g.id,
        label: g.concept?.label ?? "Thumbnail",
        status: g.status,
        url,
        error: g.error,
        rating: g.rating,
      };
    }),
  );

  const completed = rows.filter((r) => r.status === "completed").length;
  const failed = rows.filter(
    (r) => r.status === "failed" || r.status === "moderated",
  ).length;
  const pending = rows.length - completed - failed;

  return (
    <>
      <NavBar />
      <main className="flex-1 py-12">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-3">
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
              New thumbnails
            </Link>
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            Your thumbnails
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {completed} ready · {pending} rendering · {failed} failed
          </p>

          <div className="mt-8">
            <BatchClient batchId={id} rows={rows} />
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

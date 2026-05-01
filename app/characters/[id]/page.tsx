import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/site/Container";
import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signReferenceUrls } from "@/lib/storage";
import type { CharacterRow } from "@/lib/db-types";
import { DeleteCharacterButton } from "./DeleteButton";

export const metadata = { title: "Character" };
export const dynamic = "force-dynamic";

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/characters/${id}`);

  const supabase = await createSupabaseServerClient();
  const { data: character } = await supabase
    .from("characters")
    .select("id, user_id, name, image_paths, created_at")
    .eq("id", id)
    .single<CharacterRow>();

  if (!character) notFound();

  const urls = await signReferenceUrls(character.image_paths);

  return (
    <>
      <NavBar />
      <main className="flex-1 py-12">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/characters"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to characters
            </Link>
            <Link
              href="/generate"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
            >
              Use in new thumbnail
            </Link>
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight">{character.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {character.image_paths.length} reference image
            {character.image_paths.length === 1 ? "" : "s"} ·{" "}
            {new Date(character.created_at).toLocaleString()}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {urls.map((url, i) =>
              url ? (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-lg border border-border/60 bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${character.name} ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null,
            )}
          </div>

          <div className="mt-12">
            <DeleteCharacterButton id={character.id} />
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { Container } from "@/components/site/Container";
import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signReferenceUrl } from "@/lib/storage";
import type { CharacterRow } from "@/lib/db-types";

export const metadata = { title: "Characters" };
export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/characters");

  const supabase = await createSupabaseServerClient();
  const { data: characters } = await supabase
    .from("characters")
    .select("id, user_id, name, image_paths, created_at")
    .order("created_at", { ascending: false })
    .returns<CharacterRow[]>();

  const cards = await Promise.all(
    (characters ?? []).map(async (c) => ({
      character: c,
      coverUrl: c.image_paths[0] ? await signReferenceUrl(c.image_paths[0]) : null,
    })),
  );

  return (
    <>
      <NavBar />
      <main className="flex-1 py-12">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Characters</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Save 1–5 reference photos per character. Pick one on /generate
                and every render features that subject faithfully.
              </p>
            </div>
            <Link
              href="/characters/new"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 font-semibold text-accent-foreground hover:opacity-90"
            >
              <Plus size={18} />
              New character
            </Link>
          </div>

          {cards.length === 0 ? (
            <div className="mt-16 rounded-2xl border border-dashed border-border/80 p-12 text-center">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
                <Sparkles size={20} />
              </span>
              <h2 className="mt-4 text-lg font-semibold">No characters yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload 4–5 photos of yourself once. Use the character on every
                future thumbnail.
              </p>
              <Link
                href="/characters/new"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 font-semibold text-accent-foreground hover:opacity-90"
              >
                <Plus size={18} />
                Create your first character
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map(({ character, coverUrl }) => (
                <Link
                  key={character.id}
                  href={`/characters/${character.id}`}
                  className="group block overflow-hidden rounded-xl border border-border/60 bg-muted/20"
                >
                  <div className="relative aspect-video bg-muted">
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverUrl}
                        alt={character.name}
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-muted-foreground">
                        No images
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold">{character.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {character.image_paths.length} image
                      {character.image_paths.length === 1 ? "" : "s"} ·{" "}
                      {new Date(character.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}

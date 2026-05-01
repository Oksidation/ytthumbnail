import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/site/Container";
import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signReferenceUrl } from "@/lib/storage";
import type { CharacterRow } from "@/lib/db-types";
import { GenerateForm } from "./GenerateForm";

export const metadata = { title: "New thumbnail" };
export const dynamic = "force-dynamic";

export default async function GeneratePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/generate");

  const supabase = await createSupabaseServerClient();
  const { data: characters } = await supabase
    .from("characters")
    .select("id, user_id, name, image_paths, created_at")
    .order("created_at", { ascending: false })
    .returns<CharacterRow[]>();

  const characterOptions = await Promise.all(
    (characters ?? []).map(async (c) => ({
      id: c.id,
      name: c.name,
      imageCount: c.image_paths.length,
      coverUrl: c.image_paths[0] ? await signReferenceUrl(c.image_paths[0]) : null,
    })),
  );

  return (
    <>
      <NavBar />
      <main className="flex-1 py-12">
        <Container className="max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">New thumbnail</h1>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to dashboard
            </Link>
          </div>

          <GenerateForm characters={characterOptions} />
        </Container>
      </main>
      <Footer />
    </>
  );
}

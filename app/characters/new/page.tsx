import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/site/Container";
import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { getCurrentUser } from "@/lib/auth";
import { CreateCharacterForm } from "./CreateCharacterForm";

export const metadata = { title: "New character" };
export const dynamic = "force-dynamic";

export default async function NewCharacterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/characters/new");

  return (
    <>
      <NavBar />
      <main className="flex-1 py-12">
        <Container className="max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">New character</h1>
            <Link
              href="/characters"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to characters
            </Link>
          </div>

          <div className="mb-8 rounded-2xl border border-accent/40 bg-accent/5 p-5 text-sm">
            <p className="font-semibold text-foreground">
              Upload 4–5 close-up photos of the face you want on every thumbnail.
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                <span className="text-foreground">Close-up of the face only</span>{" "}
                — head and shoulders at most. Full-body shots make likeness worse.
              </li>
              <li>
                <span className="text-foreground">Different angles + expressions</span>{" "}
                — front, slight 3/4, smiling, neutral, looking up. Variation
                helps the AI generalize.
              </li>
              <li>
                <span className="text-foreground">Sharp + well-lit</span> — daylight
                or even indoor lighting. Avoid blurry, dark, or heavily
                filtered photos.
              </li>
              <li>
                <span className="text-foreground">No sunglasses, hats, or masks</span>{" "}
                covering the face. Eyes and mouth visible in every shot.
              </li>
              <li>
                <span className="text-foreground">One person per photo</span>. Don&apos;t
                mix people — that&apos;s a separate character.
              </li>
            </ul>
          </div>

          <CreateCharacterForm />
        </Container>
      </main>
      <Footer />
    </>
  );
}

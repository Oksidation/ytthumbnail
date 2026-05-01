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
          <CreateCharacterForm />
        </Container>
      </main>
      <Footer />
    </>
  );
}

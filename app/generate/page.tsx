import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/site/Container";
import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { getCurrentUser } from "@/lib/auth";
import { GenerateForm } from "./GenerateForm";

export const metadata = { title: "New thumbnail" };
export const dynamic = "force-dynamic";

export default async function GeneratePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/generate");

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

          <GenerateForm />
        </Container>
      </main>
      <Footer />
    </>
  );
}

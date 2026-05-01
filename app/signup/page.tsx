import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/site/Container";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (user) {
    redirect(params.next ?? "/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center py-16">
      <Container className="max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-accent-foreground text-xs font-bold">
            T
          </span>
          <span className="font-semibold text-foreground">Thumbly</span>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          5 free thumbnails on signup. No credit card required.
        </p>
        <div className="mt-8">
          <SignupForm next={params.next} />
        </div>
      </Container>
    </main>
  );
}

import Link from "next/link";
import { Container } from "@/components/site/Container";
import { getCurrentUser } from "@/lib/auth";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

export const metadata = { title: "Set new password" };
export const dynamic = "force-dynamic";

export default async function AuthResetPage() {
  const user = await getCurrentUser();

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
        <h1 className="text-3xl font-bold tracking-tight">Set new password</h1>
        {user ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick a new password for {user.email}. We&apos;ll sign you in once
              it&apos;s set.
            </p>
            <div className="mt-8">
              <UpdatePasswordForm />
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              This reset link is invalid or has expired.
            </p>
            <Link
              href="/reset-password"
              className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
            >
              Request a new reset link
            </Link>
          </>
        )}
      </Container>
    </main>
  );
}

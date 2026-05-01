import Link from "next/link";
import { Container } from "./Container";
import { getCurrentUser } from "@/lib/auth";

export async function NavBar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-accent-foreground text-xs font-bold">
            T
          </span>
          <span>Thumbly</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link href="/#features" className="hover:text-foreground">Features</Link>
          <Link href="/#how" className="hover:text-foreground">How it works</Link>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/#faq" className="hover:text-foreground">FAQ</Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/characters"
                className="hidden text-sm text-muted-foreground hover:text-foreground md:block"
              >
                Characters
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm text-muted-foreground hover:text-foreground md:block"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                Get 5 free thumbnails
              </Link>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}

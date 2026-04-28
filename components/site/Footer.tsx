import Link from "next/link";
import { Container } from "./Container";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 py-10 text-sm text-muted-foreground">
      <Container className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-accent-foreground text-[10px] font-bold">
            T
          </span>
          <span className="font-medium text-foreground">Thumbly</span>
          <span className="ml-2">© {new Date().getFullYear()}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/legal/ai-disclosure" className="hover:text-foreground">AI disclosure</Link>
        </nav>
      </Container>
    </footer>
  );
}

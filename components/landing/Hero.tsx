import Link from "next/link";
import { Container } from "@/components/site/Container";
import { ThumbnailCard } from "./ThumbnailCard";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute left-1/2 top-0 -z-0 h-[480px] w-[1100px] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
      <Container className="relative z-10 grid gap-12 py-20 md:grid-cols-[1.1fr_1fr] md:py-28 md:items-center">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            5 free credits on signup. No credit card required.
          </div>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            AI thumbnails that
            <br />
            <span className="bg-gradient-to-r from-accent to-amber-400 bg-clip-text text-transparent">
              actually get clicked.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Upload your face. Type your video title. Get 4 click-tested 1280×720
            thumbnails in 30 seconds. Built for YouTube creators who want to
            stop wasting hours in Photoshop.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-md bg-accent px-6 py-3 font-semibold text-accent-foreground transition hover:opacity-90"
            >
              Try it free
            </Link>
            <Link
              href="/#examples"
              className="rounded-md border border-border bg-muted/40 px-6 py-3 font-semibold transition hover:bg-muted"
            >
              See examples
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-3 md:space-y-4">
              <ThumbnailCard
                title="I tried this for 30 days"
                badge="Vlog"
                fromColor="#ff7b3d"
                toColor="#ff2e63"
              />
              <ThumbnailCard
                title="$1 vs $1,000,000"
                badge="Challenge"
                fromColor="#1d4ed8"
                toColor="#0ea5e9"
              />
              <ThumbnailCard
                title="Don't make this mistake"
                badge="Tutorial"
                fromColor="#0f766e"
                toColor="#22c55e"
              />
            </div>
            <div className="space-y-3 pt-8 md:space-y-4 md:pt-12">
              <ThumbnailCard
                title="My new setup"
                badge="Tech"
                fromColor="#6d28d9"
                toColor="#0ea5e9"
                align="right"
              />
              <ThumbnailCard
                title="REACTING TO THIS"
                badge="Reaction"
                fromColor="#dc2626"
                toColor="#facc15"
                align="right"
              />
              <ThumbnailCard
                title="The hidden truth"
                badge="Podcast"
                fromColor="#1f2937"
                toColor="#9333ea"
                align="right"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

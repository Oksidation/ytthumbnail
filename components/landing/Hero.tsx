import Link from "next/link";
import { Container } from "@/components/site/Container";

const HERO_THUMBS: Array<{ src: string; alt: string }> = [
  { src: "/samples/thumb1.jpg", alt: "Sample thumbnail 1" },
  { src: "/samples/thumb2.png", alt: "Sample thumbnail 2" },
  { src: "/samples/thumb3.jpg", alt: "Sample thumbnail 3" },
  { src: "/samples/thumb4.jpg", alt: "Sample thumbnail 4" },
  { src: "/samples/thumb5.jpg", alt: "Sample thumbnail 5" },
  { src: "/samples/thumb6.jpg", alt: "Sample thumbnail 6" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute left-1/2 top-0 -z-0 h-[480px] w-[1100px] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
      <Container className="relative z-10 grid gap-12 py-20 md:grid-cols-[1.1fr_1fr] md:py-28 md:items-center">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            5 free thumbnails on signup. No credit card required.
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
              {HERO_THUMBS.slice(0, 3).map((t) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={t.src}
                  src={t.src}
                  alt={t.alt}
                  className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 object-cover shadow-2xl"
                  loading="lazy"
                />
              ))}
            </div>
            <div className="space-y-3 pt-8 md:space-y-4 md:pt-12">
              {HERO_THUMBS.slice(3, 6).map((t) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={t.src}
                  src={t.src}
                  alt={t.alt}
                  className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 object-cover shadow-2xl"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

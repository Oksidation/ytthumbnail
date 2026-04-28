import { Container } from "@/components/site/Container";

const SAMPLES: Array<{ src: string; alt: string }> = [
  { src: "/samples/thumb7.jpg", alt: "Example thumbnail 1" },
  { src: "/samples/thumb8.jpg", alt: "Example thumbnail 2" },
  { src: "/samples/thumb9.jpg", alt: "Example thumbnail 3" },
  { src: "/samples/thumb10.jpg", alt: "Example thumbnail 4" },
  { src: "/samples/thumb11.jpg", alt: "Example thumbnail 5" },
  { src: "/samples/thumb12.jpg", alt: "Example thumbnail 6" },
];

export function SampleGallery() {
  return (
    <section id="examples" className="py-20 md:py-28">
      <Container>
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
            Examples
          </p>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Click-tested designs across every niche.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Real outputs from creators using Thumbly. Each thumbnail starts
            from a single line of text and a reference photo.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLES.map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.src}
              src={s.src}
              alt={s.alt}
              className="aspect-video w-full overflow-hidden rounded-xl border border-border/60 object-cover"
              loading="lazy"
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

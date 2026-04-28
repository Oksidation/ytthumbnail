import { Container } from "@/components/site/Container";
import { ThumbnailCard } from "./ThumbnailCard";

const SAMPLES: Array<Parameters<typeof ThumbnailCard>[0]> = [
  { title: "I built a passive income empire", badge: "Vlog", fromColor: "#fb923c", toColor: "#ef4444" },
  { title: "Why YouTubers are quitting", badge: "Podcast", fromColor: "#1e1b4b", toColor: "#7c3aed" },
  { title: "I survived 24h with $1", badge: "Challenge", fromColor: "#dc2626", toColor: "#facc15", align: "center" },
  { title: "MacBook M5 review", badge: "Tech", fromColor: "#0f172a", toColor: "#22d3ee", align: "right" },
  { title: "Don't buy this drone", badge: "Tutorial", fromColor: "#15803d", toColor: "#fde047" },
  { title: "Speedrun world record", badge: "Gaming", fromColor: "#7c3aed", toColor: "#ec4899", align: "right" },
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
            <ThumbnailCard key={s.title} {...s} />
          ))}
        </div>
      </Container>
    </section>
  );
}

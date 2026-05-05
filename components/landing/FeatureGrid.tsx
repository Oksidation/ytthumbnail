import {
  UserCircle2,
  Sparkles,
  ListChecks,
  Frame,
  Pencil,
  Infinity as InfinityIcon,
} from "lucide-react";
import { Container } from "@/components/site/Container";

const FEATURES = [
  {
    icon: UserCircle2,
    title: "Train your character",
    body: "Upload 4–5 close-ups of your face once. Every thumbnail you generate features you faithfully — no Photoshop skills, no manual cutouts.",
  },
  {
    icon: Sparkles,
    title: "Title in, concepts out",
    body: "Type your YouTube title. A senior thumbnail strategist (Claude Opus) writes 8, 12, or 20 distinct concepts varied across composition patterns, palettes, and overlay styles.",
  },
  {
    icon: ListChecks,
    title: "Pick only what you like",
    body: "Concepts are free to generate. You only spend credits on the ones you choose to render as images. No wasted budget on dead ideas.",
  },
  {
    icon: Frame,
    title: "Native 1280×720",
    body: "Every output is rendered at YouTube's exact thumbnail spec. No manual cropping, no off-center exports, no text getting clipped at the edges.",
  },
  {
    icon: Pencil,
    title: "AI edits",
    body: 'Don\'t love a detail? "Change the background to red" or "make the title bigger" — edit any thumbnail with a prompt instead of re-rolling.',
  },
  {
    icon: InfinityIcon,
    title: "Credits never expire",
    body: "Buy a pack once, use it whenever. No subscription, no monthly resets, no surprise renewal charges. Failed renders refund automatically.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="py-20 md:py-28">
      <Container>
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
            Features
          </p>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Built for the creator workflow.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Thumbly is laser-focused on one job: turning your video idea into
            click-tested thumbnails. We don&apos;t do retention curves,
            consultants, or shorts editors. Just thumbnails, done well.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-background p-6">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
                <Icon size={20} />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

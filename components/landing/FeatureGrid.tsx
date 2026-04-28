import {
  ImagePlus,
  Palette,
  Layers,
  Frame,
  ShieldCheck,
  Infinity as InfinityIcon,
} from "lucide-react";
import { Container } from "@/components/site/Container";

const FEATURES = [
  {
    icon: ImagePlus,
    title: "Upload your face",
    body: "Drop in a reference photo of yourself or your brand and AI puts you on the thumbnail — no Photoshop skills needed.",
  },
  {
    icon: Palette,
    title: "Style presets",
    body: "Gaming, vlog, podcast, MrBeast-style — pick a style and the prompt is tuned for the look that wins clicks in your niche.",
  },
  {
    icon: Layers,
    title: "1, 2, or 4 variations",
    body: "Generate multiple options per click and run your own A/B test in YouTube Studio.",
  },
  {
    icon: Frame,
    title: "Native 1280×720",
    body: "Every output is sized exactly to YouTube's spec. No manual cropping, no exports going off-center.",
  },
  {
    icon: ShieldCheck,
    title: "Brand-safe moderation",
    body: "Every prompt runs through OpenAI's moderation API plus a public-figure blocklist before a credit is spent.",
  },
  {
    icon: InfinityIcon,
    title: "Credits never expire",
    body: "Buy a pack once, use it whenever. No subscription, no monthly resets, no surprise renewal charges.",
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
            Everything you need, nothing you don&apos;t.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Thumbly is laser-focused on one job: turning your video idea into
            scroll-stopping thumbnails. We don&apos;t do retention curves,
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

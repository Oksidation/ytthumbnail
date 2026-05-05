import { Container } from "@/components/site/Container";

const STEPS = [
  {
    n: "1",
    title: "Train your character",
    body: "Upload 4–5 close-ups of your face. Save them once and use the same character on every future thumbnail. (Optional — you can also drop a single photo per generation.)",
  },
  {
    n: "2",
    title: "Type your video title",
    body: "Pick how many concepts you want — 8, 12, or 20. Thumbly's AI strategist writes a complete prompt for each, varied across composition patterns and overlay styles.",
  },
  {
    n: "3",
    title: "Pick + render + edit",
    body: "Choose the concepts you like, render them as 1280×720 PNGs, then edit any one with a prompt or download. Rate them so future runs lean toward what works.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-y border-border/60 bg-muted/20 py-20 md:py-28">
      <Container>
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
            How it works
          </p>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            From video title to ready-to-upload thumbnails.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-border/60 bg-background p-6"
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground font-bold">
                {s.n}
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

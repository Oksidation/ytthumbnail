import { Container } from "@/components/site/Container";

const STEPS = [
  {
    n: "1",
    title: "Upload a reference photo",
    body: "A clean photo of your face or your brand asset. We keep it private — only you can see it.",
  },
  {
    n: "2",
    title: "Type your video title and pick a style",
    body: "One line of text plus a preset like Gaming or Vlog. The AI does the rest.",
  },
  {
    n: "3",
    title: "Download your thumbnails",
    body: "1280×720 PNGs ready to upload. Generate variants and A/B test the winners.",
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
            From idea to upload in 30 seconds.
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

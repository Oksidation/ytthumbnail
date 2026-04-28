import { Container } from "@/components/site/Container";

const QA = [
  {
    q: "Which AI model powers Thumbly?",
    a: "We use OpenAI's latest image generation model (gpt-image-2). It supports image inputs, so we can use your reference photo as a face or brand reference.",
  },
  {
    q: "What if I don't like the output?",
    a: "If a generation fails for technical reasons, your credits are refunded automatically. If you just don't like the style, we recommend tweaking your prompt or trying a different preset — every regeneration is a fresh credit.",
  },
  {
    q: "Can I use these thumbnails commercially?",
    a: "Yes. AI-generated images from Thumbly are yours to use on YouTube, social, ads, anywhere. We don't claim copyright.",
  },
  {
    q: "Can I use someone else's face?",
    a: "Reference images should be of yourself, your team, or assets you own the rights to. We block prompts naming public figures and our moderation layer rejects misuse.",
  },
  {
    q: "Do you accept NSFW content?",
    a: "No. All prompts run through OpenAI's moderation API. NSFW, hateful, or violent prompts are rejected before a credit is spent.",
  },
  {
    q: "What's your refund policy?",
    a: "Unused credits can be refunded within 7 days of purchase. Email support@thumbly.app and we'll process it.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="py-20 md:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
            FAQ
          </p>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-3">
          {QA.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-border/60 bg-muted/20 p-5 open:bg-muted/40"
            >
              <summary className="flex cursor-pointer items-center justify-between font-medium">
                <span>{item.q}</span>
                <span className="ml-4 text-muted-foreground transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

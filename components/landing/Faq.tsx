import { Container } from "@/components/site/Container";

const QA = [
  {
    q: "Which AI models power Thumbly?",
    a: "Concepts are written by Claude Opus (Anthropic) — a senior model good at strategy and writing varied prompts. Images are rendered by OpenAI's gpt-image-2 with multi-image character references for faithful likeness. Both reasoning steps are tuned for high CTR thumbnails.",
  },
  {
    q: "What if I don't like a thumbnail?",
    a: "Three options. (1) Don't pick that concept in the first place — concepts are free, you only pay for what you render. (2) Edit any rendered image with a prompt: 'change the background', 'swap the title to X' (1 credit per edit). (3) If a render fails for technical reasons, your credits are refunded automatically.",
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

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <p className="text-yellow-300/80">
        ⚠️ Placeholder copy. Replace with reviewed terms before launch
        (Termly, iubenda, or a lawyer-drafted version).
      </p>

      <h2 className="mt-8 text-xl font-semibold">1. Service</h2>
      <p>
        Thumbly (&quot;we&quot;, &quot;us&quot;) provides an AI-powered
        thumbnail generation service. By creating an account you agree to
        these terms.
      </p>

      <h2 className="mt-6 text-xl font-semibold">2. Acceptable use</h2>
      <p>
        You may not use Thumbly to generate content that is illegal, sexual,
        violent, hateful, deceptive, infringes third-party rights, or
        impersonates real public figures without consent.
      </p>

      <h2 className="mt-6 text-xl font-semibold">3. Credits and refunds</h2>
      <p>
        Credits are sold as one-time purchases and never expire. Failed
        generations are refunded automatically. Unused credits may be
        refunded within 7 days of purchase by emailing support@thumbly.app.
      </p>

      <h2 className="mt-6 text-xl font-semibold">4. Ownership</h2>
      <p>
        You retain ownership of all images generated through Thumbly. We
        retain no commercial rights to outputs.
      </p>

      <h2 className="mt-6 text-xl font-semibold">5. Liability</h2>
      <p>
        Thumbly is provided &quot;as is&quot; without warranty. Our liability
        is limited to the amount you have paid us in the last 12 months.
      </p>
    </article>
  );
}

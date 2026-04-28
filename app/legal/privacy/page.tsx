export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <p className="text-yellow-300/80">
        ⚠️ Placeholder copy. Replace with reviewed policy before launch.
      </p>

      <h2 className="mt-6 text-xl font-semibold">What we collect</h2>
      <ul className="list-inside list-disc space-y-1">
        <li>Email address (for sign-in and receipts).</li>
        <li>Reference images you upload, stored privately in Supabase.</li>
        <li>Prompts and generated thumbnails.</li>
        <li>Stripe payment records (we do not see your card number).</li>
        <li>Standard server logs (IP, user agent) for security.</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold">How we use it</h2>
      <p>
        We use this data only to provide the service, prevent abuse, and
        process payments. We do not sell or share personal data.
      </p>

      <h2 className="mt-6 text-xl font-semibold">Subprocessors</h2>
      <ul className="list-inside list-disc space-y-1">
        <li>Supabase (database, storage, auth)</li>
        <li>Vercel (hosting)</li>
        <li>OpenAI (image generation, moderation)</li>
        <li>Stripe (payments)</li>
        <li>Upstash (rate limiting)</li>
        <li>Resend (transactional email)</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold">Your rights</h2>
      <p>
        You can request export or deletion of your data at any time by
        emailing privacy@thumbly.app.
      </p>
    </article>
  );
}

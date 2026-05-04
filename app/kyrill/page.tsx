import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/site/Container";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { signThumbnailUrlAdmin } from "@/lib/storage";

// Hidden admin route. Indexed: never. Discoverable: only by knowing the URL.
export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";

interface ProfileLite {
  id: string;
  email: string;
  credits_balance: number;
  created_at: string;
}

interface GenerationAdminRow {
  id: string;
  user_id: string;
  prompt: string;
  status: string;
  variations: number;
  output_paths: string[];
  credits_used: number;
  error: string | null;
  created_at: string;
  profile: { email: string } | null;
}

interface ConceptSetAdminRow {
  id: string;
  user_id: string;
  title: string;
  count: number;
  style_preset: string | null;
  created_at: string;
  profile: { email: string } | null;
}

interface TopupAdminRow {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
  profile: { email: string } | null;
}

interface CharacterAdminRow {
  id: string;
  user_id: string;
  name: string;
  image_paths: string[];
  created_at: string;
  profile: { email: string } | null;
}

const PACK_PRICE_CENTS_BY_CREDITS: Record<number, number> = {
  30: 900,
  100: 2500,
  400: 7900,
};

export default async function KyrillAdminPage() {
  // Hard gate: must be authenticated AND on the admin allowlist.
  // Any failure renders 404 — same as if the route didn't exist.
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) notFound();

  const admin = createSupabaseAdminClient();

  // Run all queries in parallel.
  const [
    profilesRes,
    generationsRes,
    conceptSetsRes,
    topupsRes,
    charactersRes,
    countsRes,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, credits_balance, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("generations")
      .select(
        "id, user_id, prompt, status, variations, output_paths, credits_used, error, created_at, profile:profiles(email)",
      )
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("concept_sets")
      .select(
        "id, user_id, title, count, style_preset, created_at, profile:profiles(email)",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("credit_transactions")
      .select(
        "id, user_id, delta, reason, stripe_payment_intent_id, created_at, profile:profiles(email)",
      )
      .eq("reason", "topup")
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("characters")
      .select(
        "id, user_id, name, image_paths, created_at, profile:profiles(email)",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
      admin.from("concept_sets").select("*", { count: "exact", head: true }),
      admin.from("characters").select("*", { count: "exact", head: true }),
    ]),
  ]);

  const profiles = (profilesRes.data ?? []) as ProfileLite[];
  const generations = (generationsRes.data ?? []) as unknown as GenerationAdminRow[];
  const conceptSets = (conceptSetsRes.data ?? []) as unknown as ConceptSetAdminRow[];
  const topups = (topupsRes.data ?? []) as unknown as TopupAdminRow[];
  const characters = (charactersRes.data ?? []) as unknown as CharacterAdminRow[];

  const [profilesCount, completedGensCount, conceptSetsCount, charactersCount] =
    countsRes.map((r) => r.count ?? 0);

  // Aggregate revenue from all topup transactions ever (not just the latest 30).
  const { data: allTopupsForRevenue } = await admin
    .from("credit_transactions")
    .select("delta")
    .eq("reason", "topup");
  const totalCreditsPurchased = (allTopupsForRevenue ?? []).reduce(
    (s, t: { delta: number }) => s + t.delta,
    0,
  );
  const totalRevenueCents = (allTopupsForRevenue ?? []).reduce(
    (s, t: { delta: number }) => s + (PACK_PRICE_CENTS_BY_CREDITS[t.delta] ?? 0),
    0,
  );

  // Sign thumbnails for the recent-generation gallery.
  const cards = await Promise.all(
    generations.map(async (g) => {
      const firstPath = g.output_paths?.[0];
      const url = firstPath ? await signThumbnailUrlAdmin(firstPath) : null;
      return { gen: g, url };
    }),
  );

  return (
    <main className="flex-1 py-12">
      <Container className="max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-accent">Admin</p>
            <h1 className="text-3xl font-bold tracking-tight">/kyrill</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Hidden admin overview. {user.email}
            </p>
          </div>
        </div>

        {/* Stats */}
        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Users" value={profilesCount} />
          <Stat label="Completed gens" value={completedGensCount} />
          <Stat label="Concept sets" value={conceptSetsCount} />
          <Stat label="Characters" value={charactersCount} />
          <Stat label="Credits sold" value={totalCreditsPurchased} />
          <Stat
            label="Revenue (USD)"
            value={`$${(totalRevenueCents / 100).toFixed(2)}`}
          />
        </section>

        {/* Recent generations */}
        <Section title="Recent generations" subtitle={`Last ${cards.length} of ${completedGensCount}+ completed`}>
          {cards.length === 0 ? (
            <Empty>No generations yet.</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map(({ gen, url }) => (
                <Link
                  key={gen.id}
                  href={`/kyrill/generations/${gen.id}`}
                  className="block overflow-hidden rounded-xl border border-border/60 bg-muted/20 transition hover:bg-muted/40"
                >
                  <div className="relative aspect-video bg-muted">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={gen.prompt} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-muted-foreground">
                        {gen.status}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-xs">{gen.prompt}</p>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">
                      {gen.profile?.email ?? gen.user_id}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(gen.created_at).toLocaleString()} · {gen.status} ·{" "}
                      {gen.credits_used}c
                    </p>
                    {gen.error ? (
                      <p className="mt-1 line-clamp-1 text-[10px] text-red-400">
                        {gen.error}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Section>

        {/* Recent concept sets */}
        <Section title="Recent concept sets">
          <Table headers={["Title", "User", "Style", "Count", "Created"]}>
            {conceptSets.length === 0 ? (
              <EmptyRow cols={5}>No concept sets yet.</EmptyRow>
            ) : (
              conceptSets.map((s) => (
                <tr key={s.id} className="border-t border-border/60">
                  <td className="px-4 py-3 max-w-md truncate">{s.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.profile?.email ?? s.user_id}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.style_preset ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">{s.count}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </Table>
        </Section>

        {/* Topups */}
        <Section title="Recent topups">
          <Table
            headers={["Date", "User", "Credits", "Approx. $", "Stripe PI"]}
          >
            {topups.length === 0 ? (
              <EmptyRow cols={5}>No topups yet.</EmptyRow>
            ) : (
              topups.map((t) => (
                <tr key={t.id} className="border-t border-border/60">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{t.profile?.email ?? t.user_id}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                    +{t.delta}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {PACK_PRICE_CENTS_BY_CREDITS[t.delta]
                      ? `$${(PACK_PRICE_CENTS_BY_CREDITS[t.delta] / 100).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {t.stripe_payment_intent_id?.slice(0, 18) ?? "—"}…
                  </td>
                </tr>
              ))
            )}
          </Table>
        </Section>

        {/* Users */}
        <Section title="Users">
          <Table
            headers={["Email", "Credits", "Joined", "User ID"]}
          >
            {profiles.length === 0 ? (
              <EmptyRow cols={4}>No users.</EmptyRow>
            ) : (
              profiles.map((p) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="px-4 py-3">{p.email}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {p.credits_balance}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {p.id.slice(0, 12)}…
                  </td>
                </tr>
              ))
            )}
          </Table>
        </Section>

        {/* Characters */}
        <Section title="Characters">
          <Table headers={["Name", "User", "Images", "Created"]}>
            {characters.length === 0 ? (
              <EmptyRow cols={4}>No characters yet.</EmptyRow>
            ) : (
              characters.map((c) => (
                <tr key={c.id} className="border-t border-border/60">
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.profile?.email ?? c.user_id}
                  </td>
                  <td className="px-4 py-3 text-right">{c.image_paths.length}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(c.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </Table>
        </Section>
      </Container>
    </main>
  );
}

// ---------------------------------------------------------------------------

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle ? (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Table({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            {headers.map((h, i) => (
              <th
                key={h}
                className={`px-4 py-3 ${
                  ["Credits", "Count", "Images", "Approx. $"].includes(h)
                    ? "text-right"
                    : ""
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr>
      <td
        colSpan={cols}
        className="px-4 py-8 text-center text-sm text-muted-foreground"
      >
        {children}
      </td>
    </tr>
  );
}

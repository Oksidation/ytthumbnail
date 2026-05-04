import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, Receipt, User as UserIcon, Plus } from "lucide-react";
import { Container } from "@/components/site/Container";
import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserWithProfile } from "@/lib/auth";
import { fetchReceipts } from "@/lib/stripe";
import { signOutAction } from "./actions";
import type { CreditTransactionRow } from "@/lib/db-types";

export const metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, profile } = await getUserWithProfile();
  if (!user) redirect("/login?next=/account");

  const supabase = await createSupabaseServerClient();
  const { data: txns } = await supabase
    .from("credit_transactions")
    .select(
      "id, user_id, delta, reason, stripe_payment_intent_id, generation_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<CreditTransactionRow[]>();

  const all = txns ?? [];

  // Aggregate stats
  const totalPurchased = all
    .filter((t) => t.reason === "topup" && t.delta > 0)
    .reduce((s, t) => s + t.delta, 0);
  const signupBonus = all
    .filter((t) => t.reason === "signup_bonus")
    .reduce((s, t) => s + t.delta, 0);
  const totalSpent = all
    .filter((t) => t.reason === "generation")
    .reduce((s, t) => s + Math.abs(t.delta), 0);
  const refunded = all
    .filter((t) => t.reason === "refund")
    .reduce((s, t) => s + t.delta, 0);

  // Receipts: fetch Stripe data for every topup that has a payment_intent_id
  const topupRows = all
    .filter(
      (t): t is CreditTransactionRow & { stripe_payment_intent_id: string } =>
        t.reason === "topup" && Boolean(t.stripe_payment_intent_id),
    )
    .slice(0, 25);

  const receipts = await fetchReceipts(
    topupRows.map((t) => ({
      paymentIntentId: t.stripe_payment_intent_id,
      credits: t.delta,
    })),
  );
  const receiptsByPi = new Map(receipts.map((r) => [r.paymentIntentId, r]));

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <>
      <NavBar />
      <main className="flex-1 py-12">
        <Container className="max-w-4xl">
          <h1 className="text-3xl font-bold tracking-tight">Account</h1>

          {/* Profile */}
          <section className="mt-8 rounded-2xl border border-border/60 bg-muted/20 p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
                <UserIcon size={20} />
              </span>
              <h2 className="text-lg font-semibold">Profile</h2>
            </div>
            <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1 text-sm">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  Member since
                </dt>
                <dd className="mt-1 text-sm">{memberSince}</dd>
              </div>
            </dl>
          </section>

          {/* Credits */}
          <section className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
                <CreditCard size={20} />
              </span>
              <h2 className="text-lg font-semibold">Credits</h2>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Balance" value={profile?.credits_balance ?? 0} highlight />
              <Stat label="Purchased" value={totalPurchased} />
              <Stat label="Signup bonus" value={signupBonus} />
              <Stat label="Used" value={totalSpent} />
            </div>
            {refunded > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Includes {refunded} credit{refunded === 1 ? "" : "s"} refunded
                from failed generations.
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
              >
                <Plus size={16} />
                Buy more credits
              </Link>
              <Link
                href="/generate"
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted/40"
              >
                Generate thumbnail
              </Link>
            </div>
          </section>

          {/* Receipts */}
          <section className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
                <Receipt size={20} />
              </span>
              <h2 className="text-lg font-semibold">Receipts</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Stripe-hosted receipts for every credit pack you&apos;ve purchased.
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Pack</th>
                    <th className="px-4 py-3 text-right">Credits</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {topupRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No purchases yet.{" "}
                        <Link href="/pricing" className="text-accent hover:underline">
                          See pricing
                        </Link>
                        .
                      </td>
                    </tr>
                  ) : (
                    topupRows.map((t) => {
                      const r = receiptsByPi.get(t.stripe_payment_intent_id);
                      return (
                        <tr key={t.id} className="border-t border-border/60">
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(t.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">{r?.packName ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                            +{t.delta}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {r
                              ? formatMoney(r.amountCents, r.currency)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {r?.receiptUrl ? (
                              <a
                                href={r.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline"
                              >
                                View
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Unavailable
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Activity */}
          <section className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-6">
            <h2 className="text-lg font-semibold">Activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Last 100 credit changes — purchases, generations, refunds, and
              signup bonus.
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3 text-right">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {all.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        No activity yet.
                      </td>
                    </tr>
                  ) : (
                    all.map((t) => (
                      <tr key={t.id} className="border-t border-border/60">
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {t.reason.replace("_", " ")}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            t.delta > 0 ? "text-emerald-400" : "text-foreground"
                          }`}
                        >
                          {t.delta > 0 ? `+${t.delta}` : t.delta}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Account actions */}
          <section className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="text-foreground">{user.email}</span>
            </p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted/40"
              >
                Sign out
              </button>
            </form>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-3xl font-black tabular-nums ${
          highlight ? "text-accent" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatMoney(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

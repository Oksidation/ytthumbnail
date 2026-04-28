import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/site/Container";
import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserWithProfile } from "@/lib/auth";
import { signOutAction } from "./actions";
import type { CreditTransactionRow } from "@/lib/db-types";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const { user, profile } = await getUserWithProfile();
  if (!user) redirect("/login?next=/account");

  const supabase = await createSupabaseServerClient();
  const { data: txns } = await supabase
    .from("credit_transactions")
    .select("id, delta, reason, stripe_payment_intent_id, generation_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<CreditTransactionRow[]>();

  return (
    <>
      <NavBar />
      <main className="flex-1 py-16">
        <Container className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

          <div className="mt-8 rounded-2xl border border-border/60 bg-muted/20 p-6">
            <p className="text-sm text-muted-foreground">Credits balance</p>
            <p className="mt-1 text-4xl font-black">{profile?.credits_balance ?? 0}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
              >
                Buy more credits
              </Link>
              <Link
                href="/generate"
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted/40"
              >
                Generate thumbnail
              </Link>
            </div>
          </div>

          <h2 className="mt-12 text-lg font-semibold">Transaction history</h2>
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
                {(txns ?? []).map((t) => (
                  <tr key={t.id} className="border-t border-border/60">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 capitalize">{t.reason.replace("_", " ")}</td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        t.delta > 0 ? "text-emerald-400" : "text-foreground"
                      }`}
                    >
                      {t.delta > 0 ? `+${t.delta}` : t.delta}
                    </td>
                  </tr>
                ))}
                {(txns ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      No transactions yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <form action={signOutAction} className="mt-12">
            <button
              type="submit"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted/40"
            >
              Sign out
            </button>
          </form>
        </Container>
      </main>
      <Footer />
    </>
  );
}

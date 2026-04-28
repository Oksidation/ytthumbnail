"use client";

import { useActionState } from "react";
import { sendMagicLink, type SendMagicLinkState } from "./actions";

const initial: SendMagicLinkState = { status: "idle" };

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  if (state.status === "sent") {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/40 p-6 text-center">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a magic link to{" "}
          <span className="text-foreground">{state.email}</span>. Click it to
          sign in. The tab can be closed safely.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <label htmlFor="email" className="block text-sm font-medium">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="w-full rounded-md border border-border bg-muted/40 px-4 py-3 text-base outline-none ring-accent/40 focus:border-accent focus:ring-2"
      />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-3 font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send magic link"}
      </button>
      {state.status === "error" ? (
        <p className="text-sm text-red-400">{state.message}</p>
      ) : null}
      <p className="pt-2 text-xs text-muted-foreground">
        We&apos;ll email you a one-time link. No password to remember.
      </p>
    </form>
  );
}

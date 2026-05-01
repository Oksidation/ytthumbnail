"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ResetState } from "./actions";

const initial: ResetState = { status: "idle" };

export function RequestResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  if (state.status === "sent") {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/40 p-6 text-center">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for{" "}
          <span className="text-foreground">{state.email}</span>, we&apos;ve sent
          a link to reset your password.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
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
          className="mt-2 w-full rounded-md border border-border bg-muted/40 px-4 py-3 text-base outline-none ring-accent/40 focus:border-accent focus:ring-2"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-3 font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send reset link"}
      </button>
      {state.status === "error" ? (
        <p className="text-sm text-red-400">{state.message}</p>
      ) : null}
      <p className="pt-3 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

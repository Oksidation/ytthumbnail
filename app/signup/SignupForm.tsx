"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupWithPassword, type SignupState } from "./actions";

const initial: SignupState = { status: "idle" };

export function SignupForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signupWithPassword, initial);

  if (state.status === "confirm") {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/40 p-6 text-center">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to{" "}
          <span className="text-foreground">{state.email}</span>. Click it to
          finish signing up.
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

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          placeholder="At least 8 characters"
          className="mt-2 w-full rounded-md border border-border bg-muted/40 px-4 py-3 text-base outline-none ring-accent/40 focus:border-accent focus:ring-2"
        />
      </div>

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-3 font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating account..." : "Create account · 5 free thumbnails"}
      </button>

      {state.status === "error" ? (
        <p className="text-sm text-red-400">{state.message}</p>
      ) : null}

      <p className="pt-3 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-accent hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { updatePasswordAction, type UpdateState } from "./actions";

const initial: UpdateState = { status: "idle" };

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          New password
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
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-3 font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Set new password"}
      </button>
      {state.status === "error" ? (
        <p className="text-sm text-red-400">{state.message}</p>
      ) : null}
    </form>
  );
}

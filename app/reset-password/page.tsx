import Link from "next/link";
import { Container } from "@/components/site/Container";
import { RequestResetForm } from "./RequestResetForm";

export const metadata = { title: "Reset password" };

export default function ResetPasswordRequestPage() {
  return (
    <main className="flex flex-1 items-center justify-center py-16">
      <Container className="max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-accent-foreground text-xs font-bold">
            T
          </span>
          <span className="font-semibold text-foreground">Thumbly</span>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the email you signed up with. We&apos;ll send a link to set a
          new password.
        </p>
        <div className="mt-8">
          <RequestResetForm />
        </div>
      </Container>
    </main>
  );
}

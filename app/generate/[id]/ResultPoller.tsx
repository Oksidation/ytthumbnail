"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ResultPoller({ id }: { id: string }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, 2500);
    return () => clearInterval(timer);
  }, [id, router]);

  return (
    <div className="mt-12 grid place-items-center rounded-2xl border border-border/60 bg-muted/20 p-12 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p className="mt-4 font-semibold">Generating your thumbnails...</p>
      <p className="mt-1 text-sm text-muted-foreground">
        This usually takes 20–60 seconds. Don&apos;t close this tab.
      </p>
    </div>
  );
}

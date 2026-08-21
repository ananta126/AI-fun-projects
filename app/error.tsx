"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-danger">Exception</p>
        <h1 className="mt-2 font-serif text-3xl">The desk hit a snag</h1>
        <p className="mt-3 text-sm text-muted">{error.message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-md bg-teal px-4 py-2 text-sm text-bg">
            Retry
          </button>
          <Link href="/" className="rounded-md border border-line px-4 py-2 text-sm text-muted">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import SearchPageClient from "./SearchPageClient";

export const metadata: Metadata = {
  title: "Search",
};

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-12">Loading...</div>}>
      <SearchPageWrapper searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchPageWrapper({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  return <SearchPageClient initialQuery={params.q ?? ""} />;
}

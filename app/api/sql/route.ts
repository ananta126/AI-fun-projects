import { NextResponse } from "next/server";
import { runChallengeQuery } from "@/lib/sql-engine";

export async function POST(request: Request) {
  try {
    const { sql } = (await request.json()) as { sql?: string };
    if (!sql) {
      return NextResponse.json({ error: "sql is required" }, { status: 400 });
    }
    const result = await runChallengeQuery(sql);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

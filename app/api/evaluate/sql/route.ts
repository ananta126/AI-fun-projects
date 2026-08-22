import { NextResponse } from "next/server";
import { evaluateSqlChallenge } from "@/lib/evaluation";

export async function POST(request: Request) {
  try {
    const { sql, challengeId } = (await request.json()) as {
      sql?: string;
      challengeId?: string;
    };
    if (!sql) {
      return NextResponse.json({ error: "sql is required" }, { status: 400 });
    }
    const result = await evaluateSqlChallenge(challengeId || "s2-sql-1", sql);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evaluation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

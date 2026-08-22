import { NextResponse } from "next/server";
import { resetChallengeDbCache, getChallengeDb } from "@/lib/sql-engine";

export async function POST() {
  resetChallengeDbCache();
  await getChallengeDb();
  return NextResponse.json({ ok: true, message: "Challenge database reseeded in-process." });
}

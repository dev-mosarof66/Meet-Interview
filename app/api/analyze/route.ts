import { NextRequest, NextResponse } from "next/server";
import { analyze, usingRealAI } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { job, profile } = await req.json();
    const analysis = await analyze(job, profile);
    return NextResponse.json({ analysis, realAI: usingRealAI() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

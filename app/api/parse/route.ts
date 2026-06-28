import { NextRequest, NextResponse } from "next/server";
import { parseResume, usingRealAI } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || text.trim().length < 20)
      return NextResponse.json({ error: "Paste more resume text." }, { status: 400 });
    const profile = await parseResume(text);
    return NextResponse.json({ profile, realAI: usingRealAI() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

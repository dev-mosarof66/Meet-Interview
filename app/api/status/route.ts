import { NextResponse } from "next/server";
import { usingRealAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ realAI: usingRealAI() });
}

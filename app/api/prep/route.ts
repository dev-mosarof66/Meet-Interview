import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listSessions, STACKS } from "@/lib/prep";

export const runtime = "nodejs";

// List the current user's prep sessions (+ the available stacks) for /practice.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ sessions: [], stacks: STACKS });
  try {
    const sessions = await listSessions(session.user.id);
    return NextResponse.json({ sessions, stacks: STACKS });
  } catch (e: any) {
    return NextResponse.json(
      { sessions: [], stacks: STACKS, error: e?.message },
      { status: 500 }
    );
  }
}

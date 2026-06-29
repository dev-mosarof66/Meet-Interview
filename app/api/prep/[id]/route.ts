import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAttempts, getQuestions, getSession } from "@/lib/prep";

export const runtime = "nodejs";

// Load one prep session with its questions and attempts.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const ps = await getSession(params.id, session.user.id);
    if (!ps) return NextResponse.json({ session: null }, { status: 404 });
    const [questions, attempts] = await Promise.all([
      getQuestions(ps.id, session.user.id),
      getAttempts(ps.id, session.user.id),
    ]);
    return NextResponse.json({ session: ps, questions, attempts });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed to load session" },
      { status: 500 }
    );
  }
}

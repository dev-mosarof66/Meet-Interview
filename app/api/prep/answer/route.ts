import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { scorePrepAnswer, usingRealAI } from "@/lib/ai";
import {
  getQuestions,
  getSession,
  insertAttempt,
  recomputeReadiness,
} from "@/lib/prep";
import { MasterProfile } from "@/lib/types";

export const runtime = "nodejs";

const EMPTY_PROFILE: MasterProfile = {
  fullName: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  skills: [],
  experiences: [],
  education: [],
  projects: [],
};

// Submit an answer → AI scores it against the rubric → store + update readiness.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const b = await req.json().catch(() => ({}));
    const ps = await getSession(String(b.sessionId || ""), session.user.id);
    if (!ps) return NextResponse.json({ error: "not found" }, { status: 404 });

    const questions = await getQuestions(ps.id, session.user.id);
    const question = questions.find((q) => q.id === b.questionId);
    if (!question) {
      return NextResponse.json({ error: "unknown question" }, { status: 400 });
    }

    const profile: MasterProfile = { ...EMPTY_PROFILE, ...(b.profile || {}) };
    if (session.user.name) profile.fullName = session.user.name;
    const answer = String(b.answer || "");

    const { score, feedback } = await scorePrepAnswer(question, answer, {
      role: ps.role,
      company: ps.company,
      profile,
    });

    const attempt = await insertAttempt(session.user.id, {
      questionId: question.id,
      sessionId: ps.id,
      answer,
      score,
      feedback,
    });

    const readiness = await recomputeReadiness(ps, session.user.id);

    return NextResponse.json({ attempt, readiness, realAI: usingRealAI() });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed to score answer" },
      { status: 500 }
    );
  }
}

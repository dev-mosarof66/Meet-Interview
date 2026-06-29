import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mockInterviewTurn, usingRealAI } from "@/lib/ai";
import { getQuestions, getSession } from "@/lib/prep";
import { InterviewTurn, MasterProfile } from "@/lib/types";

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

// Drive one turn of the conversational mock interview for a single question.
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

    const history: InterviewTurn[] = Array.isArray(b.history)
      ? b.history
          .filter(
            (h: any) =>
              (h?.role === "interviewer" || h?.role === "candidate") &&
              typeof h?.text === "string"
          )
          .slice(-20)
      : [];

    const { reply, offline } = await mockInterviewTurn(
      question,
      { role: ps.role, company: ps.company, profile },
      history,
      String(b.message || "")
    );

    return NextResponse.json({ reply, offline, realAI: usingRealAI() });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "interview turn failed" },
      { status: 500 }
    );
  }
}

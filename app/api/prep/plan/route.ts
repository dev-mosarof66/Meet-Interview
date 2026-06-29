import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generatePrepPlan, usingRealAI } from "@/lib/ai";
import { createSession, getStack } from "@/lib/prep";
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

// Generate a role-aware prep plan and open a new prep session.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const b = await req.json().catch(() => ({}));
    const stack = getStack(String(b.stackId || ""));
    if (!stack) {
      return NextResponse.json({ error: "unknown stack" }, { status: 400 });
    }
    if (stack.comingSoon) {
      return NextResponse.json(
        { error: `${stack.name} prep is coming soon.` },
        { status: 400 }
      );
    }
    const profile: MasterProfile = { ...EMPTY_PROFILE, ...(b.profile || {}) };
    if (session.user.name) profile.fullName = session.user.name;

    const seniority = String(b.seniority || "mid");
    const role = String(b.role || stack.name);
    const company = String(b.company || "");
    const jdText = String(b.jdText || "");

    const plan = await generatePrepPlan({
      stack,
      seniority,
      role,
      company,
      jdText,
      profile,
    });

    const created = await createSession(session.user.id, {
      jobId: b.jobId ? String(b.jobId) : undefined,
      stackId: stack.id,
      stackName: stack.name,
      seniority,
      role,
      company,
      jdText,
      plan,
    });

    return NextResponse.json({ session: created, realAI: usingRealAI() });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed to build plan" },
      { status: 500 }
    );
  }
}

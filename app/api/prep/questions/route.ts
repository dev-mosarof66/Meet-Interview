import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generatePrepQuestions, usingRealAI } from "@/lib/ai";
import { getSession, getStack, insertQuestions } from "@/lib/prep";
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

// Generate the next batch of practice questions for one round of a session.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const b = await req.json().catch(() => ({}));
    const ps = await getSession(String(b.sessionId || ""), session.user.id);
    if (!ps) return NextResponse.json({ error: "not found" }, { status: 404 });

    const stack = getStack(ps.stackId);
    const round = stack?.rounds.find((r) => r.key === b.roundKey);
    if (!round) {
      return NextResponse.json({ error: "unknown round" }, { status: 400 });
    }

    const profile: MasterProfile = { ...EMPTY_PROFILE, ...(b.profile || {}) };
    if (session.user.name) profile.fullName = session.user.name;
    const count = Math.min(5, Math.max(1, Number(b.count) || 3));

    const generated = await generatePrepQuestions(
      {
        stack: stack!,
        seniority: ps.seniority,
        role: ps.role,
        company: ps.company,
        jdText: ps.jdText,
        profile,
      },
      round,
      count
    );

    const saved = await insertQuestions(
      session.user.id,
      ps.id,
      round.key,
      generated
    );
    return NextResponse.json({ questions: saved, realAI: usingRealAI() });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed to generate questions" },
      { status: 500 }
    );
  }
}

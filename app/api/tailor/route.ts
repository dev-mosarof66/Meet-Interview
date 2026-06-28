import { NextRequest, NextResponse } from "next/server";
import { tailorResume, tailorCover, usingRealAI } from "@/lib/ai";
import { buildResumeDocx, buildCoverDocx } from "@/lib/docx";
import { docxUrl } from "@/lib/cloudinary";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

// Tailoring (resume + cover) is free — a job slot was already spent when the
// job was added to the pipeline.
export async function POST(req: NextRequest) {
  try {
    const { kind, job, profile } = await req.json();
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const email = session.user.email || "";
    // Account is the source of truth for identity.
    if (session.user.name) profile.fullName = session.user.name;
    if (!profile.email) profile.email = email;

    const stamp = `${job?.id || "job"}-${session.user.id}`;

    if (kind === "cover") {
      const text = await tailorCover(job, profile);
      const buf = await buildCoverDocx(text, profile?.fullName || "");
      const url = await docxUrl(buf, `cover-${stamp}`);
      return NextResponse.json({
        kind: "cover",
        cover: { text, docxUrl: url },
        realAI: usingRealAI(),
      });
    }

    const resume = await tailorResume(job, profile, email);
    const buf = await buildResumeDocx(resume);
    const url = await docxUrl(buf, `resume-${stamp}`);
    return NextResponse.json({
      kind: "resume",
      resume: { ...resume, docxUrl: url },
      realAI: usingRealAI(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "tailoring failed" },
      { status: 500 }
    );
  }
}

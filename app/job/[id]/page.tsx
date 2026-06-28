"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { JobSkeleton } from "@/components/Skeleton";
import { AppStatus, STATUS_FLOW } from "@/lib/types";
import { GhostBadge, ScoreRing } from "@/components/ui";
import {
  FiArrowLeft,
  FiTrash2,
  FiZap,
  FiFileText,
  FiMail,
  FiDownload,
  FiMapPin,
  FiClock,
  FiDollarSign,
  FiGlobe,
  FiLock,
  FiAlertTriangle,
} from "react-icons/fi";
import { GoDotFill } from "react-icons/go";

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, jobs, profile, updateJob, removeJob } = useStore();
  const [loading, setLoading] = useState<"" | "analyze" | "resume" | "cover">("");
  const [warn, setWarn] = useState<{
    kind: "resume" | "cover";
    missing: string[];
  } | null>(null);

  if (!ready) return <JobSkeleton />;
  const job = jobs.find((j) => j.id === id);
  if (!job)
    return (
      <div className="card p-8 text-center text-muted">
        Job not found.{" "}
        <button
          className="font-semibold text-brand-500 underline"
          onClick={() => router.push("/pipeline")}
        >
          Back to pipeline
        </button>
      </div>
    );

  async function runAnalyze() {
    setLoading("analyze");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ job, profile }),
      });
      const data = await res.json();
      if (data.analysis) updateJob(job!.id, { analysis: data.analysis });
    } finally {
      setLoading("");
    }
  }

  async function generate(kind: "resume" | "cover") {
    setLoading(kind);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, job, profile }),
      });
      const data = await res.json();
      if (kind === "resume" && data.resume)
        updateJob(job!.id, { tailored: { ...job!.tailored, resume: data.resume } });
      if (kind === "cover" && data.cover)
        updateJob(job!.id, { tailored: { ...job!.tailored, cover: data.cover } });
    } finally {
      setLoading("");
    }
  }

  function setStatus(status: AppStatus) {
    const patch: Partial<typeof job> = { status };
    if (status === "applied" && !job!.appliedAt) patch.appliedAt = Date.now();
    if (["responded", "interview", "offer"].includes(status) && !job!.responseAt)
      patch.responseAt = Date.now();
    updateJob(job!.id, patch);
  }

  // Profile fields needed for a strong, complete resume.
  function missingProfileFields(): string[] {
    const m: string[] = [];
    if (!profile.skills?.length) m.push("Skills");
    if (!profile.experiences?.length) m.push("Experience");
    if (!profile.summary?.trim()) m.push("Summary");
    if (!profile.location?.trim()) m.push("Location");
    if (!profile.education?.length) m.push("Education");
    return m;
  }

  function onTailor(kind: "resume" | "cover") {
    const missing = missingProfileFields();
    if (missing.length) {
      setWarn({ kind, missing });
      return;
    }
    generate(kind);
  }

  const resume = job.tailored?.resume;
  const cover = job.tailored?.cover;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
          onClick={() => router.push("/pipeline")}
        >
          <FiArrowLeft aria-hidden /> Pipeline
        </button>
        <button
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-danger/10 hover:text-danger"
          onClick={() => {
            removeJob(job.id);
            router.push("/pipeline");
          }}
        >
          <FiTrash2 aria-hidden /> Delete
        </button>
      </div>

      {/* Header */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <div className="mt-1 text-muted">{job.company}</div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <FiMapPin aria-hidden /> {job.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <FiGlobe aria-hidden /> {job.source}
              </span>
              <span className="inline-flex items-center gap-1">
                <FiClock aria-hidden /> {job.postedDaysAgo}d ago
              </span>
              <span className="inline-flex items-center gap-1">
                <FiDollarSign aria-hidden />
                {job.hasSalary ? "salary listed" : "no salary"}
              </span>
            </div>
            {job.analysis && (
              <div className="mt-3">
                <GhostBadge verdict={job.analysis.ghostVerdict} />
              </div>
            )}
          </div>

          {job.analysis ? (
            <div className="text-center">
              <ScoreRing score={job.analysis.matchScore} />
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                fit score
              </div>
            </div>
          ) : (
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-dashed border-line text-[10px] text-muted">
              not analyzed
            </div>
          )}
        </div>

        {/* Status */}
        <div className="mt-5">
          <div className="label">Status</div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FLOW.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={
                  "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition " +
                  (job.status === s
                    ? "bg-brand-500 text-white shadow-[0_4px_12px_-2px_rgba(79,70,229,0.5)]"
                    : "bg-brand-100 text-brand-700 hover:bg-brand-300/50")
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            className="btn-primary inline-flex items-center gap-1.5"
            onClick={runAnalyze}
            disabled={loading !== ""}
          >
            <FiZap aria-hidden />
            {loading === "analyze"
              ? "Analyzing…"
              : job.analysis
              ? "Re-analyze"
              : "Analyze fit + ghost"}
          </button>
          <button
            className="btn-coral inline-flex items-center gap-1.5"
            onClick={() => onTailor("resume")}
            disabled={loading !== ""}
          >
            <FiFileText aria-hidden />
            {loading === "resume" ? "Generating…" : "Tailor Resume"}
          </button>
          <button
            className="btn-outline inline-flex items-center gap-1.5"
            onClick={() => onTailor("cover")}
            disabled={loading !== ""}
          >
            <FiMail aria-hidden />
            {loading === "cover" ? "Generating…" : "Tailor Cover Letter"}
          </button>
        </div>

        {/* Incomplete-profile warning */}
        {warn && (
          <div className="mt-4 rounded-lg border border-amber/40 bg-amber/5 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-amber">
              <FiAlertTriangle aria-hidden /> Your profile is missing:{" "}
              {warn.missing.join(", ")}
            </div>
            <p className="mt-1 text-muted">
              A complete profile makes a much stronger {warn.kind}. Fill these in
              first for the best result.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn-primary"
                onClick={() => router.push("/profile")}
              >
                Complete profile
              </button>
              <button
                className="btn-outline"
                onClick={() => {
                  const k = warn.kind;
                  setWarn(null);
                  generate(k);
                }}
              >
                Generate anyway
              </button>
              <button className="btn-outline" onClick={() => setWarn(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Empty prompt */}
      {!job.analysis && (
        <div className="card border-dashed p-8 text-center text-sm text-muted">
          Run <span className="font-semibold text-ink">Analyze</span> for your fit
          score and ghost-job check, then{" "}
          <span className="font-semibold text-ink">Tailor</span> a resume & cover
          letter for this job.
        </div>
      )}

      {/* Analysis */}
      {job.analysis && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-3 font-semibold">Why this match</h3>
            <ul className="space-y-1.5 text-sm">
              {job.analysis.matchReasons.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <GoDotFill className="mt-1 shrink-0 text-brand-500" aria-hidden />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            {job.analysis.gaps.length > 0 && (
              <div className="mt-4">
                <div className="label">Keywords to address</div>
                <div className="flex flex-wrap gap-1.5">
                  {job.analysis.gaps.map((g) => (
                    <span key={g} className="chip bg-warn/10 text-warn">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              Ghost-job check <GhostBadge verdict={job.analysis.ghostVerdict} />
            </h3>
            <ul className="space-y-1.5 text-sm">
              {job.analysis.ghostReasons.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <GoDotFill className="mt-1 shrink-0 text-muted" aria-hidden />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Tailored Resume */}
      {resume && (
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Tailored Resume</h3>
              <span className="chip inline-flex items-center gap-1 bg-ok/10 text-ok">
                <FiLock aria-hidden /> Truth-Lock
              </span>
            </div>
            {resume.docxUrl && (
              <a
                href={resume.docxUrl}
                download={`${resume.name || "resume"}-${job.company}.docx`}
                className="btn-primary inline-flex items-center gap-1.5"
              >
                <FiDownload aria-hidden /> Download .docx
              </a>
            )}
          </div>

          {resume.flagged.length > 0 && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm">
              <div className="font-semibold text-danger">
                Truth-Lock removed unverified claims:
              </div>
              <ul className="mt-1 list-disc pl-5 text-danger/90">
                {resume.flagged.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Document preview */}
          <div className="rounded-xl border border-line bg-canvas p-5">
            <div className="text-center">
              <div className="text-xl font-bold">{resume.name}</div>
              {resume.title && (
                <div className="text-sm text-muted">{resume.title}</div>
              )}
              <div className="mt-1 text-xs text-muted">
                {[resume.email, resume.phone, resume.location]
                  .filter(Boolean)
                  .join("  ·  ")}
              </div>
            </div>

            {resume.summary && (
              <ResumeSection title="Professional Summary">
                <p className="text-sm">{resume.summary}</p>
              </ResumeSection>
            )}

            {resume.skills.length > 0 && (
              <ResumeSection title="Skills">
                <p className="text-sm">{resume.skills.join(" · ")}</p>
              </ResumeSection>
            )}

            {resume.experiences.length > 0 && (
              <ResumeSection title="Experience">
                <div className="space-y-3">
                  {resume.experiences.map((e, i) => (
                    <div key={i}>
                      <div className="text-sm font-semibold">
                        {e.role}
                        {e.company ? ` — ${e.company}` : ""}
                        {e.dates ? (
                          <span className="font-normal text-muted">
                            {"  "}({e.dates})
                          </span>
                        ) : null}
                      </div>
                      <ul className="mt-1 space-y-1 text-sm">
                        {e.bullets.map((b, k) => (
                          <li key={k} className="flex gap-2">
                            <GoDotFill className="mt-1 shrink-0 text-brand-500" aria-hidden />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </ResumeSection>
            )}

            {resume.education && (
              <ResumeSection title="Education">
                <p className="text-sm">{resume.education}</p>
              </ResumeSection>
            )}
          </div>

          {resume.factGaps.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber/40 bg-amber/5 p-3 text-sm">
              <div className="font-semibold text-amber">
                Add a real metric to strengthen these (we won’t invent them):
              </div>
              <ul className="mt-1 list-disc pl-5">
                {resume.factGaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Tailored Cover Letter */}
      {cover && (
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="font-semibold">Tailored Cover Letter</h3>
            {cover.docxUrl && (
              <a
                href={cover.docxUrl}
                download={`${profile.fullName || "cover"}-${job.company}.docx`}
                className="btn-primary inline-flex items-center gap-1.5"
              >
                <FiDownload aria-hidden /> Download .docx
              </a>
            )}
          </div>
          <pre className="whitespace-pre-wrap rounded-xl border border-line bg-canvas p-5 font-sans text-sm">
            {cover.text}
          </pre>
        </section>
      )}

      {/* JD */}
      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">Job description</summary>
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{job.jdText}</p>
      </details>
    </div>
  );
}

function ResumeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-700">
        {title}
      </div>
      {children}
    </div>
  );
}

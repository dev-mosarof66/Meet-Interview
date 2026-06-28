"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Job } from "@/lib/types";
import { GhostBadge, ScoreRing, StatusBadge } from "@/components/ui";
import { FiArrowRight, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { Skeleton } from "@/components/Skeleton";
import CountUp from "@/components/CountUp";

const HELP_KEY = "meet.pipelineHelp";

function uid() {
  return "j" + Math.random().toString(36).slice(2, 9);
}

const STEPS = [
  {
    n: "1",
    t: "Add a job",
    d: 'Found a posting on LinkedIn or Indeed? Click "+ Add job" and paste the details.',
  },
  {
    n: "2",
    t: "Check it",
    d: "Open the job and run Analyze — get a fit score and a real-vs-ghost-job warning before you waste time.",
  },
  {
    n: "3",
    t: "Tailor it",
    d: "Let AI rewrite your resume & cover letter for that exact role — using only your real facts.",
  },
  {
    n: "4",
    t: "Track it",
    d: "Move it Saved → Applied → Responded → Interview, and watch your response rate climb.",
  },
];

export default function PipelinePage() {
  const { ready, jobs, addJob } = useStore();
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(true);
  const [bonus, setBonus] = useState<{
    claimed: boolean;
    percent: number;
    jobs: number;
  } | null>(null);
  const [bonusDismissed, setBonusDismissed] = useState(false);
  const [addError, setAddError] = useState(false);

  function refreshBonus() {
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) =>
        setBonus({
          claimed: !!d.claimed,
          percent: d.percent || 0,
          jobs: d.jobs || 0,
        })
      )
      .catch(() => {});
  }

  useEffect(() => {
    refreshBonus();
  }, []);
  const [form, setForm] = useState({
    company: "",
    title: "",
    location: "Remote",
    source: "LinkedIn",
    postedDaysAgo: 3,
    hasSalary: true,
    jdText: "",
  });

  useEffect(() => {
    try {
      if (localStorage.getItem(HELP_KEY) === "closed") setHelpOpen(false);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleHelp() {
    setHelpOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(HELP_KEY, next ? "open" : "closed");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const stats = useMemo(() => {
    const applied = jobs.filter((j) =>
      ["applied", "responded", "interview", "offer", "rejected"].includes(
        j.status,
      ),
    ).length;
    const responded = jobs.filter((j) =>
      ["responded", "interview", "offer"].includes(j.status),
    ).length;
    const interviews = jobs.filter((j) =>
      ["interview", "offer"].includes(j.status),
    ).length;
    const rate = applied ? Math.round((responded / applied) * 100) : 0;
    return { applied, responded, interviews, rate };
  }, [jobs]);

  function submit() {
    if (!form.company || !form.title) return;
    const job: Job = {
      id: uid(),
      company: form.company,
      title: form.title,
      location: form.location || "—",
      source: form.source,
      jdText: form.jdText,
      postedDaysAgo: Number(form.postedDaysAgo) || 0,
      hasSalary: form.hasSalary,
      status: "saved",
      createdAt: Date.now(),
    };
    setAddError(false);
    addJob(job).then((r) => {
      if (!r.ok) {
        setAddError(true);
        return;
      }
      refreshBonus();
      setOpen(false);
      setForm({ ...form, company: "", title: "", location: "Remote", jdText: "" });
    });
  }

  return (
    <div className="space-y-6">
      {/* Gamification prompt */}
      {bonus && !bonus.claimed && !bonusDismissed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-coral-500/40 bg-coral-500/10 p-4">
          <div className="text-sm">
            <span className="font-semibold text-ink">🎁 Unlock 3 free resume + 3 cover-letter tailors</span>
            <span className="text-muted">
              {" "}— complete your profile to 100% ({bonus.percent}% done).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/profile" className="btn-coral">
              Complete profile
            </Link>
            <button
              onClick={() => setBonusDismissed(true)}
              aria-label="Dismiss"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:text-ink"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Hero metric */}
      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            Your response rate
          </div>
          {ready ? (
            <>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-coral-500">
                  <CountUp value={`${stats.rate}`} />%
                </span>
                <span className="text-sm text-muted">response rate</span>
              </div>
              <div className="mt-1 text-sm text-muted">
                {stats.responded} responses · {stats.interviews} interviews from{" "}
                {stats.applied} applications
              </div>
            </>
          ) : (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-4 w-52" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <button className="btn-primary" onClick={() => setOpen((v) => !v)}>
            + Add job
          </button>
          {bonus && (
            <span className="text-xs text-muted">
              <span className="font-semibold text-ink">{bonus.jobs}</span> free job
              {bonus.jobs === 1 ? "" : "s"} left
            </span>
          )}
        </div>
      </section>

      {/* Instructions — collapsible, available anytime */}
      <section className="card overflow-hidden">
        <button
          onClick={toggleHelp}
          className="flex w-full items-center justify-between p-4 text-left"
          aria-expanded={helpOpen}
        >
          <span className="font-semibold">👋 How the Pipeline works</span>
          {helpOpen ? (
            <FiChevronUp className="text-muted" aria-hidden />
          ) : (
            <FiChevronDown className="text-muted" aria-hidden />
          )}
        </button>
        {helpOpen && (
          <div className="border-t border-line p-5 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {STEPS.map((s) => (
                <div key={s.n} className="flex gap-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {s.n}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{s.t}</div>
                    <div className="text-sm text-muted">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-lg bg-coral-500/10 px-3 py-2 text-xs text-coral-600">
              💡 The goal is more <span className="font-semibold">replies</span>
              , not more applications — skip ghost jobs, tailor honestly, and
              track what actually works.
            </p>
          </div>
        )}
      </section>

      {/* Add job popup */}
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-fade w-full max-w-lg space-y-3 rounded-2xl border border-line bg-surface p-6 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Add a job</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-brand-100 hover:text-brand-700"
              >
                ✕
              </button>
            </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Company</label>
              <input
                className="input"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Location</label>
              <select
                className="input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              >
                <option value="Remote">Remote</option>
                <option value="Local">Local (On-site)</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="label">Source</label>
              <select
                className="input"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                <option value="LinkedIn">LinkedIn</option>
                <option value="Indeed">Indeed</option>
                <option value="Glassdoor">Glassdoor</option>
                <option value="ZipRecruiter">ZipRecruiter</option>
                <option value="Wellfound">Wellfound</option>
                <option value="Company site">Company site</option>
                <option value="Referral">Referral</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Posted (days ago)</label>
              <input
                type="number"
                className="input"
                value={form.postedDaysAgo}
                onChange={(e) =>
                  setForm({ ...form, postedDaysAgo: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.hasSalary}
                  onChange={(e) =>
                    setForm({ ...form, hasSalary: e.target.checked })
                  }
                />
                Salary range disclosed
              </label>
            </div>
          </div>
          <div>
            <label className="label">Job description</label>
            <textarea
              className="input min-h-[88px]"
              value={form.jdText}
              onChange={(e) => setForm({ ...form, jdText: e.target.value })}
              placeholder="Paste the job description here…"
            />
          </div>
          {addError && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              You're out of free job slots. Complete your profile to 100% to
              unlock 3 free jobs.{" "}
              <Link href="/profile" className="font-semibold underline">
                Complete profile
              </Link>
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={submit}>
              Save job
            </button>
            <button className="btn-outline" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          </div>
        </div>
      )}

      {/* Job list */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Pipeline {ready ? `(${jobs.length})` : ""}
        </h2>
        {!ready ? (
          <>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
            ))}
          </>
        ) : (
          <>
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/job/${job.id}`}
            className="card flex items-center gap-4 p-4 transition hover:border-brand-300"
          >
            {job.analysis ? (
              <ScoreRing score={job.analysis.matchScore} size={56} />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-full border border-dashed border-line text-[10px] text-muted">
                analyze
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{job.title}</span>
                <StatusBadge status={job.status} />
                {job.analysis && (
                  <GhostBadge verdict={job.analysis.ghostVerdict} />
                )}
              </div>
              <div className="text-sm text-muted">
                {job.company} · {job.location} · {job.source} · posted{" "}
                {job.postedDaysAgo}d ago
              </div>
            </div>
            <FiArrowRight className="text-brand-500" aria-hidden />
          </Link>
        ))}
        {jobs.length === 0 && (
          <div className="card p-8 text-center text-muted">
            No jobs yet. Click{" "}
            <span className="font-semibold text-ink">“+ Add job”</span> to add
            your first one.
          </div>
        )}
          </>
        )}
      </section>
    </div>
  );
}

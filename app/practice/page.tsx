"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PrepSession, SENIORITIES, Stack } from "@/lib/types";
import { ScoreRing } from "@/components/ui";
import { Skeleton } from "@/components/Skeleton";
import {
  FiArrowRight,
  FiBriefcase,
  FiCode,
  FiTrendingUp,
  FiTarget,
} from "react-icons/fi";

const STACK_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  swe: FiCode,
  marketing: FiTrendingUp,
};

function inferSeniority(title: string): string {
  const t = title.toLowerCase();
  if (/\b(intern|junior|jr\.?|entry|graduate)\b/.test(t)) return "junior";
  if (/\b(staff|principal|lead|head|director|vp)\b/.test(t)) return "lead";
  if (/\bsenior|sr\.?\b/.test(t)) return "senior";
  return "mid";
}

export default function PracticePage() {
  const router = useRouter();
  const { ready, jobs, profile } = useStore();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<PrepSession[]>([]);
  const [stacks, setStacks] = useState<Stack[]>([]);

  // New-session form
  const [mode, setMode] = useState<"job" | "stack">("stack");
  const [stackId, setStackId] = useState("swe");
  const [seniority, setSeniority] = useState("mid");
  const [role, setRole] = useState("");
  const [jobId, setJobId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/prep")
      .then((r) => r.json())
      .then((d) => {
        setSessions(Array.isArray(d.sessions) ? d.sessions : []);
        if (Array.isArray(d.stacks)) setStacks(d.stacks);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Preselect a job when arriving from the "Prepare for interview" CTA.
  useEffect(() => {
    const j = new URLSearchParams(window.location.search).get("job");
    if (j) {
      setMode("job");
      setJobId(j);
    }
  }, []);

  // Jobs worth prepping for surface first (you got a response/interview).
  const prepJobs = useMemo(
    () =>
      [...jobs].sort((a, b) => {
        const hot = (s: string) =>
          ["interview", "responded", "offer"].includes(s) ? 0 : 1;
        return hot(a.status) - hot(b.status);
      }),
    [jobs]
  );

  const selectedJob = prepJobs.find((j) => j.id === jobId);

  async function create() {
    setError("");
    const body: Record<string, unknown> = { stackId, seniority, profile };
    if (mode === "job") {
      if (!selectedJob) {
        setError("Pick a job from your pipeline first.");
        return;
      }
      body.jobId = selectedJob.id;
      body.role = selectedJob.title;
      body.company = selectedJob.company;
      body.jdText = selectedJob.jdText;
      body.seniority = inferSeniority(selectedJob.title);
    } else {
      body.role = role || stacks.find((s) => s.id === stackId)?.name || "";
    }
    setCreating(true);
    try {
      const res = await fetch("/api/prep/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.session) {
        setError(data.error || "Could not build your prep plan.");
        return;
      }
      router.push(`/prep/${data.session.id}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setCreating(false);
    }
  }

  if (!ready || loading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FiTarget className="text-brand-500" aria-hidden /> Interview Practice
        </h1>
        <p className="mt-1 text-sm text-muted">
          Got the callback? Prepare with role-specific, personalized drills —
          built from your profile and the job you&apos;re interviewing for.
        </p>
      </div>

      {/* New session */}
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">Start a new prep session</h2>

        {/* Mode toggle */}
        <div className="mb-5 inline-flex rounded-lg border border-line bg-canvas p-1">
          <button
            onClick={() => setMode("stack")}
            className={
              "rounded-md px-3 py-1.5 text-sm font-semibold transition " +
              (mode === "stack"
                ? "bg-brand-500 text-white"
                : "text-muted hover:text-ink")
            }
          >
            Pick a role
          </button>
          <button
            onClick={() => setMode("job")}
            className={
              "rounded-md px-3 py-1.5 text-sm font-semibold transition " +
              (mode === "job"
                ? "bg-brand-500 text-white"
                : "text-muted hover:text-ink")
            }
          >
            From a pipeline job
          </button>
        </div>

        {mode === "stack" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {stacks.map((s) => {
                const Icon = STACK_ICON[s.id] || FiTarget;
                const active = stackId === s.id;
                const soon = s.comingSoon;
                return (
                  <button
                    key={s.id}
                    onClick={() => !soon && setStackId(s.id)}
                    disabled={soon}
                    aria-disabled={soon}
                    className={
                      "relative rounded-xl border p-4 text-left transition " +
                      (soon
                        ? "cursor-not-allowed border-dashed border-line bg-canvas opacity-70"
                        : active
                        ? "border-brand-500/50 ring-2 ring-brand-500/20"
                        : "border-line bg-surface hover:border-brand-300")
                    }
                  >
                    {soon && (
                      <span className="chip absolute right-3 top-3 bg-amber/15 text-amber">
                        Coming soon
                      </span>
                    )}
                    <div className="flex items-center gap-2 font-semibold">
                      <Icon className="text-brand-500" aria-hidden /> {s.name}
                    </div>
                    <p className="mt-1 text-sm text-muted">{s.tagline}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.rounds.map((r) => (
                        <span key={r.key} className="chip bg-brand-100 text-brand-700">
                          {r.label}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Target role (optional)</label>
                <input
                  className="input"
                  placeholder={stacks.find((s) => s.id === stackId)?.name}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Seniority</label>
                <select
                  className="input capitalize"
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                >
                  {SENIORITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {prepJobs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
                No jobs in your pipeline yet.{" "}
                <Link href="/pipeline" className="font-semibold text-brand-500 underline">
                  Add a job
                </Link>{" "}
                first, or pick a role above.
              </div>
            ) : (
              <>
                <div>
                  <label className="label">Interviewing for</label>
                  <select
                    className="input"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                  >
                    <option value="">Select a job…</option>
                    {prepJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} — {j.company} ({j.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Interview track</label>
                  <select
                    className="input"
                    value={stackId}
                    onChange={(e) => setStackId(e.target.value)}
                  >
                    {stacks.map((s) => (
                      <option key={s.id} value={s.id} disabled={s.comingSoon}>
                        {s.name}
                        {s.comingSoon ? " (coming soon)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedJob && (
                  <p className="text-xs text-muted">
                    Seniority auto-detected:{" "}
                    <span className="font-semibold capitalize text-ink">
                      {inferSeniority(selectedJob.title)}
                    </span>
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <button
          className="btn-primary mt-5 inline-flex items-center gap-1.5"
          onClick={create}
          disabled={creating || (mode === "job" && prepJobs.length === 0)}
        >
          {creating ? "Building your plan…" : "Generate prep plan"}
          {!creating && <FiArrowRight aria-hidden />}
        </button>
      </section>

      {/* Existing sessions */}
      {sessions.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Continue preparing</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {sessions.map((s) => (
              <Link
                key={s.id}
                href={`/prep/${s.id}`}
                className="card flex items-center justify-between gap-3 p-4 transition hover:border-brand-300"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold">
                    {s.jobId ? (
                      <FiBriefcase className="shrink-0 text-brand-500" aria-hidden />
                    ) : (
                      <FiTarget className="shrink-0 text-brand-500" aria-hidden />
                    )}
                    <span className="truncate">{s.role || s.stackName}</span>
                  </div>
                  <div className="mt-0.5 truncate text-sm text-muted capitalize">
                    {s.company ? `${s.company} · ` : ""}
                    {s.stackName} · {s.seniority}
                  </div>
                </div>
                <div className="text-center">
                  <ScoreRing score={s.readiness} size={52} />
                  <div className="mt-0.5 text-[10px] font-semibold uppercase text-muted">
                    ready
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

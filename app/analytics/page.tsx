"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { AnalyticsSkeleton } from "@/components/Skeleton";

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={"mt-1 text-3xl font-bold " + (accent ? "text-coral-500" : "text-brand-900 dark:text-white")}>{value}</div>
      {sub && <div className="mt-1 text-sm text-muted">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { ready, jobs } = useStore();

  const data = useMemo(() => {
    const applied = jobs.filter((j) => ["applied", "responded", "interview", "offer", "rejected"].includes(j.status));
    const responded = jobs.filter((j) => ["responded", "interview", "offer"].includes(j.status));
    const interviews = jobs.filter((j) => ["interview", "offer"].includes(j.status));
    const ghostsAvoided = jobs.filter((j) => j.analysis?.ghostVerdict === "ghost").length;

    // per-source response rate
    const bySource: Record<string, { applied: number; responded: number }> = {};
    applied.forEach((j) => {
      bySource[j.source] = bySource[j.source] || { applied: 0, responded: 0 };
      bySource[j.source].applied++;
      if (["responded", "interview", "offer"].includes(j.status)) bySource[j.source].responded++;
    });

    const rate = applied.length ? Math.round((responded.length / applied.length) * 100) : 0;
    const per100 = applied.length ? Math.round((interviews.length / applied.length) * 100) : 0;
    return { applied: applied.length, responded: responded.length, interviews: interviews.length, ghostsAvoided, bySource, rate, per100 };
  }, [jobs]);

  if (!ready) return <AnalyticsSkeleton />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Outcome analytics</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Response rate" value={`${data.rate}%`} sub="vs ~4% market avg" accent />
        <StatCard label="Interviews / 100 apps" value={`${data.per100}`} sub="the metric that matters" />
        <StatCard label="Applications" value={`${data.applied}`} sub={`${data.responded} responded`} />
        <StatCard label="Ghost jobs avoided" value={`${data.ghostsAvoided}`} sub="flagged before applying" />
      </div>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Response rate by source</h2>
        {Object.keys(data.bySource).length === 0 && (
          <p className="text-sm text-muted">Apply to some jobs to see which sources respond best.</p>
        )}
        <div className="space-y-3">
          {Object.entries(data.bySource).map(([source, s]) => {
            const pct = s.applied ? Math.round((s.responded / s.applied) * 100) : 0;
            return (
              <div key={source}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{source}</span>
                  <span className="text-muted">{pct}% ({s.responded}/{s.applied})</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(4, pct)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-5 text-sm text-muted">
        <span className="font-semibold text-ink">Insight engine:</span> Meet Interview measures{" "}
        <span className="font-semibold text-ink">interviews-per-100-applications</span> — not applications sent.
        As you log outcomes, this page tells you which sources, roles, and resume versions actually get you answered.
      </section>
    </div>
  );
}

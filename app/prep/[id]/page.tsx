"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PrepAttempt, PrepQuestion, PrepSession } from "@/lib/types";
import { ScoreRing } from "@/components/ui";
import { Skeleton } from "@/components/Skeleton";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiCheckCircle,
  FiTarget,
} from "react-icons/fi";

type Loaded = {
  session: PrepSession;
  questions: PrepQuestion[];
  attempts: PrepAttempt[];
};

export default function PrepSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">(
    "loading",
  );

  useEffect(() => {
    fetch(`/api/prep/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!d.session) {
          setState("missing");
          return;
        }
        setData(d);
        setState("ready");
      })
      .catch(() => setState("missing"));
  }, [id]);

  if (state === "loading")
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );

  if (state === "missing" || !data)
    return (
      <div className="card p-8 text-center text-muted">
        Prep session not found.{" "}
        <button
          className="font-semibold text-brand-500 underline"
          onClick={() => router.push("/practice")}
        >
          Back to Practice
        </button>
      </div>
    );

  const { session, questions, attempts } = data;
  const answeredQ = new Set(attempts.map((a) => a.questionId));

  return (
    <div className="space-y-5">
      <Link
        href="/practice"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
      >
        <FiArrowLeft aria-hidden /> Practice
      </Link>

      {/* Header */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {session.jobId ? (
                <FiBriefcase aria-hidden />
              ) : (
                <FiTarget aria-hidden />
              )}
              {session.stackName} · {session.seniority}
            </div>
            <h1 className="mt-1 text-2xl font-bold">{session.role}</h1>
            {session.company && (
              <div className="text-muted">{session.company}</div>
            )}
          </div>
          <div className="text-center">
            <ScoreRing score={session.readiness} />
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
              readiness
            </div>
          </div>
        </div>

        {session.plan.summary && (
          <p className="mt-4 text-sm text-muted">{session.plan.summary}</p>
        )}

        {session.plan.focusAreas.length > 0 && (
          <div className="mt-4">
            <div className="label">Focus areas</div>
            <div className="flex flex-wrap gap-1.5">
              {session.plan.focusAreas.map((f) => (
                <span key={f} className="chip bg-coral-500/15 text-coral-600">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Rounds */}
      <section className="space-y-3">
        <h2 className="font-semibold">Rounds</h2>
        {session.plan.rounds.map((round) => {
          const qs = questions.filter((q) => q.roundKey === round.key);
          const done = qs.filter((q) => answeredQ.has(q.id)).length;
          const started = qs.length > 0;
          return (
            <Link
              key={round.key}
              href={`/prep/${session.id}/round/${round.key}`}
              className="card flex items-center justify-between gap-4 p-4 transition hover:border-brand-300"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold">
                  {started && done === qs.length && (
                    <FiCheckCircle className="shrink-0 text-ok" aria-hidden />
                  )}
                  {round.label}
                </div>
                {round.focus.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {round.focus.slice(0, 4).map((f) => (
                      <span key={f} className="chip text-brand-100 bg-brand-700/30 border-brand-700">
                        {f}
                      </span>
                    ))}

                    {round.focus.length > 4 && (
                      <span className="chip text-red-700">…</span>
                    )}
                  </div>
                )}
                <div className="mt-1.5 text-xs text-muted">
                  {started
                    ? `${done}/${qs.length} answered`
                    : "Not started — generate questions"}
                </div>
              </div>
              <FiArrowRight className="shrink-0 text-muted" aria-hidden />
            </Link>
          );
        })}
      </section>
    </div>
  );
}

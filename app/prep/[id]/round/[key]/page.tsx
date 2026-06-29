"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  PrepAttempt,
  PrepPlanRound,
  PrepQuestion,
  PrepSession,
} from "@/lib/types";
import { Skeleton } from "@/components/Skeleton";
import { scoreColor } from "@/components/ui";
import { FiArrowLeft, FiChevronRight, FiPlus, FiZap } from "react-icons/fi";

// High-contrast difficulty chips (readable in both themes).
const DIFF_CHIP: Record<string, string> = {
  easy: "bg-ok/15 text-ok",
  medium: "bg-amber/15 text-amber",
  hard: "bg-danger/15 text-danger",
};

export default function PrepRoundPage() {
  const { id, key } = useParams<{ id: string; key: string }>();
  const { profile } = useStore();

  const [session, setSession] = useState<PrepSession | null>(null);
  const [questions, setQuestions] = useState<PrepQuestion[]>([]);
  const [attempts, setAttempts] = useState<PrepAttempt[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch(`/api/prep/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!d.session) return setState("missing");
        setSession(d.session);
        setQuestions(d.questions || []);
        setAttempts(d.attempts || []);
        setState("ready");
      })
      .catch(() => setState("missing"));
  }, [id]);

  const round: PrepPlanRound | undefined = useMemo(
    () => session?.plan.rounds.find((r) => r.key === key),
    [session, key]
  );

  const roundQuestions = useMemo(
    () => questions.filter((q) => q.roundKey === key),
    [questions, key]
  );

  // Best score per question (across attempts).
  const bestScore = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of attempts)
      m.set(a.questionId, Math.max(m.get(a.questionId) ?? -1, a.score));
    return m;
  }, [attempts]);

  async function generate() {
    if (!session) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/prep/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, roundKey: key, profile }),
      });
      const data = await res.json();
      if (Array.isArray(data.questions))
        setQuestions((prev) => [...prev, ...data.questions]);
    } finally {
      setGenerating(false);
    }
  }

  if (state === "loading")
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );

  if (state === "missing" || !session || !round)
    return (
      <div className="card p-8 text-center text-muted">
        Round not found.{" "}
        <Link href="/practice" className="font-semibold text-brand-500 underline">
          Back to Practice
        </Link>
      </div>
    );

  return (
    <div className="space-y-5">
      <Link
        href={`/prep/${session.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
      >
        <FiArrowLeft aria-hidden /> {session.role || session.stackName}
      </Link>

      <section className="card p-5 sm:p-6">
        <h1 className="text-2xl font-bold">{round.label}</h1>
        <div className="mt-1 text-sm capitalize text-muted">
          {round.type.replace("-", " ")} round · {session.seniority} level
        </div>
        {round.focus.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {round.focus.map((f) => (
              <span key={f} className="chip text-brand-100 bg-brand-700/30 border-brand-700/80">
                {f}
              </span>
            ))}
          </div>
        )}
      </section>

      {roundQuestions.length === 0 ? (
        <div className="card border-dashed p-8 text-center text-sm text-muted">
          <p>
            Generate personalized questions for this round. Open any question to
            run a live mock interview with an AI interviewer.
          </p>
          <button
            className="btn-primary mx-auto mt-4 inline-flex items-center gap-1.5"
            onClick={generate}
            disabled={generating}
          >
            <FiZap aria-hidden />
            {generating ? "Generating…" : "Generate questions"}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {roundQuestions.map((q, i) => {
              const score = bestScore.get(q.id);
              const done = score != null;
              return (
                <Link
                  key={q.id}
                  href={`/prep/${session.id}/round/${key}/${q.id}`}
                  className="card flex items-center gap-4 p-4 transition hover:border-brand-500"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-500 text-base font-bold text-white">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink">Problem {i + 1}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`chip capitalize ${DIFF_CHIP[q.difficulty]}`}>
                        {q.difficulty}
                      </span>
                      <span
                        className={
                          "chip " +
                          (done
                            ? "bg-ok/15 text-ok"
                            : "text-brand-100 bg-red-700/30 border-red-700/80")
                        }
                      >
                        {done ? "Practiced" : "Not started"}
                      </span>
                    </div>
                  </div>
                  {done ? (
                    <div
                      className="shrink-0 text-center"
                      style={{ color: scoreColor(score! * 10) }}
                    >
                      <div className="text-2xl font-bold leading-none">{score}</div>
                      <div className="text-[10px] font-semibold uppercase">/10</div>
                    </div>
                  ) : (
                    <FiChevronRight className="shrink-0 text-muted" aria-hidden />
                  )}
                </Link>
              );
            })}
          </div>

          <button
            className="btn-outline inline-flex items-center gap-1.5"
            onClick={generate}
            disabled={generating}
          >
            <FiPlus aria-hidden />
            {generating ? "Generating…" : "Generate more questions"}
          </button>
        </>
      )}
    </div>
  );
}

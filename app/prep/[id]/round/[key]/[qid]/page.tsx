"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  InterviewTurn,
  PrepAttempt,
  PrepQuestion,
  PrepSession,
} from "@/lib/types";
import { Skeleton } from "@/components/Skeleton";
import { scoreColor } from "@/components/ui";
import { InlineMarkdown, Markdown } from "@/components/Markdown";
import {
  FiArrowLeft,
  FiCheck,
  FiCornerDownLeft,
  FiFlag,
  FiX,
} from "react-icons/fi";
import { GoDotFill } from "react-icons/go";

// High-contrast difficulty chips (readable in both themes).
const DIFF_CHIP: Record<string, string> = {
  easy: "bg-ok/15 text-ok",
  medium: "bg-amber/15 text-amber",
  hard: "bg-danger/15 text-danger",
};

export default function PrepCallPage() {
  const { id, key, qid } = useParams<{
    id: string;
    key: string;
    qid: string;
  }>();
  const { profile } = useStore();

  const [session, setSession] = useState<PrepSession | null>(null);
  const [question, setQuestion] = useState<PrepQuestion | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  const [messages, setMessages] = useState<InterviewTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<PrepAttempt | null>(null);
  const [aiOffline, setAiOffline] = useState(false);

  const startedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load the session + this question.
  useEffect(() => {
    fetch(`/api/prep/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!d.session) return setState("missing");
        const q = (d.questions || []).find((x: PrepQuestion) => x.id === qid);
        if (!q) return setState("missing");
        setSession(d.session);
        setQuestion(q);
        const best = (d.attempts || [])
          .filter((a: PrepAttempt) => a.questionId === qid)
          .reduce((m: number, a: PrepAttempt) => Math.max(m, a.score), -1);
        setBestScore(best >= 0 ? best : null);
        setState("ready");
      })
      .catch(() => setState("missing"));
  }, [id, qid]);

  // Interviewer opens the conversation once the question is loaded.
  useEffect(() => {
    if (state !== "ready" || !question || startedRef.current) return;
    startedRef.current = true;
    void sendTurn("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, question]);

  // Keep the transcript scrolled to the latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  async function sendTurn(message: string) {
    if (!session || !question) return;
    const history = messages;
    if (message) setMessages((prev) => [...prev, { role: "candidate", text: message }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/prep/mock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          questionId: question.id,
          history,
          message,
          profile,
        }),
      });
      const data = await res.json();
      setAiOffline(Boolean(data.offline));
      if (data.reply)
        setMessages((prev) => [...prev, { role: "interviewer", text: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "interviewer", text: "Sorry, I didn't catch that — could you repeat?" },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function finish() {
    if (!session || !question) return;
    const transcript = messages
      .filter((m) => m.role === "candidate")
      .map((m) => m.text)
      .join("\n\n");
    if (!transcript.trim()) return;
    setScoring(true);
    try {
      const res = await fetch("/api/prep/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          questionId: question.id,
          answer: transcript,
          profile,
        }),
      });
      const data = await res.json();
      if (data.attempt) {
        setResult(data.attempt);
        setBestScore((b) =>
          b == null ? data.attempt.score : Math.max(b, data.attempt.score)
        );
      }
    } finally {
      setScoring(false);
    }
  }

  const answered = useMemo(
    () => messages.some((m) => m.role === "candidate"),
    [messages]
  );

  if (state === "loading")
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-24" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );

  if (state === "missing" || !session || !question)
    return (
      <div className="card p-8 text-center text-muted">
        Question not found.{" "}
        <Link href="/practice" className="font-semibold text-brand-500 underline">
          Back to Practice
        </Link>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/prep/${session.id}/round/${key}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
        >
          <FiArrowLeft aria-hidden /> Back to questions
        </Link>
        {bestScore != null && (
          <span className="chip bg-brand-100 font-semibold text-brand-700">
            Best so far: {bestScore}/10
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:h-[calc(100dvh-7rem)] lg:grid-cols-2">
        {/* Left: the problem */}
        <section className="card p-5 lg:h-full lg:overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="chip bg-amber-700/20 border-red-700 capitalize text-brand-100">
              {question.type.replace("-", " ")}
            </span>
            <span
              className={`chip capitalize ${
                DIFF_CHIP[question.difficulty] || "bg-brand-100 text-brand-700"
              }`}
            >
              {question.difficulty}
            </span>
            {question.topic && (
              <span className="chip border border-line text-muted">
                {question.topic}
              </span>
            )}
          </div>
          <Markdown text={question.prompt} className="mt-3 text-sm" />

          {question.rubric.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <div className="label">What good looks like</div>
              <ul className="space-y-1.5 text-sm text-muted">
                {question.rubric.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <GoDotFill className="mt-1.5 shrink-0 text-brand-500" aria-hidden />
                    <span>
                      <InlineMarkdown text={r} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Right: the AI interviewer */}
        <section className="card flex h-[70vh] flex-col overflow-hidden lg:h-full">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">
              AI
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">
                AI Interviewer
              </div>
              <div
                className={
                  "text-[11px] " + (aiOffline ? "text-warn" : "text-muted")
                }
              >
                {sending
                  ? "typing…"
                  : aiOffline
                  ? "AI Interviwer Offline"
                  : "Live Mock Interview"}
              </div>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
          >
            {messages.map((m, i) => (
              <Bubble key={i} turn={m} />
            ))}
            {sending && (
              <div className="flex items-center gap-1 text-muted">
                <span className="h-2 w-2 animate-pulse rounded-full bg-muted" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-muted [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-muted [animation-delay:300ms]" />
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-line p-3">
            <div className="flex items-end gap-2">
              <textarea
                className="input min-h-16 flex-1"
                placeholder="Type your response…"
                value={input}
                rows={1}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !sending) sendTurn(input.trim());
                  }
                }}
                disabled={sending || scoring}
              />
              <button
                className="btn-primary h-[44px] px-3"
                onClick={() => input.trim() && sendTurn(input.trim())}
                disabled={!input.trim() || sending || scoring}
                aria-label="Send"
              >
                <FiCornerDownLeft aria-hidden />
              </button>
            </div>
            <button
              className="btn-coral mt-2 inline-flex w-full items-center justify-center gap-1.5"
              onClick={finish}
              disabled={!answered || scoring || sending}
            >
              <FiFlag aria-hidden />
              {scoring ? "Scoring your interview…" : "Finish & score"}
            </button>
          </div>
        </section>
      </div>

      {/* Feedback after scoring */}
      {result && <Feedback attempt={result} />}
    </div>
  );
}

function Bubble({ turn }: { turn: InterviewTurn }) {
  const isAI = turn.role === "interviewer";
  return (
    <div className={"flex " + (isAI ? "justify-start" : "justify-end")}>
      <div
        className={
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm " +
          (isAI
            ? "rounded-tl-sm bg-brand-700/50 text-brand-100"
            : "whitespace-pre-wrap rounded-tr-sm bg-brand-500 text-white")
        }
      >
        {isAI ? (
          <Markdown
            text={turn.text}
            strongClass="font-semibold text-brand-900"
            codeClass="rounded bg-amber-900/30 px-1 py-0.5 font-mono text-[0.85em] text-brand-200"
          />
        ) : (
          turn.text
        )}
      </div>
    </div>
  );
}

function Feedback({ attempt }: { attempt: PrepAttempt }) {
  const fb = attempt.feedback;
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Interview feedback</h3>
        <div
          className="text-center"
          style={{ color: scoreColor(attempt.score * 10) }}
        >
          <span className="text-2xl font-bold">{attempt.score}</span>
          <span className="text-xs font-semibold">/10</span>
        </div>
      </div>

      {fb.star && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["situation", "task", "action", "result"] as const).map((k) => {
            const ok = fb.star?.[k];
            return (
              <span
                key={k}
                className={
                  "chip capitalize " +
                  (ok ? "bg-ok/10 text-ok" : "bg-danger/10 text-danger")
                }
              >
                {ok ? <FiCheck aria-hidden /> : <FiX aria-hidden />} {k}
              </span>
            );
          })}
        </div>
      )}

      {fb.strengths.length > 0 && (
        <div className="mb-3">
          <div className="label text-ok">Strengths</div>
          <ul className="space-y-1 text-sm">
            {fb.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <FiCheck className="mt-0.5 shrink-0 text-ok" aria-hidden />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fb.gaps.length > 0 && (
        <div className="mb-3">
          <div className="label text-warn">To improve</div>
          <ul className="space-y-1 text-sm">
            {fb.gaps.map((g, i) => (
              <li key={i} className="flex gap-2">
                <GoDotFill className="mt-1 shrink-0 text-warn" aria-hidden />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fb.modelAnswer && (
        <div>
          <div className="label">Model answer</div>
          <div className="rounded-lg border border-line bg-canvas p-3 text-sm">
            <Markdown text={fb.modelAnswer} />
          </div>
        </div>
      )}
    </section>
  );
}

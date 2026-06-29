"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiLock, FiAlertTriangle, FiArrowRight } from "react-icons/fi";
import { GoDotFill } from "react-icons/go";
import CountUp from "./CountUp";

const STEP_MS = 3800;

const STEPS = [
  { label: "Paste a job", hint: "Drop in any posting" },
  { label: "Instant analysis", hint: "Fit score + ghost check" },
  { label: "Honest tailoring", hint: "Truth-Lock resume" },
  { label: "Track replies", hint: "See what actually works" },
];

export default function HeroTimeline() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / STEP_MS);
      setProgress(p);
      if (p >= 1) setActive((a) => (a + 1) % STEPS.length);
    }, 40);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="w-full">
      {/* Window frame */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {/* chrome */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="h-3 w-3 rounded-full bg-danger/70" />
          <span className="h-3 w-3 rounded-full bg-amber/70" />
          <span className="h-3 w-3 rounded-full bg-ok/70" />
          <span className="ml-3 font-mono text-xs text-muted">
            meetinterview.app
          </span>
        </div>

        {/* Timeline rail */}
        <div className="grid grid-cols-4 gap-2 px-4 pt-4">
          {STEPS.map((s, i) => {
            const done = i < active;
            const isActive = i === active;
            return (
              <button
                key={s.label}
                onClick={() => setActive(i)}
                className="group text-left"
              >
                <div className="relative mb-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-coral-500 transition-[width] duration-100 ease-linear"
                    style={{
                      width: done
                        ? "100%"
                        : isActive
                          ? `${progress * 100}%`
                          : "0%",
                    }}
                  />
                </div>
                <div
                  className={
                    "flex items-center gap-1.5 text-[11px] font-semibold transition " +
                    (isActive || done ? "text-ink" : "text-muted")
                  }
                >
                  <span
                    className={
                      "grid h-4 w-4 place-items-center rounded-full text-[9px] " +
                      (isActive
                        ? "bg-coral-500 text-white"
                        : done
                          ? "bg-ok text-white"
                          : "bg-line text-muted")
                    }
                  >
                    {done ? <FiCheck aria-hidden /> : i + 1}
                  </span>
                  <span className="truncate">{s.label}</span>
                </div>
                <div className="mt-0.5 hidden truncate pl-5 text-[10px] text-muted sm:block">
                  {s.hint}
                </div>
              </button>
            );
          })}
        </div>

        {/* Animated screen */}
        <div className="px-4 pb-5 pt-4">
          <div key={active} className="animate-fade min-h-[208px]">
            {active === 0 && <ScreenPaste />}
            {active === 1 && <ScreenAnalyze />}
            {active === 2 && <ScreenTailor />}
            {active === 3 && <ScreenTrack />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Step screens ---------- */

function ScreenPaste() {
  return (
    <div className="space-y-3 h-full flex flex-col justify-between">
      <div className="space-y-3">
        <div className="label">Paste the job you found</div>
        <div className="rounded-lg border border-line bg-canvas p-3 text-xs leading-relaxed text-muted">
          <span className="text-ink">Senior Product Marketing Manager</span> —
          own go-to-market strategy, product launches, positioning &amp;
          messaging, lifecycle marketing. HubSpot, SQL a plus. Salary
          $145k–$170k.
          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-coral-500 align-middle" />
        </div>
      </div>
      <button className="btn-coral inline-flex w-full items-center justify-center gap-1 cursor-none">
        Check this job <FiArrowRight aria-hidden />
      </button>
    </div>
  );
}

function ScreenAnalyze() {
  return (
    <div className="flex items-center gap-4">
      <Ring score={78} />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="chip inline-flex items-center gap-1 bg-ok/15 text-ok">
            <FiCheck aria-hidden /> Likely real job
          </span>
        </div>
        <div className="text-sm font-semibold text-ink">Strong match</div>
        <div className="flex flex-wrap gap-1.5">
          {["GO TO MARKET", "LAUNCHES", "LIFECYCLE", "SQL"].map((k) => (
            <span key={k} className="chip bg-brand-100 text-brand-700">
              {k}
            </span>
          ))}
        </div>
        <div className="text-xs text-muted">Salary listed · posted 4d ago</div>
      </div>
    </div>
  );
}

function ScreenTailor() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-ink">Tailored resume</span>
        <span className="chip inline-flex items-center gap-1 bg-ok/15 text-ok">
          <FiLock aria-hidden /> Truth-Lock on
        </span>
      </div>
      {[
        "Led go-to-market for 3 launches, grew pipeline 38% YoY",
        "Lifted trial-to-paid conversion from 9% to 14%",
        "Cut new-rep ramp time from 90 to 45 days",
      ].map((b, i) => (
        <div
          key={i}
          className="animate-fade flex gap-2 rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <GoDotFill className="mt-0.5 shrink-0 text-coral-500" aria-hidden />
          <span>{b}</span>
        </div>
      ))}
      <div className="flex items-center gap-1 text-[11px] text-amber">
        <FiAlertTriangle aria-hidden /> Only your real numbers — nothing invented.
      </div>
    </div>
  );
}

function ScreenTrack() {
  const rows = [
    { co: "Helio Analytics", st: "Interview", cls: "bg-amber/15 text-amber" },
    {
      co: "Cedar Fintech",
      st: "Responded",
      cls: "bg-coral-500/15 text-coral-600",
    },
    { co: "VagueCorp", st: "Ghost — skipped", cls: "bg-danger/10 text-danger" },
  ];
  return (
    <div className="space-y-3">
      <div>
        <div className="label">Your response rate</div>
        <div className="flex items-baseline gap-2">

          <span className="text-3xl font-bold text-coral-500">
            <CountUp value="23" />
            %</span>
          <span className="text-xs text-muted">vs ~<CountUp value="4" />% market avg</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div
            key={r.co}
            className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2 text-xs"
          >
            <span className="font-medium text-ink">{r.co}</span>
            <span className={`chip ${r.cls}`}>{r.st}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Ring({ score }: { score: number }) {
  const size = 76;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--line))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#16A34A"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c}
          style={{ animation: "ringfill 1.1s ease forwards" }}
        />
      </svg>
      <CountUp value={`${score}`} className="absolute text-lg font-bold text-ok" />
      <style>{`@keyframes ringfill{to{stroke-dashoffset:${c - (score / 100) * c}}}`}</style>
    </div>
  );
}

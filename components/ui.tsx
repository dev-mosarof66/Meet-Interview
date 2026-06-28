"use client";

import { FaGhost } from "react-icons/fa6";
import { AppStatus, GhostVerdict } from "@/lib/types";

export function scoreColor(score: number): string {
  if (score >= 75) return "#16A34A";
  if (score >= 55) return "#84CC16";
  if (score >= 35) return "#F59E0B";
  return "#DC2626";
}

export function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = scoreColor(score);
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E4E4E7" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-bold" style={{ color }}>
          {score}
        </div>
      </div>
    </div>
  );
}

const GHOST_STYLE: Record<GhostVerdict, { label: string; cls: string }> = {
  real: { label: "Likely real", cls: "bg-ok/10 text-ok" },
  caution: { label: "Caution", cls: "bg-warn/10 text-warn" },
  ghost: { label: "Likely ghost job", cls: "bg-danger/10 text-danger" },
};

export function GhostBadge({ verdict }: { verdict: GhostVerdict }) {
  const s = GHOST_STYLE[verdict];
  return (
    <span className={`chip inline-flex items-center gap-1 ${s.cls}`}>
      <FaGhost aria-hidden /> {s.label}
    </span>
  );
}

const STATUS_STYLE: Record<AppStatus, string> = {
  saved: "bg-brand-100 text-brand-700",
  applied: "bg-info/10 text-info",
  responded: "bg-coral-500/15 text-coral-600",
  interview: "bg-amber/15 text-amber",
  offer: "bg-ok/15 text-ok",
  rejected: "bg-zinc-200 text-zinc-500",
};

export function StatusBadge({ status }: { status: AppStatus }) {
  return (
    <span className={`chip capitalize ${STATUS_STYLE[status]}`}>{status}</span>
  );
}

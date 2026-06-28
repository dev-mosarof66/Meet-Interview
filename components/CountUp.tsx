"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  /** Raw display value, e.g. "75%", "~20%", "1,200+". Prefix/suffix are preserved. */
  value: string;
  /** Animation length in ms. */
  durationMs?: number;
  className?: string;
};

// Splits "~20%" -> { prefix: "~", number: "20", suffix: "%" }
function parse(value: string) {
  const m = String(value).match(/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/s);
  if (!m) return null;
  const raw = m[2];
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  return {
    prefix: m[1],
    suffix: m[3],
    target: parseFloat(raw.replace(/,/g, "")),
    decimals,
    hasComma: raw.includes(","),
  };
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animated number that "spins up" from 0 to its target the first time it
 * scrolls into view. Honors prefers-reduced-motion and keeps any
 * surrounding symbols (~, %, +, commas) intact.
 */
export default function CountUp({ value, durationMs = 1500, className }: CountUpProps) {
  const parsed = parse(value);
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(parsed ? 0 : null);

  useEffect(() => {
    if (!parsed) return;
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(parsed.target);
      return;
    }

    let raf = 0;
    let started = false;
    let startTs = 0;

    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / durationMs, 1);
      setDisplay(parsed.target * easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          started = true;
          raf = requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  if (!parsed || display === null) {
    // Non-numeric value — render as-is.
    return <span className={className}>{value}</span>;
  }

  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: parsed.decimals,
    maximumFractionDigits: parsed.decimals,
    useGrouping: parsed.hasComma,
  });

  return (
    <span ref={ref} className={className}>
      {parsed.prefix}
      {formatted}
      {parsed.suffix}
    </span>
  );
}

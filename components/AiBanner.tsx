"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GoDotFill } from "react-icons/go";

export default function AiBanner() {
  const pathname = usePathname();
  const [real, setReal] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setReal(Boolean(d.realAI)))
      .catch(() => setReal(false));
  }, []);

  // Hide the banner on the profile screen (it has its own full-height layout).
  if (pathname === "/profile") return null;

  if (real === null) return null;

  if (real)
    return (
      <div className="bg-ok/10 text-ok">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-1 px-4 py-1.5 text-center text-xs font-semibold">
          <GoDotFill className="animate-pulse" aria-hidden /> Live AI — powered by
          Google Gemini. Tailoring &amp; analysis are real.
        </div>
      </div>
    );

  return (
    <div className="bg-amber/10 text-amber">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-1 px-4 py-1.5 text-center text-xs font-medium">
        <GoDotFill aria-hidden /> Demo mode — using basic rules, not real AI. Add a{" "}
        <span className="font-mono">GEMINI_API_KEY</span> to{" "}
        <span className="font-mono">.env.local</span> and restart to switch on real Gemini tailoring.
      </div>
    </div>
  );
}

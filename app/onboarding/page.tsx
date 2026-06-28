"use client";

import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import {
  FiBriefcase,
  FiSearch,
  FiShuffle,
  FiUsers,
  FiMoreHorizontal,
  FiCheck,
} from "react-icons/fi";
import {
  FaUserGraduate,
  FaLaptopCode,
  FaGoogle,
  FaLinkedin,
  FaXTwitter,
  FaReddit,
  FaYoutube,
  FaRobot,
} from "react-icons/fa6";
import { Logo } from "@/components/Logo";
import { authClient } from "@/lib/auth-client";
import { saveOnboarding } from "@/lib/onboarding";

const SITUATIONS = [
  { v: "student", label: "Student / new grad", Icon: FaUserGraduate },
  { v: "employed", label: "Employed, job-hunting", Icon: FiBriefcase },
  { v: "unemployed", label: "Unemployed, job-hunting", Icon: FiSearch },
  { v: "switcher", label: "Switching careers", Icon: FiShuffle },
  { v: "freelancer", label: "Freelancer / contractor", Icon: FaLaptopCode },
];

const LEVELS = [
  { v: "entry", label: "Entry level" },
  { v: "mid", label: "Mid level" },
  { v: "senior", label: "Senior" },
  { v: "lead", label: "Lead / Exec" },
];

const SOURCES = [
  { v: "google", label: "Google search", Icon: FaGoogle },
  { v: "linkedin", label: "LinkedIn", Icon: FaLinkedin },
  { v: "twitter", label: "Twitter / X", Icon: FaXTwitter },
  { v: "reddit", label: "Reddit", Icon: FaReddit },
  { v: "youtube", label: "YouTube / TikTok", Icon: FaYoutube },
  { v: "friend", label: "Friend / colleague", Icon: FiUsers },
  { v: "ai", label: "ChatGPT / AI", Icon: FaRobot },
  { v: "other", label: "Other", Icon: FiMoreHorizontal },
];

const GOALS = [
  "Get more replies",
  "Tailored resumes",
  "Avoid fake jobs",
  "Track applications",
  "Interview prep",
  "Find my next role faster",
];

const TOTAL = 4;

export default function OnboardingPage() {
  const [scope, setScope] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [situation, setSituation] = useState("");
  const [skills, setSkills] = useState(""); // comma-separated stack
  const [level, setLevel] = useState("");
  const [source, setSource] = useState("");
  const [goals, setGoals] = useState<string[]>([]);

  // Live preview of the parsed skill chips.
  const skillList = skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  useEffect(() => {
    authClient
      .getSession()
      .then(({ data }) => {
        if (data?.user) {
          setScope(data.user.email || data.user.id);
          if (data.user.name) setName(data.user.name);
        }
      })
      .catch(() => {});
  }, []);

  function toggleGoal(g: string) {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }

  const canNext =
    (step === 0 && name.trim() && situation) ||
    (step === 1 && skillList.length > 0 && level) ||
    (step === 2 && source) ||
    step === 3;

  async function finish() {
    if (!scope) return;
    setSaving(true);
    const cleanName = name.trim();
    // Situation, experience level + attribution → onboarding table.
    const answers = {
      situation,
      level,
      source,
      goals,
    };
    // Seed the local profile (name + skills) for an instant paint.
    saveOnboarding(scope, { name: cleanName, skills: skillList, ...answers });
    try {
      // Name goes on the user record; also mark onboarded.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await authClient.updateUser({ name: cleanName, onboarded: true } as any);
      // Experience level + attribution → onboarding table.
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(answers),
      });
      // Skills → profile table. Name is NOT sent — it lives on the user record
      // (set via updateUser above) and is the single source of truth.
      await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skills: skillList }),
      });
    } catch {
      /* ignore — local seed still applied */
    }
    window.location.assign("/pipeline");
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo size={30} withWordmark />
          <span className="text-xs font-semibold text-muted">
            Step {step + 1} of {TOTAL}
          </span>
        </div>

        {/* progress */}
        <div className="mb-8 flex gap-1.5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div
              key={i}
              className={
                "h-1.5 flex-1 rounded-full transition " +
                (i <= step ? "bg-coral-500" : "bg-line")
              }
            />
          ))}
        </div>

        <div className="card p-6 sm:p-8">
          {step === 0 && (
            <Section
              title="First, who are you?"
              sub="This helps us tailor everything to your situation."
            >
              <div>
                <label className="label">Your name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Lee"
                />
              </div>
              <div className="mt-4">
                <label className="label">Which best describes you?</label>
                <OptionGrid
                  options={SITUATIONS}
                  value={situation}
                  onChange={setSituation}
                />
              </div>
            </Section>
          )}

          {step === 1 && (
            <Section
              title="What's your stack & experience?"
              sub="The skills you bring and how senior you are — we use these to tailor every résumé."
            >
              <div>
                <label className="label">Your skills</label>
                <input
                  className="input"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. React, TypeScript, SQL, Figma, Stakeholder management"
                />
                <p className="mt-1.5 text-xs text-muted">
                  Separate each skill with a comma.
                </p>
                {skillList.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {skillList.map((s) => (
                      <span
                        key={s}
                        className="chip bg-brand-100 text-brand-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4">
                <label className="label">Experience level</label>
                <select
                  className="input"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="" disabled>
                    Select your level…
                  </option>
                  {LEVELS.map((l) => (
                    <option key={l.v} value={l.v}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </Section>
          )}

          {step === 2 && (
            <Section
              title="Where did you hear about us?"
              sub="Genuinely helps us know what's working."
            >
              <OptionGrid
                options={SOURCES}
                value={source}
                onChange={setSource}
              />
            </Section>
          )}

          {step === 3 && (
            <Section
              title="What do you want from Meet Interview?"
              sub="Pick any that apply — we'll prioritize these."
            >
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => {
                  const on = goals.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => toggleGoal(g)}
                      className={
                        "chip inline-flex items-center gap-1 border transition " +
                        (on
                          ? "border-coral-500 bg-coral-500/15 text-coral-600"
                          : "border-line text-muted hover:border-brand-300")
                      }
                    >
                      {on && <FiCheck aria-hidden />}
                      {g}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* nav */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className={"btn-outline " + (step === 0 ? "invisible" : "")}
            >
              Back
            </button>
            {step < TOTAL - 1 ? (
              <button
                className="btn-primary"
                disabled={!canNext}
                onClick={() => setStep((s) => s + 1)}
              >
                Continue
              </button>
            ) : (
              <button
                className="btn-coral"
                disabled={saving || !scope}
                onClick={finish}
              >
                {saving ? "Setting up…" : "Finish & start"}
              </button>
            )}
          </div>
        </div>

        {step === 3 && (
          <p className="mt-4 text-center text-xs text-muted">
            You can change any of this later in your profile.
          </p>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 dark:text-white">
        {title}
      </h1>
      <p className="mt-1 text-sm text-muted">{sub}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function OptionGrid({
  options,
  value,
  onChange,
}: {
  options: { v: string; label: string; Icon?: IconType }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={
              "flex items-center gap-2 rounded-lg border p-3 text-left text-sm font-medium transition " +
              (on
                ? "border-brand-500 bg-brand-100 text-brand-700 ring-1 ring-brand-500"
                : "border-line hover:border-brand-300")
            }
          >
            {o.Icon && <o.Icon className="shrink-0 text-lg" aria-hidden />}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import HeroTimeline from "@/components/HeroTimeline";
import { Logo } from "@/components/Logo";
import CountUp from "@/components/CountUp";
import { useAuth } from "@/components/AuthModal";
import {
  FiLock,
  FiTarget,
  FiTrendingUp,
  FiArrowRight,
  FiCheck,
} from "react-icons/fi";
import { FaRocket, FaGhost, FaStar } from "react-icons/fa6";
import { authClient } from "@/lib/auth-client";

export default function LandingPage() {
  const [authed, setAuthed] = useState(false);
  const { open } = useAuth();

  useEffect(() => {
    authClient
      .getSession()
      .then(({ data }) => setAuthed(Boolean(data?.user)))
      .catch(() => {});
  }, []);

  // Primary CTA: open the signup modal, or go to the app if already logged in.
  function cta(
    className: string,
    signupLabel: React.ReactNode,
    appLabel: React.ReactNode,
    mode: "login" | "signup" = "signup"
  ) {
    return authed ? (
      <Link href="/pipeline" className={className}>
        {appLabel}
      </Link>
    ) : (
      <button onClick={() => open(mode)} className={className}>
        {signupLabel}
      </button>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Soft glow behind the hero (texture comes from the body dot-grid) */}
      <div className="glow-top pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]" />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo size={32} withWordmark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!authed && (
              <button
                onClick={() => open("login")}
                className="btn-outline hidden sm:inline-flex"
              >
                Log in
              </button>
            )}
            {cta("btn-primary", "Get started", "Open app")}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:py-20 lg:grid-cols-2">
        {/* Left: pitch */}
        <div className="text-center lg:text-left">
          <span className="chip inline-flex items-center gap-1.5 bg-coral-500/15 text-coral-600">
            <FaRocket aria-hidden /> Built for the 2026 job market
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.5] text-brand-900 dark:text-white sm:text-6xl">
            Stop applying into{" "}
            <span className="text-coral-500">the void.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted lg:mx-0">
            75% of job applications get zero reply. Meet Interview is the AI co-pilot
            that tailors your resume to each job, flags fake postings, and tracks
            which applications actually get answered.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            {cta(
              "btn-primary px-8 py-2 text-base",
              "Start free",
              <>
              Open the app <FiArrowRight aria-hidden className="inline" />
            </>
            )}
            <a href="#how" className="btn-outline px-4 py-2 text-base">
              See how it works
            </a>
          </div>
          <div className="mt-4 text-xs text-muted">
            Free to start · Works without a paid plan · Your data stays yours
          </div>
        </div>

        {/* Right: live "how it works" timeline */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-coral-500/10 blur-2xl dark:bg-coral-500/5" />
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-coral-500" />
            </span>
            Watch it work — live
          </div>
          <HeroTimeline />
        </div>
      </section>

      {/* Problem strip */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 text-center sm:grid-cols-3">
          <Stat big="75%" small="of applications get zero response" />
          <Stat big="~20%" small="of job listings are fake “ghost jobs”" />
          <Stat big="72%" small="say the job hunt hurt their mental health" />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-3xl font-bold text-brand-900 dark:text-white">
          How Meet Interview works
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted">
          Three steps between you and more replies.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Step
            n="1"
            title="Paste a job"
            body="Drop in any job posting. Meet Interview scores how well you fit and warns you if the posting looks fake before you waste time."
          />
          <Step
            n="2"
            title="Tailor — honestly"
            body="AI rewrites your resume and cover letter for that exact role using only your real achievements. Never invents fake numbers."
          />
          <Step
            n="3"
            title="Track replies"
            body="See your real response rate and which sources actually answer — so you double down on what works."
          />
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={<FiLock aria-hidden />}
              title="Truth-Lock tailoring"
              body="Rewrites your resume per job — but strips any metric or claim you didn't actually provide."
            />
            <Feature
              icon={<FaGhost aria-hidden />}
              title="Ghost-job detection"
              body="Flags stale, vague, no-salary, reposted listings so you skip the black holes."
            />
            <Feature
              icon={<FiTarget aria-hidden />}
              title="Fit scoring"
              body="A clear 0–100 match score with the exact keywords you should address."
            />
            <Feature
              icon={<FiTrendingUp aria-hidden />}
              title="Outcome analytics"
              body="Interviews per 100 applications — the metric that actually matters."
            />
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-coral-500">
            Loved by job seekers
          </p>
          <h2 className="mt-2 text-center text-3xl font-bold text-brand-900 dark:text-white">
            More replies, less burnout
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Testimonial
              quote="I went from total silence to three interviews in two weeks. Seeing my real response rate changed how I applied."
              name="Akram Hossain"
              role="Full Stack Developer"
            />
            <Testimonial
              quote="The ghost-job flag alone is worth it. I stopped wasting nights on postings that were never real."
              name="Rifat Sarkar"
              role="Junior Web Developer"
            />
            <Testimonial
              quote="Finally a tool that tailors my resume without inventing fake numbers. It just makes my real wins land harder."
              name="Nazmul Sarkar"
              role="Full Stack Engineer"
            />
          </div>
          <p className="mt-10 text-center text-sm text-muted">
            Join <span className="font-semibold text-ink"><CountUp value="50" />+</span> job
            seekers getting answered.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-3xl font-bold text-brand-900 dark:text-white">
          Simple pricing
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted">
          Start free. Upgrade only when you want unlimited everything.
        </p>
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="card flex flex-col p-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-muted">
              Free
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted">/forever</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2 text-sm">
              <Check>Application tracking + pipeline</Check>
              <Check>5 AI-tailored resumes / month</Check>
              <Check>Match scores + ghost-job checks</Check>
              <Check>Response-rate analytics</Check>
            </ul>
            {cta("btn-outline mt-6", "Get started free", "Open app")}
          </div>

          {/* Pro */}
          <div className="card relative flex flex-col border-brand-500 p-6 ring-1 ring-brand-500">
            <span className="absolute -top-3 left-6 chip bg-coral-500 text-white">
              Most popular
            </span>
            <div className="text-sm font-semibold uppercase tracking-wide text-brand-500">
              Pro
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$12</span>
              <span className="text-muted">/month</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2 text-sm">
              <Check>Everything in Free</Check>
              <Check>Unlimited AI tailoring</Check>
              <Check>Auto follow-up drafts</Check>
              <Check>Advanced ghost-job detection</Check>
              <Check>Priority Gemini models</Check>
            </ul>
            {cta("btn-primary mt-6", "Start free trial", "Open app")}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          Monthly or annual billing — no sneaky 4-week cycles. Cancel anytime.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
          <h2 className="text-center text-3xl font-bold text-brand-900 dark:text-white">
            Frequently asked
          </h2>
          <div className="mt-10 space-y-3">
            {FAQS.map((f) => (
              <FAQItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="card bg-brand-900 p-12 text-white dark:bg-black">
          <h2 className="text-3xl font-bold">Be in the <CountUp value="7" />% who get answered.</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">
            Create a free account and tailor your first application in minutes.
          </p>
          {cta(
            "btn-coral mt-6 inline-flex px-6 py-3 text-base",
            "Get started — it's free",
            <>
              Open the app <FiArrowRight aria-hidden className="inline" />
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-muted sm:flex-row">
          <span>© 2026 Meet Interview · Get answered.</span>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#how" className="hover:text-ink">
              How it works
            </a>
            <a href="#pricing" className="hover:text-ink">
              Pricing
            </a>
            <a href="#faq" className="hover:text-ink">
              FAQ
            </a>
            <button onClick={() => open("login")} className="hover:text-ink">
              Log in
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ big, small }: { big: string; small: string }) {
  return (
    <div>
      <CountUp
        value={big}
        className="block text-4xl font-bold tabular-nums text-brand-500"
      />
      <div className="mt-1 text-sm text-muted">{small}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="card p-6">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">
        {n}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-2xl text-brand-500">{icon}</div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

function Testimonial({
  quote,
  name,
  role,
}: {
  quote: string;
  name: string;
  role: string;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="card flex flex-col p-6">
      <div className="flex gap-0.5 text-coral-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <FaStar key={i} aria-hidden />
        ))}
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink">“{quote}”</p>
      <div className="mt-5 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
          {initials}
        </div>
        <div className="text-sm">
          <div className="font-semibold text-ink">{name}</div>
          <div className="text-muted">{role}</div>
        </div>
      </div>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <FiCheck className="mt-0.5 shrink-0 text-ok" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

const FAQS = [
  {
    q: "Is Meet Interview really free?",
    a: "Yes. The free plan includes application tracking, match scores, ghost-job checks, and 5 AI-tailored resumes a month — no card required. Pro unlocks unlimited tailoring and follow-ups.",
  },
  {
    q: "Does the AI invent fake achievements?",
    a: "Never. Our Truth-Lock system only rephrases facts you actually entered. If a bullet would be stronger with a metric you didn't provide, it asks you to add it — it won't fabricate numbers.",
  },
  {
    q: "Will using it get my LinkedIn or Indeed account banned?",
    a: "No. Meet Interview doesn't mass-spam applications or automate clicks on those sites. You stay in control and apply yourself — we just make each application sharper.",
  },
  {
    q: "What exactly is a “ghost job”?",
    a: "A posting that isn't really being filled — stale, vague, no salary, or endlessly reposted. Around 20% of listings are ghost jobs. Meet Interview flags them so you skip the black holes.",
  },
  {
    q: "Is my data private?",
    a: "Your profile and applications stay yours. Tailoring runs on your own AI key, and we don't sell your data.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left text-sm font-semibold"
      >
        <span>{q}</span>
        <span className="text-brand-500">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="px-4 pb-4 text-sm text-muted">{a}</p>}
    </div>
  );
}

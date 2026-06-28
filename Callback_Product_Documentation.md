# Callback — Product & Build Documentation

> **Tagline:** *Get answered.*
> **One-liner:** Callback is an AI job-search co-pilot that optimizes for **responses, not applications** — honest resume tailoring, ghost-job detection, smart follow-ups, and outcome analytics.

**Version:** 1.0 (MVP build spec) · **Date:** June 2026 · **Owner:** Product / BA

---

## 1. Why this product exists

The job-search tools market is crowded but badly served. Users send hundreds of applications into a black hole — **75% of applications get zero response**, **~53–60% of seekers are ghosted**, and **~20% of listings are "ghost jobs"** that were never real. Existing tools measure the wrong thing: *applications sent* (vanity), not *interviews earned* (outcome). Mass auto-apply bots (e.g. LazyApply, 2.4★) make it worse — spam bans, nonsensical answers, auto-disqualification.

**Callback's thesis:** Win by maximizing **interviews-per-100-applications**, not applications-per-hour. Be the trustworthy, outcome-driven co-pilot.

### Core differentiators (the moat)
1. **Outcome metric** — interviews-per-100-apps, not apps sent.
2. **Truth-lock AI** — never fabricates experience or metrics (competitors do, and users get caught).
3. **Ghost-job detection** — a top-3 pain with no mainstream in-app solution; crowdsourced data compounds.
4. **Safe semi-auto apply** — human-in-the-loop, no account bans.

---

## 2. Brand & naming

### Chosen name: **Callback**
A "callback" is literally the job-search win condition (the recruiter calls back). It is the outcome the entire product optimizes for — the name *is* the value proposition.

**Alternate names (if "Callback" is unavailable on stores):**
| Name | Rationale |
|---|---|
| **Replyn** | "Reply" + brandable suffix; emphasizes the response. |
| **Boomr** | Boomerang — what you send out comes back. Energetic, short. |
| **Echo** | You shout into the void; Echo brings the answer back. |
| **Loop** | "Closing the loop" / breaking the silence. |

### Voice & tone
- **Empathetic, not corporate.** Users are burned out (72% report mental-health impact). Speak like a sharp friend who's got their back.
- **Honest.** Never overpromise. "You got 6 responses from 40 apps — that's 3× the market average" beats hype.
- **Calm + motivating.** Reduce anxiety, celebrate small wins.

---

## 3. Color palette

The palette balances **trust** (deep indigo — credibility, finance-app-grade reliability) with **optimism/energy** (a warm coral signaling "a response arrived"), grounded by **calm neutrals** (the mental-health angle). Coral is reserved for the single most important moment: *a reply / a callback*.

### Brand / primary
| Token | Name | Hex | Usage |
|---|---|---|---|
| `--brand-900` | Indigo Ink | `#1E1B4B` | Headers, dark surfaces, text on light |
| `--brand-700` | Indigo | `#3730A3` | Primary buttons, active states |
| `--brand-500` | Callback Blue | `#4F46E5` | Primary brand color, links, focus |
| `--brand-300` | Periwinkle | `#A5B4FC` | Hover tints, secondary accents |
| `--brand-100` | Mist | `#E0E7FF` | Selected backgrounds, chips |

### Accent — "response / win" (use sparingly)
| Token | Name | Hex | Usage |
|---|---|---|---|
| `--accent-600` | Signal Coral | `#E5484D` | — reserve true red for errors only |
| `--accent-500` | Callback Coral | `#FB7185` | The "you got a response!" moment, celebratory CTAs |
| `--accent-300` | Warm Blush | `#FECDD3` | Success/notification backgrounds |
| `--accent-amber` | Optimism Amber | `#F59E0B` | Match-score "good fit" highlights, streaks |

### Semantic / status
| Token | Name | Hex | Usage |
|---|---|---|---|
| `--success` | Go Green | `#16A34A` | High match score, "applied", confirmations |
| `--warning` | Caution | `#F59E0B` | Ghost-job *suspected*, stale listing |
| `--danger` | Alert Red | `#DC2626` | Ghost-job *confirmed*, errors, account-risk warnings |
| `--info` | Info Blue | `#0EA5E9` | Tips, analytics callouts |

### Neutrals (calm base)
| Token | Hex (Light) | Hex (Dark) | Usage |
|---|---|---|---|
| `--bg` | `#FAFAFB` | `#0F0E1A` | App background |
| `--surface` | `#FFFFFF` | `#1A1830` | Cards, sheets |
| `--border` | `#E4E4E7` | `#2D2A45` | Dividers, input borders |
| `--text-strong` | `#18181B` | `#F4F4F5` | Primary text |
| `--text-muted` | `#71717A` | `#A1A1AA` | Secondary text |

### Match-score gradient (data viz)
Low → high fit: `#DC2626` (poor) → `#F59E0B` (fair) → `#84CC16` (good) → `#16A34A` (excellent).

**Usage rule:** Indigo dominates (≈70% of UI), neutrals carry layout, and **Callback Coral is the exclamation point** — it appears only when something good happens (a response, a strong match, a milestone). This makes wins feel emotionally distinct.

---

## 4. Typography
- **Display / Headings:** `Geist` or `Inter Tight` — modern, confident, high legibility.
- **Body / UI:** `Inter` — neutral, excellent at small sizes.
- **Mono (data, scores):** `Geist Mono` / `JetBrains Mono`.
- **Scale:** 12 / 14 / 16 (base) / 20 / 24 / 32 / 40. Line-height 1.5 body, 1.2 headings.

---

## 5. MVP feature specification (build order)

### F1 — AI Resume & Cover-Letter Tailoring (Truth-Lock)
- Input: user's master profile (facts only) + a job description.
- Output: tailored resume + cover letter rewrites.
- **Truth-Lock rule:** the model may only rephrase/reorganize facts the user entered. It must **refuse to invent metrics, employers, or skills**. Any gap is flagged ("Add a metric here?") rather than fabricated.
- Acceptance: 0 fabricated entities in QA test set; single-column ATS-parseable export (PDF + DOCX).

### F2 — Match Score & Ghost-Job Detector
- **Match score (0–100):** semantic fit between profile and JD (skills, seniority, domain).
- **Ghost-job flags:** reposted >30 days, vague/boilerplate JD, no salary, known ghost-poster patterns, reposting cadence. Output: `Likely Real / Caution / Likely Ghost` with reasons.
- Shown *before* the user invests effort applying.

### F3 — Tracker + Auto Follow-Up
- Chrome extension + mobile clip to log applications (Kanban: Saved → Applied → Responded → Interview → Offer/Reject).
- AI drafts **timed, personalized follow-up** messages (e.g. day 7, day 14) the user approves and sends.

### F4 — Outcome Analytics Dashboard
- Headline metric: **interviews per 100 applications** vs. market benchmark (~4%).
- Breakdowns: response rate by industry, role, resume version, follow-up vs. none.
- Turns the black box into a feedback loop ("fintech roles respond 3× — focus there").

### Phase 2
- **F5 Safe semi-auto apply** — pre-fills + tailors, one-tap human confirm per app (no bans).
- **F6 Ghost-job community signal** — crowdsourced reports + AI pattern detection (data moat).
- **F7 Interview prep** — questions generated from the specific JD + tailored resume.

---

## 6. Screen inventory (MVP)
1. **Onboarding** — import LinkedIn/resume → builds master profile.
2. **Home / Pipeline** — Kanban of applications + headline response rate.
3. **Job detail** — match score, ghost-job verdict, "Tailor for this" CTA.
4. **Tailor studio** — side-by-side resume/cover-letter edit with AI suggestions + Truth-Lock flags.
5. **Follow-up center** — drafted messages awaiting approval.
6. **Analytics** — outcome dashboard.
7. **Profile / master facts** — the single source of truth the AI draws from.
8. **Paywall / upgrade.**

---

## 7. Technical architecture

### Recommended stack
- **Mobile:** React Native (Expo) or Flutter — one codebase, iOS + Android (Google Play primary per original brief).
- **Web + extension:** Next.js + a Chrome (Manifest V3) extension for job clipping/semi-auto apply.
- **Backend:** Node/TypeScript (or Python FastAPI) + PostgreSQL + Redis (queues for follow-up scheduling).
- **Auth:** Clerk/Auth0 or Supabase Auth.
- **Storage:** S3-compatible for resume files.

### AI layer (Anthropic Claude)
Default to the latest, most capable Claude models, tiered by task to control cost:

| Task | Model | Why |
|---|---|---|
| Resume/cover-letter tailoring (Truth-Lock) | **Claude Opus 4.8** (`claude-opus-4-8`) | Highest quality, best instruction-following for the no-fabrication constraint |
| Match scoring, JD parsing, follow-up drafts | **Claude Sonnet 4.6** (`claude-sonnet-4-6`) | Strong quality at lower cost, high volume |
| Ghost-job classification, quick extraction | **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) | Fast + cheap for high-frequency, simpler calls |

- Use **prompt caching** for the user's master profile (reused across every tailoring call) to cut cost/latency.
- Use **structured/tool outputs** for match scores, ghost-job verdicts, and parsed JD fields (validated JSON).
- See `/claude-api` reference for current pricing, params, and migration notes before implementation.

### Truth-Lock implementation (critical)
1. System prompt hard-constrains the model to a provided `verified_facts` object.
2. Post-generation validation: entity-extract the output and assert every company, title, date, and numeric metric exists in `verified_facts`. Reject + regenerate on mismatch.
3. Surface any "fact gap" to the user as an *ask*, never an auto-fill.

---

## 8. Data model (core entities)
- **User** (auth, plan, settings)
- **MasterProfile** (verified_facts: experiences, skills, education, metrics) — single source of truth
- **Job** (source, JD text, company, posted_date, match_score, ghost_verdict + reasons)
- **Application** (job_id, status, resume_version_id, applied_at, response_at)
- **ResumeVersion** (tailored output, linked job, parse_score)
- **FollowUp** (application_id, scheduled_for, draft, status)
- **GhostSignal** (job fingerprint, crowdsourced reports, model_score)

**North-star event:** `application.response_received` → powers the interviews-per-100 metric.

---

## 9. Monetization
- **Free:** tracking + **recurring** 5 AI tailors/mo + match scores. (Beats Teal's one-time credits — best free tier = acquisition engine.)
- **Pro (~$12–15/mo):** unlimited tailoring, ghost-job detection, follow-up automation, analytics.
- **Outcome upsell:** coaching add-on / success-based tier.
- **Billing rule:** monthly or annual only — **no 4-week cycles** (the category's #1 billing complaint).

---

## 10. Success metrics (KPIs)
- **Primary:** median user's interviews-per-100-apps vs. baseline.
- Activation: % who complete master profile + first tailored app in 24h.
- Trust: 0 fabrication incidents reported.
- Retention: W4 retention; free→Pro conversion.
- Ghost-job: detection precision/recall vs. labeled set.

---

## 11. Key risks & mitigations
| Risk | Mitigation |
|---|---|
| LinkedIn/Indeed anti-bot bans | Human-in-the-loop confirm; never headless mass-apply |
| AI hallucination liability | Truth-Lock validation must be technically real, not marketing |
| "Beat the ATS" myth | Recruiters rarely auto-reject (only ~8%); real problem is *volume* (400–2,000+/role). Market "stand out in the human pile," not "beat the robot" |
| Crowded ASO/SEO | Differentiate on *message* (responses, not applications) |

---

## 12. 90-day roadmap (high level)
- **Weeks 1–4:** Master profile + Truth-Lock tailoring (F1), core data model, auth.
- **Weeks 5–8:** Match score + ghost-job detector (F2), tracker + extension (F3).
- **Weeks 9–12:** Analytics dashboard (F4), paywall, beta launch on Google Play + Reddit/TikTok (where the pain is loudest).

---

*Build sources & market evidence: Interview Guys 2025 Ghosting Index, iHire, Enhancv ATS study, Trustpilot/AppSumo (LazyApply), ATS Verification, Teal/Rezi/Jobscan comparisons, GhostJobs.net.*

# Phase 2 — From Resume Tailoring to an Interview Preparation Platform

> **Status:** Future / planning doc. Phase 1 (the MVP) is complete and shipped.
> **Phase 1 recap:** users add a job → AI analyzes fit + flags ghost jobs → Truth-Lock tailors a resume & cover letter (DOCX) → tracked in a pipeline. Gamified: completing the profile 100% grants 3 free jobs.
> **Phase 2 goal:** turn that same user + job context into a **role-aware interview preparation platform** — so after a candidate lands a callback, the product helps them *pass the interview*.

---

## 1. Why this is the natural next phase

The MVP gets users **to the interview**. The biggest unsolved pain *after* that is **preparing for it**. We already hold the two things a great prep tool needs:

- **The candidate** — their real skills, experience, level (the `profile` table).
- **The target** — the specific job they're interviewing for (the `jobs` table + JD).

So we can generate **personalized, role-specific, job-specific** interview prep with almost no new user input. That's the wedge: not generic LeetCode lists, but *"prepare for the Senior Frontend role at Lumen Labs, given your background."*

### The story arc per user
```
Find job → Check it's real → Tailor resume → APPLY → Get callback → PREPARE → Interview → Offer
        └────────────── Phase 1 ──────────────┘   └──────── Phase 2 ────────┘
```

---

## 2. Core concept: role "stacks" (tracks)

A **stack** = a role family with its own interview shape. Each stack defines which **rounds** matter and how they're scored.

| Stack | Typical rounds |
|---|---|
| **Software Engineer** | Coding (DSA), System Design, Behavioral, Take-home review, Domain (frontend/backend/mobile) |
| **Data / ML** | SQL, Python/stats, ML concepts, Case/metrics, Behavioral |
| **Product Manager** | Product sense, Execution/metrics, Estimation, Strategy, Behavioral |
| **Marketing / Growth** | Channel strategy, Metrics & funnel, Campaign case, Portfolio walk-through, Behavioral |
| **Design (UX/Product)** | Portfolio critique, App critique, Whiteboard challenge, Behavioral |
| **Sales / CS** | Discovery roleplay, Objection handling, Mock demo, Behavioral |
| **Generalist / Other** | Behavioral + role-specific Q&A + company research |

Every stack shares a common engine (question generation, mock interview, scoring) but plugs in **stack-specific question types, rubrics, and tooling** (e.g., a code editor for SWE, a metrics canvas for PM/Marketing).

A user picks a stack at onboarding (we already collect `situation` + `targetRole` + `skills` — we can infer/confirm the stack from these).

---

## 3. The full user flow (Phase 2)

### Entry points
1. **From a job in the pipeline** → "Prepare for this interview" button on the job page (uses the JD + profile).
2. **Standalone** → "Practice" tab → pick a stack → generic-but-personalized prep.

### The prep flow
```
1. Choose context
   ├─ From a pipeline job (role, company, JD pre-filled), or
   └─ Pick a stack + seniority manually

2. Generate a prep plan  (AI)
   → role-specific rounds + a ranked list of likely questions
   → "focus areas" derived from JD vs the user's profile gaps

3. Practice a round
   ├─ Flashcard / Q&A drills (read + model answer + your answer)
   ├─ Mock interview (AI interviewer, text or voice, one round at a time)
   │   └─ SWE: live code editor; PM/Marketing: structured-answer canvas
   └─ Timed challenge (coding / case)

4. Get AI feedback  (per answer + per round)
   → score against a rubric, strengths, gaps, a better-answer example
   → "answer was 6/10: strong on X, missing metric on Y"

5. Track progress
   → readiness score per round, streaks, weak-area heatmap
   → "you're 72% ready for this interview"

6. Final mock + report
   → full simulated loop → downloadable readiness report (reuse DOCX/Cloudinary)
```

---

## 4. Feature breakdown

### 4.1 Personalized question bank
- AI generates questions from **(stack + seniority + JD + profile)**, not a static list.
- Each question carries: `type` (coding / behavioral / system-design / case / domain), `difficulty`, `topic`, `rubric`, and an **ideal answer outline** (Truth-Lock style — grounded in the user's real experience for behavioral ones).
- Cache generated questions per (stack, role) to cut cost; personalize the top slice per user.

### 4.2 AI mock interviewer
- Conversational, **one round at a time**, asks a question, waits, follows up like a real interviewer.
- **Text first; voice later** (speech-to-text in, text-to-speech out).
- Maintains context across the round; adapts difficulty to the candidate's answers.

### 4.3 Stack-specific tooling
- **SWE:** in-browser **code editor** (Monaco) + run tests; system-design **canvas** (reuse an Excalidraw-style board).
- **PM / Marketing:** structured **answer canvas** (framework prompts: funnel, metrics, prioritization).
- **Design:** image upload for portfolio/app critique.

### 4.4 AI feedback & scoring
- Per answer: score (0–10) against the question's **rubric**, with strengths + concrete fixes + a model answer.
- **Behavioral → STAR** scoring (Situation/Task/Action/Result completeness).
- Per round + overall **readiness score**.

### 4.5 Progress & gamification (extends Phase 1)
- **Readiness score** per job/round; **weak-area heatmap**; streaks.
- Reuse the credits engine: e.g., **mock-interview credits** (full profile → N free mocks), with practice drills free.

---

## 5. Data model additions (NeonDB / Postgres)

Reuse `user`, `profile`, `jobs`, `credits`. Add:

```sql
-- A role family / interview shape
CREATE TABLE stacks (
  id text PRIMARY KEY,            -- 'swe', 'marketing', ...
  name text,
  rounds jsonb                    -- [{key,label,type,weight}]
);

-- A prep session, optionally tied to a pipeline job
CREATE TABLE prep_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  job_id text,                    -- nullable (standalone practice)
  stack_id text NOT NULL,
  seniority text,
  plan jsonb,                     -- generated rounds + focus areas
  readiness integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Generated/answered questions
CREATE TABLE prep_questions (
  id text PRIMARY KEY,
  session_id text NOT NULL,
  round_key text,
  type text,                      -- coding|behavioral|system-design|case|domain
  topic text,
  difficulty text,
  prompt text,
  rubric jsonb,
  ideal_outline text
);

-- A candidate attempt + AI feedback
CREATE TABLE prep_attempts (
  id text PRIMARY KEY,
  question_id text NOT NULL,
  user_id text NOT NULL,
  answer text,                    -- or code, or canvas JSON
  score integer,
  feedback jsonb,                 -- {strengths[], gaps[], model_answer}
  created_at timestamptz DEFAULT now()
);
```

Follow the existing pattern: each route `CREATE TABLE IF NOT EXISTS` on first use, keyed by `user_id`, with `auth.api.getSession` enforcement.

---

## 6. API surface (Next.js route handlers)

| Route | Purpose |
|---|---|
| `POST /api/prep/plan` | From `{job?, stack, seniority, profile}` → generate rounds + focus areas (Gemini) → create `prep_session` |
| `GET /api/prep/:id` | Load a session + questions + attempts |
| `POST /api/prep/questions` | Generate the next batch of questions for a round |
| `POST /api/prep/answer` | Submit an answer → AI scores against rubric → store attempt, update readiness |
| `POST /api/prep/mock` | Drive a turn of the conversational mock interview |
| `POST /api/prep/report` | Build a readiness report DOCX/PDF → Cloudinary (reuse `lib/docx.ts` + `lib/cloudinary.ts`) |

---

## 7. AI architecture (reuse `lib/ai.ts` patterns)

- **Provider:** same Gemini setup (`gemini-2.5-pro` for plan/feedback, `gemini-2.5-flash` for question gen / quick scoring). Keep the **mock heuristic fallback** so it runs without a key.
- **Structured JSON outputs** for plans, questions, and feedback (same `extractJson` + `responseMimeType: application/json`).
- **Truth-Lock for behavioral answers:** model answers must be grounded in the user's real `profile.experiences` — never fabricate accomplishments (same guard we built for resumes).
- **Prompt inputs:** stack rounds + seniority + JD + profile + (for feedback) the rubric + the candidate's answer.

---

## 8. UI / screens (new)

- **/practice** — choose a stack (cards) or "prep for a pipeline job".
- **/prep/[id]** — session dashboard: rounds, readiness ring, focus areas, "start round".
- **/prep/[id]/round/[key]** — drill / mock interview view (chat + stack tool: code editor or canvas).
- **Job page addition** — a **"Prepare for interview"** CTA next to Tailor (when status ≥ `responded`/`interview`).
- **Pipeline addition** — show a **readiness badge** on jobs you're interviewing for.
- Reuse: theming, skeletons, mobile bottom bar, Toast, credits widgets.

---

## 9. How the existing stack carries over

| Phase 1 asset | Phase 2 reuse |
|---|---|
| better-auth + Neon | same auth + DB, new tables |
| `profile` table | candidate context for personalization + behavioral grounding |
| `jobs` table | the target role/JD a prep session attaches to |
| `credits` / gamification | mock-interview credits; readiness streaks |
| `lib/ai.ts` (Gemini + Truth-Lock + mock fallback) | plan/question/feedback generation |
| `lib/docx.ts` + Cloudinary | readiness report export |
| UI system (theme, skeletons, nav, toast) | all new screens |

---

## 10. Phased rollout

- **2.0 (MVP of prep):** stack picker → AI prep plan + personalized Q&A drills with model answers + per-answer feedback (text only). SWE + one non-tech stack (Marketing).
- **2.1:** conversational mock interview (text), readiness scoring, "prepare from a pipeline job".
- **2.2:** stack tooling — Monaco code editor (SWE), answer canvas (PM/Marketing); readiness report export.
- **2.3:** voice mock interviews (STT/TTS); more stacks (Data, Design, PM, Sales).
- **2.4:** company-specific prep (scrape/ingest known interview patterns), peer/mock scheduling.

---

## 11. Monetization fit

- Free: profile-complete bonus → a few prep sessions + unlimited drills.
- **Pro:** unlimited mock interviews, voice mode, readiness reports, all stacks.
- Natural upsell from Phase 1: *"You tailored your resume and got the interview — now practice for it."*

---

## 12. Open questions / decisions to make later

- Voice stack: which STT/TTS (latency vs cost)?
- Code execution: sandbox provider vs. judge-only (no run)?
- Question caching vs. always-personalized (cost control).
- How aggressively to gate behind credits without hurting activation.

---

*This doc continues the product spec'd in [../Callback_Product_Documentation.md](../Callback_Product_Documentation.md). Phase 1 = "get the interview." Phase 2 = "pass the interview."*

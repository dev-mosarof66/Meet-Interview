import { pool } from "./db";
import {
  PrepAttempt,
  PrepPlan,
  PrepQuestion,
  PrepSession,
  Stack,
} from "./types";

// ---------------------------------------------------------------------------
// Role "stacks" — static config (each defines which rounds matter).
// Phase 2.0 ships one tech + one non-tech stack; more land in later phases.
// ---------------------------------------------------------------------------
export const STACKS: Stack[] = [
  {
    id: "swe",
    name: "Software Engineer",
    tagline: "Coding, system design, and the behavioral round.",
    rounds: [
      { key: "coding", label: "Coding (DSA)", type: "coding", weight: 3 },
      {
        key: "system-design",
        label: "System Design",
        type: "system-design",
        weight: 2,
      },
      { key: "domain", label: "Domain (Frontend/Backend)", type: "domain", weight: 2 },
      { key: "behavioral", label: "Behavioral", type: "behavioral", weight: 1 },
    ],
  },
  {
    id: "marketing",
    name: "Marketing / Growth",
    tagline: "Channel strategy, funnel metrics, and campaign cases.",
    comingSoon: true,
    rounds: [
      { key: "channel", label: "Channel Strategy", type: "case", weight: 2 },
      { key: "metrics", label: "Metrics & Funnel", type: "case", weight: 2 },
      { key: "campaign", label: "Campaign Case", type: "case", weight: 2 },
      { key: "behavioral", label: "Behavioral", type: "behavioral", weight: 1 },
    ],
  },
];

export function getStack(id: string): Stack | undefined {
  return STACKS.find((s) => s.id === id);
}

export function uidPrep(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Tables — created on first use, keyed by user_id (same pattern as jobs/profile)
// ---------------------------------------------------------------------------
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prep_sessions (
      id          text PRIMARY KEY,
      user_id     text NOT NULL,
      job_id      text,
      stack_id    text NOT NULL,
      stack_name  text,
      seniority   text,
      role        text,
      company     text,
      jd_text     text,
      plan        jsonb,
      readiness   integer DEFAULT 0,
      created_at  bigint
    )
  `);
  // For installs created before jd_text existed.
  await pool.query(
    `ALTER TABLE prep_sessions ADD COLUMN IF NOT EXISTS jd_text text`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS prep_sessions_user_idx ON prep_sessions (user_id)`
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prep_questions (
      id            text PRIMARY KEY,
      session_id    text NOT NULL,
      user_id       text NOT NULL,
      round_key     text,
      type          text,
      topic         text,
      difficulty    text,
      prompt        text,
      rubric        jsonb,
      ideal_outline text,
      created_at    bigint
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS prep_questions_session_idx ON prep_questions (session_id)`
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prep_attempts (
      id          text PRIMARY KEY,
      question_id text NOT NULL,
      session_id  text NOT NULL,
      user_id     text NOT NULL,
      answer      text,
      score       integer,
      feedback    jsonb,
      created_at  bigint
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS prep_attempts_session_idx ON prep_attempts (session_id)`
  );
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------
function rowToSession(r: any): PrepSession {
  return {
    id: r.id,
    jobId: r.job_id || undefined,
    stackId: r.stack_id,
    stackName: r.stack_name || "",
    seniority: r.seniority || "",
    role: r.role || "",
    company: r.company || "",
    jdText: r.jd_text || "",
    plan: r.plan || { title: "", summary: "", focusAreas: [], rounds: [] },
    readiness: r.readiness ?? 0,
    createdAt: r.created_at != null ? Number(r.created_at) : 0,
  };
}

function rowToQuestion(r: any): PrepQuestion {
  return {
    id: r.id,
    sessionId: r.session_id,
    roundKey: r.round_key,
    type: r.type,
    topic: r.topic || "",
    difficulty: r.difficulty || "medium",
    prompt: r.prompt || "",
    rubric: Array.isArray(r.rubric) ? r.rubric : [],
    idealOutline: r.ideal_outline || "",
  };
}

function rowToAttempt(r: any): PrepAttempt {
  return {
    id: r.id,
    questionId: r.question_id,
    sessionId: r.session_id,
    answer: r.answer || "",
    score: r.score ?? 0,
    feedback: r.feedback || { strengths: [], gaps: [], modelAnswer: "" },
    createdAt: r.created_at != null ? Number(r.created_at) : 0,
  };
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
export async function createSession(
  userId: string,
  s: {
    jobId?: string;
    stackId: string;
    stackName: string;
    seniority: string;
    role: string;
    company: string;
    jdText: string;
    plan: PrepPlan;
  }
): Promise<PrepSession> {
  await ensureTables();
  const id = uidPrep("ps");
  const createdAt = Date.now();
  await pool.query(
    `INSERT INTO prep_sessions
       (id,user_id,job_id,stack_id,stack_name,seniority,role,company,jd_text,plan,readiness,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11)`,
    [
      id,
      userId,
      s.jobId || null,
      s.stackId,
      s.stackName,
      s.seniority,
      s.role,
      s.company,
      s.jdText || "",
      JSON.stringify(s.plan),
      createdAt,
    ]
  );
  return {
    id,
    jobId: s.jobId,
    stackId: s.stackId,
    stackName: s.stackName,
    seniority: s.seniority,
    role: s.role,
    company: s.company,
    jdText: s.jdText || "",
    plan: s.plan,
    readiness: 0,
    createdAt,
  };
}

export async function listSessions(userId: string): Promise<PrepSession[]> {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT * FROM prep_sessions WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map(rowToSession);
}

export async function getSession(
  id: string,
  userId: string
): Promise<PrepSession | null> {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT * FROM prep_sessions WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] ? rowToSession(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------
export async function getQuestions(
  sessionId: string,
  userId: string
): Promise<PrepQuestion[]> {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT * FROM prep_questions WHERE session_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
    [sessionId, userId]
  );
  return rows.map(rowToQuestion);
}

export async function insertQuestions(
  userId: string,
  sessionId: string,
  roundKey: string,
  items: Omit<PrepQuestion, "id" | "sessionId">[]
): Promise<PrepQuestion[]> {
  await ensureTables();
  const created: PrepQuestion[] = [];
  // Stagger created_at so questions keep a stable display order.
  const base = Date.now();
  for (let i = 0; i < items.length; i++) {
    const q = items[i];
    const id = uidPrep("pq");
    await pool.query(
      `INSERT INTO prep_questions
         (id,session_id,user_id,round_key,type,topic,difficulty,prompt,rubric,ideal_outline,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        sessionId,
        userId,
        roundKey,
        q.type,
        q.topic,
        q.difficulty,
        q.prompt,
        JSON.stringify(q.rubric || []),
        q.idealOutline,
        base + i,
      ]
    );
    created.push({ ...q, id, sessionId });
  }
  return created;
}

// ---------------------------------------------------------------------------
// Attempts + readiness
// ---------------------------------------------------------------------------
export async function getAttempts(
  sessionId: string,
  userId: string
): Promise<PrepAttempt[]> {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT * FROM prep_attempts WHERE session_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
    [sessionId, userId]
  );
  return rows.map(rowToAttempt);
}

export async function insertAttempt(
  userId: string,
  a: {
    questionId: string;
    sessionId: string;
    answer: string;
    score: number;
    feedback: PrepAttempt["feedback"];
  }
): Promise<PrepAttempt> {
  await ensureTables();
  const id = uidPrep("pa");
  const createdAt = Date.now();
  await pool.query(
    `INSERT INTO prep_attempts
       (id,question_id,session_id,user_id,answer,score,feedback,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      id,
      a.questionId,
      a.sessionId,
      userId,
      a.answer,
      a.score,
      JSON.stringify(a.feedback),
      createdAt,
    ]
  );
  return {
    id,
    questionId: a.questionId,
    sessionId: a.sessionId,
    answer: a.answer,
    score: a.score,
    feedback: a.feedback,
    createdAt,
  };
}

/**
 * Readiness = weighted average across rounds. Each round score is the mean of
 * the candidate's BEST attempt per answered question (0-10), scaled to 0-100,
 * then weighted by the round's importance. Unanswered rounds count as 0.
 */
export async function recomputeReadiness(
  session: PrepSession,
  userId: string
): Promise<number> {
  const [questions, attempts] = await Promise.all([
    getQuestions(session.id, userId),
    getAttempts(session.id, userId),
  ]);

  // Best score per question.
  const bestByQ = new Map<string, number>();
  for (const at of attempts) {
    bestByQ.set(at.questionId, Math.max(bestByQ.get(at.questionId) ?? 0, at.score));
  }

  const rounds = session.plan.rounds.length
    ? session.plan.rounds
    : getStack(session.stackId)?.rounds.map((r) => ({ ...r, focus: [] })) || [];

  let weightedSum = 0;
  let weightTotal = 0;
  for (const round of rounds) {
    const qs = questions.filter((q) => q.roundKey === round.key);
    weightTotal += round.weight;
    if (!qs.length) continue; // no questions yet → contributes 0
    const answered = qs.filter((q) => bestByQ.has(q.id));
    if (!answered.length) continue;
    const mean =
      answered.reduce((sum, q) => sum + (bestByQ.get(q.id) ?? 0), 0) /
      answered.length;
    // Reward both quality (mean) and coverage (answered/total) within the round.
    const coverage = answered.length / qs.length;
    weightedSum += round.weight * (mean * 10) * coverage;
  }

  const readiness = weightTotal ? Math.round(weightedSum / weightTotal) : 0;
  await pool.query(
    `UPDATE prep_sessions SET readiness = $3 WHERE id = $1 AND user_id = $2`,
    [session.id, userId, readiness]
  );
  return readiness;
}

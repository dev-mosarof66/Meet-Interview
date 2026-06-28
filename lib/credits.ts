import { pool } from "./db";

export type Credits = { jobs: number; claimed: boolean };
export type Completeness = {
  percent: number;
  complete: boolean;
  missing: string[];
};

export const PROFILE_BONUS = 3; // free job slots granted at 100% profile

async function ensureCreditsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credits (
      user_id               text PRIMARY KEY,
      job_credits           integer DEFAULT 0,
      profile_bonus_claimed boolean DEFAULT false,
      updated_at            timestamptz DEFAULT now()
    )
  `);
  // For older installs that predate job_credits.
  await pool.query(
    `ALTER TABLE credits ADD COLUMN IF NOT EXISTS job_credits integer DEFAULT 0`
  );
}

export async function getCredits(userId: string): Promise<Credits> {
  await ensureCreditsTable();
  const { rows } = await pool.query(
    `SELECT job_credits, profile_bonus_claimed FROM credits WHERE user_id = $1`,
    [userId]
  );
  if (!rows[0]) {
    await pool.query(
      `INSERT INTO credits (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
    return { jobs: 0, claimed: false };
  }
  return { jobs: rows[0].job_credits, claimed: rows[0].profile_bonus_claimed };
}

const FIELDS: { key: string; label: string }[] = [
  { key: "location", label: "Location" },
  { key: "summary", label: "Summary" },
  { key: "skills", label: "Skills" },
  { key: "experiences", label: "Experience" },
  { key: "education", label: "Education" },
];

export async function profileCompleteness(
  userId: string
): Promise<Completeness> {
  let p: any = {};
  try {
    const { rows } = await pool.query(
      `SELECT location, summary, skills, education, experiences
         FROM profile WHERE user_id = $1`,
      [userId]
    );
    p = rows[0] || {};
  } catch {
    p = {};
  }
  const ok = (k: string) => {
    const v = p[k];
    if (Array.isArray(v)) return v.length > 0;
    return Boolean(v && String(v).trim());
  };
  const missing = FIELDS.filter((f) => !ok(f.key)).map((f) => f.label);
  const done = FIELDS.length - missing.length;
  return {
    percent: Math.round((done / FIELDS.length) * 100),
    complete: missing.length === 0,
    missing,
  };
}

/** Grants the one-time free job slots when the profile reaches 100%. */
export async function maybeGrantBonus(
  userId: string
): Promise<{ granted: boolean }> {
  const credits = await getCredits(userId);
  if (credits.claimed) return { granted: false };
  const comp = await profileCompleteness(userId);
  if (!comp.complete) return { granted: false };
  const { rows } = await pool.query(
    `UPDATE credits
       SET job_credits = job_credits + $2,
           profile_bonus_claimed = true,
           updated_at = now()
     WHERE user_id = $1 AND profile_bonus_claimed = false
     RETURNING job_credits`,
    [userId, PROFILE_BONUS]
  );
  return { granted: rows.length > 0 };
}

/** Consumes one job slot (called when a NEW job is added). */
export async function consumeJobCredit(
  userId: string
): Promise<Credits | null> {
  await ensureCreditsTable();
  const { rows } = await pool.query(
    `UPDATE credits SET job_credits = job_credits - 1, updated_at = now()
     WHERE user_id = $1 AND job_credits > 0
     RETURNING job_credits, profile_bonus_claimed`,
    [userId]
  );
  if (!rows[0]) return null;
  return { jobs: rows[0].job_credits, claimed: rows[0].profile_bonus_claimed };
}

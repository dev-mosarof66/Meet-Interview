import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile (
      user_id     text PRIMARY KEY,
      full_name   text,
      title       text,
      location    text,
      summary     text,
      photo       text,
      skills      jsonb,
      education   jsonb,
      experiences jsonb,
      updated_at  timestamptz DEFAULT now()
    )
  `);
  // Migrate a legacy `education text` column to jsonb (one entry per value).
  await pool.query(`
    DO $$
    BEGIN
      IF (
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'profile' AND column_name = 'education'
      ) = 'text' THEN
        ALTER TABLE profile ALTER COLUMN education TYPE jsonb USING (
          CASE
            WHEN education IS NULL OR btrim(education) = '' THEN '[]'::jsonb
            ELSE jsonb_build_array(jsonb_build_object(
              'id', 'legacy', 'school', education, 'degree', '', 'year', ''
            ))
          END
        );
      END IF;
    END $$;
  `);
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ profile: null });
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT full_name, title, location, summary, photo, skills, education, experiences
         FROM profile WHERE user_id = $1`,
      [session.user.id]
    );
    return NextResponse.json({ profile: rows[0] || null });
  } catch (e: any) {
    return NextResponse.json(
      { profile: null, error: e?.message || "failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const b = await req.json().catch(() => ({}));
  // Partial upsert: only keys present in the body are written. Absent keys are
  // passed as NULL and preserved via COALESCE, so a caller can update just
  // `skills` (e.g. onboarding) without wiping the rest of the profile.
  const str = (k: string) => (k in b ? String(b[k] ?? "") : null);
  const json = (k: string) => (k in b ? JSON.stringify(b[k] ?? []) : null);
  try {
    await ensureTable();
    await pool.query(
      `INSERT INTO profile
         (user_id, full_name, title, location, summary, photo, skills, education, experiences, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
       ON CONFLICT (user_id) DO UPDATE SET
         full_name   = COALESCE(EXCLUDED.full_name, profile.full_name),
         title       = COALESCE(EXCLUDED.title, profile.title),
         location    = COALESCE(EXCLUDED.location, profile.location),
         summary     = COALESCE(EXCLUDED.summary, profile.summary),
         photo       = COALESCE(EXCLUDED.photo, profile.photo),
         skills      = COALESCE(EXCLUDED.skills, profile.skills),
         education   = COALESCE(EXCLUDED.education, profile.education),
         experiences = COALESCE(EXCLUDED.experiences, profile.experiences),
         updated_at  = now()`,
      [
        session.user.id,
        str("fullName"),
        str("title"),
        str("location"),
        str("summary"),
        str("photo"),
        json("skills"),
        json("education"),
        json("experiences"),
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed to save profile" },
      { status: 500 }
    );
  }
}

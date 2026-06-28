import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

// Note: the user's name lives on the better-auth `user` table, not here.
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS onboarding (
      user_id     text PRIMARY KEY,
      situation   text,
      target_role text,
      industry    text,
      level       text,
      source      text,
      goals       jsonb,
      created_at  timestamptz DEFAULT now(),
      updated_at  timestamptz DEFAULT now()
    )
  `);
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ onboarding: null }, { status: 200 });
  }
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT situation, target_role, industry, level, source, goals
         FROM onboarding WHERE user_id = $1`,
      [session.user.id]
    );
    return NextResponse.json({ onboarding: rows[0] || null });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed", onboarding: null },
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
  try {
    await ensureTable();
    await pool.query(
      `INSERT INTO onboarding
         (user_id, situation, target_role, industry, level, source, goals, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now())
       ON CONFLICT (user_id) DO UPDATE SET
         situation=$2, target_role=$3, industry=$4,
         level=$5, source=$6, goals=$7, updated_at=now()`,
      [
        session.user.id,
        b.situation || "",
        b.targetRole || "",
        b.industry || "",
        b.level || "",
        b.source || "",
        JSON.stringify(b.goals || []),
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed to save onboarding" },
      { status: 500 }
    );
  }
}

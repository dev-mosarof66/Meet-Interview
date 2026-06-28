import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getCredits, maybeGrantBonus, consumeJobCredit } from "@/lib/credits";

export const runtime = "nodejs";

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id              text PRIMARY KEY,
      user_id         text NOT NULL,
      company         text,
      title           text,
      location        text,
      source          text,
      jd_text         text,
      posted_days_ago integer,
      has_salary      boolean,
      status          text,
      applied_at      bigint,
      response_at     bigint,
      created_at      bigint,
      analysis        jsonb,
      tailored        jsonb,
      updated_at      timestamptz DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS jobs_user_idx ON jobs (user_id)`);
}

function rowToJob(r: any) {
  return {
    id: r.id,
    company: r.company,
    title: r.title,
    location: r.location,
    source: r.source,
    jdText: r.jd_text,
    postedDaysAgo: r.posted_days_ago,
    hasSalary: r.has_salary,
    status: r.status,
    appliedAt: r.applied_at != null ? Number(r.applied_at) : undefined,
    responseAt: r.response_at != null ? Number(r.response_at) : undefined,
    createdAt: r.created_at != null ? Number(r.created_at) : 0,
    analysis: r.analysis || undefined,
    tailored: r.tailored || undefined,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ jobs: [] });
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT * FROM jobs WHERE user_id = $1 ORDER BY created_at DESC`,
      [session.user.id]
    );
    return NextResponse.json({ jobs: rows.map(rowToJob) });
  } catch (e: any) {
    return NextResponse.json({ jobs: [], error: e?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const b = await req.json().catch(() => ({}));
  if (!b?.id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  try {
    await ensureTable();

    // A NEW job consumes one free job slot; updates (analyze/tailor saves) don't.
    const existing = await pool.query(
      `SELECT 1 FROM jobs WHERE id = $1 AND user_id = $2`,
      [b.id, session.user.id]
    );
    const isNew = existing.rowCount === 0;
    if (isNew) {
      await maybeGrantBonus(session.user.id);
      const c = await getCredits(session.user.id);
      if (c.jobs <= 0) {
        return NextResponse.json(
          { error: "no-credits", credits: c },
          { status: 402 }
        );
      }
    }

    await pool.query(
      `INSERT INTO jobs
         (id,user_id,company,title,location,source,jd_text,posted_days_ago,has_salary,
          status,applied_at,response_at,created_at,analysis,tailored,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now())
       ON CONFLICT (id) DO UPDATE SET
         company=$3,title=$4,location=$5,source=$6,jd_text=$7,posted_days_ago=$8,
         has_salary=$9,status=$10,applied_at=$11,response_at=$12,created_at=$13,
         analysis=$14,tailored=$15,updated_at=now()
       WHERE jobs.user_id = $2`,
      [
        b.id,
        session.user.id,
        b.company || "",
        b.title || "",
        b.location || "",
        b.source || "",
        b.jdText || "",
        Number(b.postedDaysAgo) || 0,
        Boolean(b.hasSalary),
        b.status || "saved",
        b.appliedAt ?? null,
        b.responseAt ?? null,
        b.createdAt ?? Date.now(),
        b.analysis ? JSON.stringify(b.analysis) : null,
        b.tailored ? JSON.stringify(b.tailored) : null,
      ]
    );

    if (isNew) {
      const credits = await consumeJobCredit(session.user.id);
      return NextResponse.json({ ok: true, credits });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed to save job" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  try {
    await ensureTable();
    await pool.query(`DELETE FROM jobs WHERE id = $1 AND user_id = $2`, [
      id,
      session.user.id,
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

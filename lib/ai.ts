import {
  Analysis,
  Job,
  MasterProfile,
  ResumeDoc,
  GhostVerdict,
  Education,
  Stack,
  StackRound,
  PrepPlan,
  PrepQuestion,
  PrepFeedback,
  Difficulty,
  InterviewTurn,
} from "./types";

// Model tiers (overridable via env). Provider: Google Gemini.
const MODEL_TAILOR = process.env.CALLBACK_MODEL_TAILOR || "gemini-2.5-pro";
const MODEL_ANALYZE = process.env.CALLBACK_MODEL_ANALYZE || "gemini-2.5-flash";

function geminiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

function uidEdu(): string {
  return "ed" + Math.random().toString(36).slice(2, 7);
}

/** Flatten the structured education list into a single résumé/corpus line. */
function educationText(edu: Education[]): string {
  return (edu || [])
    .map((e) => [e.degree, e.school, e.year].filter(Boolean).join(", "))
    .filter(Boolean)
    .join(" · ");
}

/** Coerce whatever the model/heuristic returns for education into entries. */
function toEducationList(value: unknown): Education[] {
  if (Array.isArray(value)) {
    return value
      .map((e: any) => {
        if (typeof e === "string") {
          return { id: uidEdu(), school: e.trim(), degree: "", year: "" };
        }
        return {
          id: uidEdu(),
          school: String(e?.school || e?.institution || "").trim(),
          degree: String(e?.degree || e?.qualification || "").trim(),
          year: String(e?.year || e?.dates || "").trim(),
        };
      })
      .filter((e) => e.school || e.degree);
  }
  const s = String(value || "").trim();
  return s ? [{ id: uidEdu(), school: s, degree: "", year: "" }] : [];
}

const VAGUE_PHRASES = [
  "rockstar",
  "ninja",
  "wear many hats",
  "hit the ground running",
  "fast-paced",
  "self-starter",
  "thrives in ambiguity",
  "always looking",
  "growing team",
  "competitive salary",
  "many hats",
  "wizard",
  "guru",
];

const STOPWORDS = new Set([
  "the","and","for","with","you","our","are","will","have","has","this","that",
  "your","from","who","all","can","must","plus","join","team","work","role",
  "experience","years","strong","ability","including","etc","new","help","using",
]);

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function profileCorpus(p: MasterProfile): string {
  return [
    p.summary,
    p.skills.join(" "),
    ...p.experiences.flatMap((e) => [e.company, e.role, ...e.bullets]),
    ...(p.projects || []).flatMap((pr) => [pr.name, pr.tech, pr.description]),
    educationText(p.education),
  ]
    .join(" ")
    .toLowerCase();
}

function keywords(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.toLowerCase().match(/[a-z][a-z+]{2,}/g) || []) {
    if (STOPWORDS.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
  }
  return out;
}

function numbersIn(text: string): string[] {
  return (text.match(/\d+(?:[.,]\d+)?%?/g) || []).map((s) => s.replace(/,/g, ""));
}

// ---------------------------------------------------------------------------
// MOCK engine (used when no ANTHROPIC_API_KEY) — always runnable
// ---------------------------------------------------------------------------
function analyzeMock(job: Job, profile: MasterProfile): Analysis {
  const corpus = profileCorpus(profile);
  const jdWords = keywords(job.jdText);

  const matchedSkills = profile.skills.filter((s) =>
    job.jdText.toLowerCase().includes(s.toLowerCase().split(" ")[0])
  );
  const overlap = jdWords.filter((w) => corpus.includes(w));

  const titleHit = job.title
    .toLowerCase()
    .split(/\s+/)
    .some((w) => w.length > 3 && profile.title.toLowerCase().includes(w));

  let score =
    Math.min(60, overlap.length * 4) +
    Math.min(25, matchedSkills.length * 6) +
    (titleHit ? 15 : 0);
  score = Math.max(8, Math.min(99, score));

  const gaps = jdWords
    .filter((w) => !corpus.includes(w))
    .filter((w) =>
      [
        "saas","b2b","analytics","lifecycle","enablement","positioning",
        "demand","conversion","hubspot","sql","figma","launch","launches",
        "messaging","growth","generation",
      ].includes(w)
    )
    .slice(0, 5);

  // Ghost-job heuristics
  const vagueHits = VAGUE_PHRASES.filter((p) =>
    job.jdText.toLowerCase().includes(p)
  );
  const reasons: string[] = [];
  let risk = 0;
  if (job.postedDaysAgo > 45) {
    risk += 2;
    reasons.push(`Posted ${job.postedDaysAgo} days ago and still open (stale).`);
  } else if (job.postedDaysAgo > 30) {
    risk += 1;
    reasons.push(`Posted ${job.postedDaysAgo} days ago.`);
  }
  if (!job.hasSalary) {
    risk += 1;
    reasons.push("No salary range disclosed.");
  }
  if (vagueHits.length >= 2) {
    risk += 2;
    reasons.push(`Vague, boilerplate language ("${vagueHits.slice(0, 3).join('", "')}").`);
  } else if (vagueHits.length === 1) {
    risk += 1;
    reasons.push(`Some boilerplate language ("${vagueHits[0]}").`);
  }
  if (job.jdText.length < 220) {
    risk += 1;
    reasons.push("Unusually short job description.");
  }
  if (reasons.length === 0) reasons.push("Specific responsibilities and a salary range — looks legitimate.");

  const ghostVerdict: GhostVerdict = risk >= 4 ? "ghost" : risk >= 2 ? "caution" : "real";

  const matchReasons: string[] = [];
  if (matchedSkills.length)
    matchReasons.push(`${matchedSkills.length} of your skills appear in the JD: ${matchedSkills.slice(0, 4).join(", ")}.`);
  if (titleHit) matchReasons.push("Your current title closely matches the role.");
  if (gaps.length) matchReasons.push(`Missing/weak keywords to address: ${gaps.join(", ")}.`);
  if (matchReasons.length === 0) matchReasons.push("Limited overlap between your profile and this JD.");

  return { matchScore: score, matchReasons, gaps, ghostVerdict, ghostReasons: reasons };
}

function scrubNumbers(
  text: string,
  allowed: Set<string>,
  flagged: string[],
  where: string
): string {
  return text
    .replace(/\d+(?:[.,]\d+)?%?/g, (m) => {
      const norm = m.replace(/,/g, "");
      const plain = norm.replace("%", "");
      if (allowed.has(norm) || /^(19|20)\d\d$/.test(norm) || Number(plain) <= 4)
        return m;
      flagged.push(`Removed unverified "${m}" in ${where}`);
      return "";
    })
    .replace(/\s+([.,])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildResumeProjects(
  profile: MasterProfile,
  allowed: Set<string>,
  flagged: string[]
) {
  return (profile.projects || [])
    .filter((p) => (p.name || "").trim())
    .map((p) => ({
      name: p.name,
      tech: p.tech || "",
      link: p.link || "",
      description: scrubNumbers(p.description || "", allowed, flagged, "project"),
    }));
}

function resumeFactGaps(profile: MasterProfile): string[] {
  const gaps: string[] = [];
  profile.experiences.forEach((e) =>
    e.bullets.forEach((b) => {
      if (numbersIn(b).length === 0)
        gaps.push(`Add a real metric to "${b.slice(0, 50)}…" (${e.company}).`);
    })
  );
  return gaps;
}

function buildResumeStruct(
  job: Job,
  profile: MasterProfile,
  email: string
): ResumeDoc {
  const jd = job.jdText.toLowerCase();
  const allowed = new Set(numbersIn(profileCorpus(profile)));
  const flagged: string[] = [];
  const rel = (sk: string) =>
    jd.includes(sk.toLowerCase().split(" ")[0]) ? 1 : 0;
  const skills = [...profile.skills].sort((a, b) => rel(b) - rel(a));
  const summary = scrubNumbers(
    `${profile.title}${
      skills.length ? ` focused on ${skills.slice(0, 3).join(", ")}` : ""
    }. ${profile.summary}`.trim(),
    allowed,
    flagged,
    "summary"
  );
  const experiences = profile.experiences.map((e) => ({
    role: e.role,
    company: e.company,
    dates: [e.startDate, e.endDate].filter(Boolean).join(" – "),
    bullets: [...e.bullets]
      .sort(
        (a, b) =>
          keywords(b).filter((w) => jd.includes(w)).length -
          keywords(a).filter((w) => jd.includes(w)).length
      )
      .map((b) => scrubNumbers(b, allowed, flagged, `${e.company} bullet`)),
  }));
  return {
    name: profile.fullName,
    email: email || profile.email,
    phone: profile.phone,
    location: profile.location,
    title: profile.title,
    summary,
    skills: profile.skills,
    experiences,
    education: educationText(profile.education),
    projects: buildResumeProjects(profile, allowed, flagged),
    flagged: Array.from(new Set(flagged)),
    factGaps: resumeFactGaps(profile),
  };
}

function buildCoverText(job: Job, profile: MasterProfile): string {
  const jd = job.jdText.toLowerCase();
  const rel = profile.skills.filter((s) =>
    jd.includes(s.toLowerCase().split(" ")[0])
  );
  return (
    `Dear ${job.company} Hiring Team,\n\n` +
    `I'm excited to apply for the ${job.title} role. As ${
      profile.title || "a candidate"
    }, I focus on ${
      rel.slice(0, 3).join(", ") || "delivering results"
    } — areas central to this position.\n\n` +
    `${
      profile.experiences[0]?.bullets[0] ||
      "I've consistently delivered measurable impact in my roles."
    } I'd bring the same to ${job.company}.\n\n` +
    `I'd welcome the chance to discuss how I can contribute.\n\n` +
    `Best regards,\n${profile.fullName}`
  );
}

// ---------------------------------------------------------------------------
// Claude-backed implementations
// ---------------------------------------------------------------------------
async function callGemini(model: string, system: string, user: string): Promise<string> {
  const key = geminiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  return Array.isArray(parts) ? parts.map((p: any) => p.text || "").join("") || "{}" : "{}";
}

function isRateLimit(e: unknown): boolean {
  return /\b429\b|RESOURCE_EXHAUSTED|quota/i.test(
    String((e as { message?: string })?.message || "")
  );
}

// Free-tier daily quotas are PER MODEL, so prep features try an ordered list of
// models and fall through to the next model's separate daily bucket whenever one
// is rate-limited (429). Override the order/models via CALLBACK_MODEL_PREP.
const PREP_MODELS = (
  process.env.CALLBACK_MODEL_PREP ||
  "gemini-2.5-flash-lite,gemini-2.5-flash,gemini-2.0-flash"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function callGeminiPrep(system: string, user: string): Promise<string> {
  let lastErr: unknown;
  for (const model of PREP_MODELS) {
    try {
      return await callGemini(model, system, user);
    } catch (e) {
      lastErr = e;
      // Only fall through on rate-limit/quota; a real error shouldn't burn
      // the other models' buckets.
      if (!isRateLimit(e)) throw e;
    }
  }
  throw lastErr;
}

function extractJson(s: string): any {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) return {};
  return JSON.parse(s.slice(start, end + 1));
}

export async function analyze(job: Job, profile: MasterProfile): Promise<Analysis> {
  if (!geminiKey()) return analyzeMock(job, profile);
  try {
    const system =
      "You are a job-fit and ghost-job analyst. Return ONLY JSON with keys: " +
      "matchScore (0-100 integer), matchReasons (string[]), gaps (string[] of missing keywords), " +
      "ghostVerdict ('real'|'caution'|'ghost'), ghostReasons (string[]). " +
      "Ghost-job signals: stale posting age, vague/boilerplate language, no salary, generic reposts.";
    const user = `CANDIDATE PROFILE:\n${JSON.stringify(profile)}\n\nJOB (posted ${job.postedDaysAgo} days ago, salary disclosed: ${job.hasSalary}):\n${job.title} at ${job.company}\n${job.jdText}`;
    const raw = await callGemini(MODEL_ANALYZE, system, user);
    const j = extractJson(raw);
    return {
      matchScore: Math.max(0, Math.min(100, Number(j.matchScore) || 0)),
      matchReasons: j.matchReasons || [],
      gaps: j.gaps || [],
      ghostVerdict: (j.ghostVerdict as GhostVerdict) || "caution",
      ghostReasons: j.ghostReasons || [],
    };
  } catch {
    return analyzeMock(job, profile);
  }
}

export async function tailorResume(
  job: Job,
  profile: MasterProfile,
  email = ""
): Promise<ResumeDoc> {
  if (!geminiKey()) return buildResumeStruct(job, profile, email);
  try {
    const system =
      "You are an ATS resume writer with a strict Truth-Lock rule. Tailor the resume to the job. " +
      "Return ONLY JSON: {summary, skills (string[]), experiences (array of {role, company, dates, bullets: string[]}), education}. " +
      "Use ONLY facts from the candidate profile — reorder and emphasize for the job. " +
      "NEVER invent companies, titles, dates, metrics, or numbers.";
    const user = `CANDIDATE PROFILE (only source of truth):\n${JSON.stringify(
      profile
    )}\n\nTARGET JOB:\n${job.title} at ${job.company}\n${job.jdText}`;
    const raw = await callGemini(MODEL_TAILOR, system, user);
    const j = extractJson(raw);
    const allowed = new Set(numbersIn(profileCorpus(profile)));
    const flagged: string[] = [];
    const summary = scrubNumbers(
      j.summary || profile.summary,
      allowed,
      flagged,
      "summary"
    );
    const expSource =
      j.experiences && j.experiences.length
        ? j.experiences
        : profile.experiences.map((e) => ({
            role: e.role,
            company: e.company,
            dates: [e.startDate, e.endDate].filter(Boolean).join(" – "),
            bullets: e.bullets,
          }));
    const experiences = expSource.map((e: any) => ({
      role: e.role || "",
      company: e.company || "",
      dates: e.dates || "",
      bullets: (e.bullets || []).map((b: string) =>
        scrubNumbers(b, allowed, flagged, `${e.company || ""} bullet`)
      ),
    }));
    return {
      name: profile.fullName,
      email: email || profile.email,
      phone: profile.phone,
      location: profile.location,
      title: j.title || profile.title,
      summary,
      skills: j.skills && j.skills.length ? j.skills : profile.skills,
      experiences,
      education: j.education || educationText(profile.education),
      projects: buildResumeProjects(profile, allowed, flagged),
      flagged: Array.from(new Set(flagged)),
      factGaps: resumeFactGaps(profile),
    };
  } catch {
    return buildResumeStruct(job, profile, email);
  }
}

export async function tailorCover(
  job: Job,
  profile: MasterProfile
): Promise<string> {
  if (!geminiKey()) return buildCoverText(job, profile);
  try {
    const system =
      "Write a concise, professional, ATS-friendly cover letter (3-4 short paragraphs) tailored to the job, " +
      "using ONLY facts from the candidate profile. Never invent metrics or employers. " +
      "Return ONLY JSON: {coverLetter: string}.";
    const user = `CANDIDATE PROFILE:\n${JSON.stringify(profile)}\n\nTARGET JOB:\n${
      job.title
    } at ${job.company}\n${job.jdText}`;
    const raw = await callGemini(MODEL_TAILOR, system, user);
    const j = extractJson(raw);
    return j.coverLetter || buildCoverText(job, profile);
  } catch {
    return buildCoverText(job, profile);
  }
}

export function usingRealAI(): boolean {
  return Boolean(geminiKey());
}

// ---------------------------------------------------------------------------
// Resume import — turn pasted resume text into a structured MasterProfile
// ---------------------------------------------------------------------------
function parseResumeMock(text: string): MasterProfile {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const email = (text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [""])[0];
  const phone = (text.match(/(\+?\d[\d\s().-]{7,}\d)/) || [""])[0];
  const fullName = lines[0] || "Your Name";
  const title = lines[1] && lines[1].length < 60 ? lines[1] : "";

  // crude skills extraction: a line that starts with "skills"
  const skillsLine =
    lines.find((l) => /^skills[:\s]/i.test(l)) ||
    lines.find((l) => l.includes(",") && l.split(",").length >= 4) ||
    "";
  const skills = skillsLine
    .replace(/^skills[:\s]*/i, "")
    .split(/[,•|]/)
    .map((s) => s.trim())
    .filter((s) => s && s.length < 40)
    .slice(0, 14);

  return {
    fullName,
    title,
    email,
    phone,
    location: "",
    summary: lines.slice(0, 6).join(" ").slice(0, 280),
    skills,
    experiences: [
      {
        id: "e" + Math.random().toString(36).slice(2, 7),
        company: "",
        role: title,
        startDate: "",
        endDate: "Present",
        bullets: lines.filter((l) => /^[-•*]/.test(l)).map((l) => l.replace(/^[-•*]\s*/, "")).slice(0, 6),
      },
    ],
    education: toEducationList(
      lines.filter((l) =>
        /(b\.?s\.?|b\.?a\.?|bachelor|master|m\.?s\.?|ph\.?d|university|college|degree)/i.test(l)
      )
    ),
    projects: [],
  };
}

export async function parseResume(text: string): Promise<MasterProfile> {
  if (!geminiKey()) return parseResumeMock(text);
  try {
    const system =
      "Extract a structured candidate profile from the resume text. Return ONLY JSON with keys: " +
      "fullName, title, email, phone, location, summary, skills (string[]), " +
      "experiences (array of {company, role, startDate, endDate, bullets: string[]}), " +
      "education (array of {school, degree, year}), " +
      "projects (array of {name, description, tech, link}). " +
      "Copy facts verbatim — do not invent or embellish anything.";
    const raw = await callGemini(MODEL_ANALYZE, system, text);
    const j = extractJson(raw);
    return {
      fullName: j.fullName || "Your Name",
      title: j.title || "",
      email: j.email || "",
      phone: j.phone || "",
      location: j.location || "",
      summary: j.summary || "",
      skills: j.skills || [],
      experiences: (j.experiences || []).map((e: any, i: number) => ({
        id: "e" + i + Math.random().toString(36).slice(2, 6),
        company: e.company || "",
        role: e.role || "",
        startDate: e.startDate || "",
        endDate: e.endDate || "",
        bullets: e.bullets || [],
      })),
      education: toEducationList(j.education),
      projects: (j.projects || []).map((pr: any, i: number) => ({
        id: "pr" + i + Math.random().toString(36).slice(2, 6),
        name: pr.name || pr.title || "",
        description: Array.isArray(pr.description)
          ? pr.description.join(" ")
          : pr.description || "",
        tech: Array.isArray(pr.tech) ? pr.tech.join(", ") : pr.tech || pr.stack || "",
        link: pr.link || pr.url || "",
      })),
    };
  } catch {
    return parseResumeMock(text);
  }
}

// ===========================================================================
// Phase 2 — Interview preparation (plan / questions / scoring)
// Same Gemini setup + mock fallback so the whole flow runs without a key.
// ===========================================================================

type PrepContext = {
  stack: Stack;
  seniority: string;
  role: string;
  company: string;
  jdText: string;
  profile: MasterProfile;
};

/** Keywords in the JD/role the candidate's profile doesn't already cover. */
function focusGaps(jdText: string, role: string, profile: MasterProfile): string[] {
  const corpus = profileCorpus(profile);
  const source = `${role} ${jdText}`;
  return keywords(source)
    .filter((w) => w.length > 3 && !corpus.includes(w))
    .slice(0, 6);
}

// ---------------------------------------------------------------------------
// Prep plan
// ---------------------------------------------------------------------------
function prepPlanMock(ctx: PrepContext): PrepPlan {
  const gaps = focusGaps(ctx.jdText, ctx.role, ctx.profile);
  const rounds = ctx.stack.rounds.map((r, i) => ({
    ...r,
    focus:
      r.type === "behavioral"
        ? ["Tell-me-about-yourself", "Conflict & ownership stories (STAR)"]
        : gaps.slice(i, i + 2).length
        ? gaps.slice(i, i + 2)
        : [`Core ${r.label.toLowerCase()} fundamentals`],
  }));
  const focusAreas = gaps.length
    ? gaps
    : ctx.stack.rounds.map((r) => r.label.toLowerCase());
  return {
    summary: `A ${ctx.seniority || "mid"}-level ${ctx.stack.name} interview${
      ctx.company ? ` at ${ctx.company}` : ""
    } typically runs ${ctx.stack.rounds.length} rounds. Focus your prep on the gaps between your profile and this role.`,
    focusAreas,
    rounds,
  };
}

export async function generatePrepPlan(ctx: PrepContext): Promise<PrepPlan> {
  if (!geminiKey()) return prepPlanMock(ctx);
  try {
    const roundList = ctx.stack.rounds
      .map((r) => `${r.key} (${r.label}, type=${r.type})`)
      .join("; ");
    const system =
      "You are an interview-prep coach. Given a role stack, seniority, the job, and the candidate profile, " +
      "produce a prep plan. Return ONLY JSON: {summary: string, focusAreas: string[], " +
      "rounds: [{key: string, focus: string[]}]}. " +
      "The `key` MUST be one of the provided round keys. `focus` = 2-4 concrete, role- and gap-specific topics to study for that round. " +
      "Derive focus areas from the gap between the job requirements and the candidate's actual profile.";
    const user = `STACK ROUNDS: ${roundList}\nSENIORITY: ${
      ctx.seniority
    }\nTARGET: ${ctx.role}${ctx.company ? ` at ${ctx.company}` : ""}\nJOB DESCRIPTION:\n${
      ctx.jdText || "(none provided)"
    }\n\nCANDIDATE PROFILE:\n${JSON.stringify(ctx.profile)}`;
    const raw = await callGeminiPrep(system, user);
    const j = extractJson(raw);
    const byKey = new Map<string, string[]>(
      (j.rounds || []).map((r: any) => [
        String(r.key),
        Array.isArray(r.focus) ? r.focus.map(String) : [],
      ])
    );
    const rounds = ctx.stack.rounds.map((r) => ({
      ...r,
      focus: byKey.get(r.key)?.length
        ? (byKey.get(r.key) as string[])
        : prepPlanMock(ctx).rounds.find((m) => m.key === r.key)?.focus || [],
    }));
    return {
      summary: j.summary || prepPlanMock(ctx).summary,
      focusAreas:
        Array.isArray(j.focusAreas) && j.focusAreas.length
          ? j.focusAreas.map(String)
          : focusGaps(ctx.jdText, ctx.role, ctx.profile),
      rounds,
    };
  } catch {
    return prepPlanMock(ctx);
  }
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------
type GenQuestion = Omit<PrepQuestion, "id" | "sessionId">;

const DIFFICULTY_BY_SENIORITY: Record<string, Difficulty> = {
  junior: "easy",
  mid: "medium",
  senior: "hard",
  lead: "hard",
};

function prepQuestionsMock(
  ctx: PrepContext,
  round: StackRound,
  count: number
): GenQuestion[] {
  const diff = DIFFICULTY_BY_SENIORITY[ctx.seniority] || "medium";
  const gaps = focusGaps(ctx.jdText, ctx.role, ctx.profile);
  const topic = gaps[0] || round.label;
  const base: Record<string, string[]> = {
    coding: [
      "Given an array of integers, return the indices of the two numbers that add up to a target. Explain your time/space complexity.",
      "Implement a function to detect a cycle in a linked list. Walk through your approach before coding.",
    ],
    "system-design": [
      `Design a URL shortener that scales to millions of links. Cover the API, data model, and how you'd handle read-heavy traffic — relevant to ${ctx.company || "the role"}.`,
      "How would you design a rate limiter for a public API? Discuss trade-offs.",
    ],
    domain: [
      `Explain how you'd optimize the load performance of a ${ctx.role || "web"} application end to end.`,
      `What are the key trade-offs you weigh when choosing an architecture for ${topic}?`,
    ],
    behavioral: [
      "Tell me about a time you disagreed with a teammate. How did you resolve it? (Use STAR.)",
      "Describe a project you're most proud of and your specific contribution. (Use STAR.)",
    ],
    case: [
      `You're given a flat conversion funnel for ${ctx.company || "a product"}. Walk through how you'd diagnose and fix it.`,
      `Design a go-to-market plan to grow ${topic}. What channels and metrics would you prioritize?`,
    ],
  };
  const prompts = base[round.type] || base.behavioral;
  const rubric =
    round.type === "behavioral"
      ? ["Clear STAR structure", "Specific, real example", "Measurable result", "Reflection / learning"]
      : ["Correct, structured approach", "Trade-offs considered", "Communication & clarity", "Edge cases / scale"];
  return prompts.slice(0, count).map((prompt) => ({
    roundKey: round.key,
    type: round.type,
    topic,
    difficulty: diff,
    prompt,
    rubric,
    idealOutline:
      round.type === "behavioral"
        ? "Set the Situation and Task, detail the specific Actions YOU took, and end with a measurable Result and what you learned."
        : "State assumptions, outline a structured approach, discuss trade-offs and edge cases, then summarize the recommendation.",
  }));
}

export async function generatePrepQuestions(
  ctx: PrepContext,
  round: StackRound,
  count = 3
): Promise<GenQuestion[]> {
  if (!geminiKey()) return prepQuestionsMock(ctx, round, count);
  try {
    const system =
      "You are an interview-prep coach generating practice questions for ONE round. " +
      `Return ONLY JSON: {questions: [{topic: string, difficulty: "easy"|"medium"|"hard", prompt: string, rubric: string[], idealOutline: string}]}. ` +
      `Generate exactly ${count} questions for the "${round.label}" round (type=${round.type}). ` +
      "Tailor difficulty to seniority. Make them specific to the role/JD where possible. " +
      "rubric = 3-4 scoring criteria. idealOutline = a short outline of a strong answer. " +
      (round.type === "behavioral"
        ? "For behavioral questions, the ideal outline must be grounded ONLY in the candidate's real profile experiences — never invent accomplishments."
        : "");
    const user = `ROLE: ${ctx.role}${ctx.company ? ` at ${ctx.company}` : ""}\nSENIORITY: ${
      ctx.seniority
    }\nROUND: ${round.label} (${round.type})\nJOB DESCRIPTION:\n${
      ctx.jdText || "(none)"
    }\n\nCANDIDATE PROFILE:\n${JSON.stringify(ctx.profile)}`;
    const raw = await callGeminiPrep(system, user);
    const j = extractJson(raw);
    const items: any[] = Array.isArray(j.questions) ? j.questions : [];
    if (!items.length) return prepQuestionsMock(ctx, round, count);
    return items.slice(0, count).map((q) => ({
      roundKey: round.key,
      type: round.type,
      topic: String(q.topic || round.label),
      difficulty: (["easy", "medium", "hard"].includes(q.difficulty)
        ? q.difficulty
        : "medium") as Difficulty,
      prompt: String(q.prompt || ""),
      rubric: Array.isArray(q.rubric) ? q.rubric.map(String) : [],
      idealOutline: String(q.idealOutline || ""),
    }));
  } catch {
    return prepQuestionsMock(ctx, round, count);
  }
}

// ---------------------------------------------------------------------------
// Answer scoring
// ---------------------------------------------------------------------------
type ScoreResult = { score: number; feedback: PrepFeedback };

function scoreAnswerMock(
  question: PrepQuestion,
  answer: string,
  profile: MasterProfile
): ScoreResult {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const len = words.length;
  const lower = answer.toLowerCase();
  const isBehavioral = question.type === "behavioral";

  // Length-based baseline (a complete answer is usually 80-220 words).
  let score = len === 0 ? 0 : Math.min(7, Math.round(len / 30) + 2);

  const star = isBehavioral
    ? {
        situation: /\b(when|while|at|during|situation)\b/.test(lower),
        task: /\b(task|responsible|needed to|goal|had to)\b/.test(lower),
        action: /\b(i |we |implemented|built|led|decided|did)\b/.test(lower),
        result: /\b(result|increased|reduced|improved|\d+%|grew|saved|shipped)\b/.test(lower),
      }
    : undefined;

  const strengths: string[] = [];
  const gaps: string[] = [];
  if (len >= 60) strengths.push("Answer has enough depth to evaluate.");
  if (/\d+%?/.test(answer)) {
    strengths.push("Includes concrete numbers/metrics.");
    score = Math.min(9, score + 1);
  } else {
    gaps.push("Add a concrete, measurable result.");
  }
  if (isBehavioral && star) {
    const hit = Object.values(star).filter(Boolean).length;
    score = Math.max(score, Math.min(9, 3 + hit * 1.5));
    if (!star.result) gaps.push("Close with a measurable Result (STAR).");
    if (!star.situation) gaps.push("Open by setting the Situation (STAR).");
    if (hit >= 3) strengths.push("Follows the STAR structure.");
  } else {
    if (len < 40) gaps.push("Expand on your approach and trade-offs.");
    if (/trade.?off|because|however|alternativ/i.test(answer))
      strengths.push("Shows reasoning about trade-offs.");
    else gaps.push("Discuss trade-offs and edge cases explicitly.");
  }
  if (!strengths.length) strengths.push("A start — keep building on it.");

  return {
    score: Math.max(0, Math.min(10, Math.round(score))),
    feedback: {
      strengths,
      gaps,
      modelAnswer:
        question.idealOutline ||
        (isBehavioral
          ? `Ground a real story from your background — e.g. ${
              profile.experiences[0]?.bullets[0] || "a recent project"
            } — in STAR form.`
          : "Outline assumptions, a structured approach, trade-offs, and a clear recommendation."),
      star,
    },
  };
}

export async function scorePrepAnswer(
  question: PrepQuestion,
  answer: string,
  ctx: { role: string; company: string; profile: MasterProfile }
): Promise<ScoreResult> {
  if (!geminiKey() || !answer.trim())
    return scoreAnswerMock(question, answer, ctx.profile);
  try {
    const isBehavioral = question.type === "behavioral";
    const system =
      "You are a strict but fair interview coach scoring ONE answer against a rubric. " +
      `Return ONLY JSON: {score: integer 0-10, strengths: string[], gaps: string[], modelAnswer: string` +
      (isBehavioral
        ? `, star: {situation: boolean, task: boolean, action: boolean, result: boolean}}.`
        : `}.`) +
      " score reflects how well the answer meets the rubric. strengths/gaps are concrete and actionable. " +
      "modelAnswer is a better example answer. " +
      (isBehavioral
        ? "Score STAR completeness. The modelAnswer MUST be grounded ONLY in the candidate's real profile — never fabricate accomplishments or numbers."
        : "");
    const user = `ROLE: ${ctx.role}${ctx.company ? ` at ${ctx.company}` : ""}\nQUESTION (${
      question.type
    }): ${question.prompt}\nRUBRIC: ${question.rubric.join("; ")}\nIDEAL OUTLINE: ${
      question.idealOutline
    }\n\nCANDIDATE PROFILE:\n${JSON.stringify(
      ctx.profile
    )}\n\nCANDIDATE ANSWER:\n${answer}`;
    const raw = await callGeminiPrep(system, user);
    const j = extractJson(raw);
    const score = Math.max(0, Math.min(10, Math.round(Number(j.score) || 0)));
    return {
      score,
      feedback: {
        strengths: Array.isArray(j.strengths) ? j.strengths.map(String) : [],
        gaps: Array.isArray(j.gaps) ? j.gaps.map(String) : [],
        modelAnswer: String(j.modelAnswer || question.idealOutline || ""),
        star:
          isBehavioral && j.star
            ? {
                situation: !!j.star.situation,
                task: !!j.star.task,
                action: !!j.star.action,
                result: !!j.star.result,
              }
            : undefined,
      },
    };
  } catch {
    return scoreAnswerMock(question, answer, ctx.profile);
  }
}

// ---------------------------------------------------------------------------
// Conversational mock interviewer — one turn at a time, per question
// ---------------------------------------------------------------------------
function mockInterviewReply(
  question: PrepQuestion,
  history: InterviewTurn[],
  message: string
): string {
  // No candidate message yet → the interviewer opens the question.
  if (!message.trim() && history.length === 0) {
    return `Thanks for joining. Here's your ${question.type.replace(
      "-",
      " "
    )} question:\n\n"${question.prompt}"\n\nTake a moment, then walk me through how you'd approach it — think out loud.`;
  }
  const probes =
    question.type === "behavioral"
      ? [
          "Good context. What was your specific role, and what action did *you* personally take?",
          "What was the measurable result or outcome of that?",
          "What was the hardest part, and how did you handle it?",
          "Looking back, what would you do differently next time?",
          "Who else was involved, and how did you bring them along?",
        ]
      : [
          "What's the time and space complexity of that approach — and can you do better?",
          "What edge cases would you need to handle here?",
          "Why that approach over the alternatives? Walk me through the trade-offs.",
          "How would you test this?",
          "Where might this break at scale, and how would you address it?",
        ];
  const asked = history.filter((h) => h.role === "interviewer").length;
  // Rotate through probes (don't get stuck on one), and only nudge to finish
  // after a few exchanges.
  const probe = probes[(asked - 1 + probes.length) % probes.length] || probes[0];
  const wrapUp = asked >= 4 ? " When you're ready, hit “Finish & score”." : "";
  return probe + wrapUp;
}

export async function mockInterviewTurn(
  question: PrepQuestion,
  ctx: { role: string; company: string; profile: MasterProfile },
  history: InterviewTurn[],
  message: string
): Promise<{ reply: string; offline: boolean }> {
  // The opening is deterministic — pose the question without spending a request.
  if (!message.trim() && history.length === 0)
    return { reply: mockInterviewReply(question, [], ""), offline: false };
  if (!geminiKey())
    return { reply: mockInterviewReply(question, history, message), offline: true };
  try {
    const isBehavioral = question.type === "behavioral";
    const system =
      "You are a friendly but rigorous technical interviewer running ONE interview question in a live, conversational mock interview. " +
      "Stay fully in character as the interviewer. Ask ONE probing follow-up at a time, give a small nudge if the candidate is stuck, " +
      "and NEVER reveal the full model solution — guide them to it. Keep every reply to 1-3 short sentences. " +
      (isBehavioral
        ? "Probe for STAR structure (Situation, Task, Action, Result) and a measurable outcome. "
        : "Probe complexity, edge cases, and trade-offs. ") +
      'Return ONLY JSON: {reply: string}.';
    const convo = history
      .map(
        (h) =>
          `${h.role === "interviewer" ? "Interviewer" : "Candidate"}: ${h.text}`
      )
      .join("\n");
    const user = `ROLE: ${ctx.role}${
      ctx.company ? ` at ${ctx.company}` : ""
    }\nQUESTION (${question.type}): ${question.prompt}\nRUBRIC: ${question.rubric.join(
      "; "
    )}\n\nCONVERSATION SO FAR:\n${convo || "(none yet)"}\n\nCANDIDATE'S LATEST MESSAGE:\n${
      message || "(the candidate just joined — greet them briefly and pose the question)"
    }`;
    const raw = await callGeminiPrep(system, user);
    const j = extractJson(raw);
    const reply = String(j.reply || "").trim();
    if (!reply)
      return { reply: mockInterviewReply(question, history, message), offline: true };
    return { reply, offline: false };
  } catch {
    return { reply: mockInterviewReply(question, history, message), offline: true };
  }
}

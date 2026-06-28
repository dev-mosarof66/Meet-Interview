import {
  Analysis,
  Job,
  MasterProfile,
  ResumeDoc,
  GhostVerdict,
  Education,
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
  };
}

export async function parseResume(text: string): Promise<MasterProfile> {
  if (!geminiKey()) return parseResumeMock(text);
  try {
    const system =
      "Extract a structured candidate profile from the resume text. Return ONLY JSON with keys: " +
      "fullName, title, email, phone, location, summary, skills (string[]), " +
      "experiences (array of {company, role, startDate, endDate, bullets: string[]}), " +
      "education (array of {school, degree, year}). " +
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
    };
  } catch {
    return parseResumeMock(text);
  }
}

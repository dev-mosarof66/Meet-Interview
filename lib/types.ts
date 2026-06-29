export type Experience = {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  bullets: string[];
};

export type Education = {
  id: string;
  school: string;
  degree: string;
  year: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  tech: string;
  link: string;
};

export type MasterProfile = {
  fullName: string;
  photo?: string; // data URL
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experiences: Experience[];
  education: Education[];
  projects: Project[];
};

export type AppStatus =
  | "saved"
  | "applied"
  | "responded"
  | "interview"
  | "offer"
  | "rejected";

export const STATUS_FLOW: AppStatus[] = [
  "saved",
  "applied",
  "responded",
  "interview",
  "offer",
  "rejected",
];

export type GhostVerdict = "real" | "caution" | "ghost";

export type Analysis = {
  matchScore: number; // 0-100
  matchReasons: string[];
  gaps: string[]; // missing skills/keywords
  ghostVerdict: GhostVerdict;
  ghostReasons: string[];
};

export type ResumeDoc = {
  name: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  summary: string;
  skills: string[];
  experiences: {
    role: string;
    company: string;
    dates: string;
    bullets: string[];
  }[];
  education: string;
  projects: { name: string; tech: string; description: string; link: string }[];
  docxUrl?: string;
  flagged: string[]; // Truth-Lock: unverified claims removed
  factGaps: string[]; // suggestions to add a real metric (never invented)
};

export type CoverDoc = {
  text: string;
  docxUrl?: string;
};

export type Tailored = {
  resume?: ResumeDoc;
  cover?: CoverDoc;
};

export type Job = {
  id: string;
  company: string;
  title: string;
  location: string;
  source: string;
  jdText: string;
  postedDaysAgo: number;
  hasSalary: boolean;
  status: AppStatus;
  appliedAt?: number;
  responseAt?: number;
  createdAt: number;
  analysis?: Analysis;
  tailored?: Tailored;
};

// ---------------------------------------------------------------------------
// Phase 2 — Interview preparation
// ---------------------------------------------------------------------------

export type PrepRoundType =
  | "coding"
  | "behavioral"
  | "system-design"
  | "case"
  | "domain";

export type Difficulty = "easy" | "medium" | "hard";

export const SENIORITIES = ["junior", "mid", "senior", "lead"] as const;
export type Seniority = (typeof SENIORITIES)[number];

/** A round inside a role "stack" — its interview shape. */
export type StackRound = {
  key: string;
  label: string;
  type: PrepRoundType;
  weight: number; // relative importance for the readiness score
};

/** A role family with its own interview rounds. */
export type Stack = {
  id: string;
  name: string;
  tagline: string;
  rounds: StackRound[];
  comingSoon?: boolean; // shown in the picker but not yet selectable
};

/** A planned round = the stack round + AI-derived focus areas for this user. */
export type PrepPlanRound = StackRound & { focus: string[] };

export type PrepPlan = {
  summary: string;
  focusAreas: string[]; // overall, from JD vs profile gaps
  rounds: PrepPlanRound[];
};

export type PrepQuestion = {
  id: string;
  sessionId: string;
  roundKey: string;
  type: PrepRoundType;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  rubric: string[]; // scoring criteria
  idealOutline: string;
};

export type StarCoverage = {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
};

export type PrepFeedback = {
  strengths: string[];
  gaps: string[];
  modelAnswer: string;
  star?: StarCoverage; // behavioral only
};

export type PrepAttempt = {
  id: string;
  questionId: string;
  sessionId: string;
  answer: string;
  score: number; // 0-10
  feedback: PrepFeedback;
  createdAt: number;
};

/** One message in a mock-interview conversation for a single question. */
export type InterviewTurn = {
  role: "interviewer" | "candidate";
  text: string;
};

export type PrepSession = {
  id: string;
  jobId?: string;
  stackId: string;
  stackName: string;
  seniority: string;
  role: string;
  company: string;
  jdText: string;
  plan: PrepPlan;
  readiness: number; // 0-100
  createdAt: number;
};

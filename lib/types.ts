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

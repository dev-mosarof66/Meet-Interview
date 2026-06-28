export type Onboarding = {
  name: string;
  situation: string; // who they are
  skills: string[]; // their stack
  level: string; // experience level
  source: string; // marketing attribution — where they heard about us
  goals: string[]; // what they want from the product
  targetRole?: string; // legacy — still editable on the profile page
  industry?: string; // legacy — still editable on the profile page
  completedAt: number;
};

export function onboardingKey(scope: string) {
  return `meet.onboarding.${scope}`;
}

export function getOnboarding(scope: string): Onboarding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(onboardingKey(scope));
    return raw ? (JSON.parse(raw) as Onboarding) : null;
  } catch {
    return null;
  }
}

export function isOnboarded(scope: string): boolean {
  return Boolean(getOnboarding(scope));
}

export function saveOnboarding(
  scope: string,
  data: Omit<Onboarding, "completedAt">
) {
  if (typeof window === "undefined") return;
  const payload: Onboarding = { ...data, completedAt: Date.now() };
  localStorage.setItem(onboardingKey(scope), JSON.stringify(payload));

  // Seed the master profile with what we just learned.
  try {
    const pKey = `meet.profile.v3.${scope}`;
    const existing = localStorage.getItem(pKey);
    const base = existing
      ? JSON.parse(existing)
      : {
          fullName: "",
          title: "",
          email: "",
          phone: "",
          location: "",
          summary: "",
          skills: [],
          experiences: [],
          education: [],
        };
    const merged = {
      ...base,
      fullName: data.name || base.fullName || "",
      skills: data.skills?.length ? data.skills : base.skills || [],
    };
    localStorage.setItem(pKey, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
}

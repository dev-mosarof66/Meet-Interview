"use client";

import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  FiUser,
  FiTarget,
  FiBriefcase,
  FiFileText,
  FiCheck,
  FiLock,
  FiLogOut,
  FiTrash2,
  FiSettings,
  FiEdit2,
  FiFolder,
  FiArrowUp,
  FiArrowDown,
} from "react-icons/fi";
import { useStore } from "@/lib/store";
import { LocationField } from "@/components/LocationField";
import { ProfileSkeleton, Skeleton } from "@/components/Skeleton";
import { MasterProfile } from "@/lib/types";
import { authClient } from "@/lib/auth-client";
import { getOnboarding } from "@/lib/onboarding";

type Tab = "basics" | "skills" | "experience" | "projects" | "import";

const TABS: { id: Tab; label: string; short: string; Icon: IconType }[] = [
  { id: "basics", label: "Basics", short: "Basics", Icon: FiUser },
  { id: "skills", label: "Skills & education", short: "Skills", Icon: FiTarget },
  { id: "experience", label: "Experience", short: "Work", Icon: FiBriefcase },
  { id: "projects", label: "Projects", short: "Projects", Icon: FiFolder },
  { id: "import", label: "Import résumé", short: "Import", Icon: FiFileText },
];

function uid() {
  return "e" + Math.random().toString(36).slice(2, 8);
}

export default function ProfilePage() {
  const { ready, profile, setProfile } = useStore();
  const [draft, setDraft] = useState<MasterProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("basics");
  const [resumeText, setResumeText] = useState("");
  const [importing, setImporting] = useState(false);
  const [email, setEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [onb, setOnb] = useState<Record<string, any> | null>(null);
  const [editing, setEditing] = useState(false);
  const [credits, setCredits] = useState({
    jobs: 0,
    percent: 0,
    complete: false,
    claimed: false,
  });
  const [bonusToast, setBonusToast] = useState(false);
  useEffect(() => {
    refreshCredits();
  }, []);
  const prefilled = useRef(false);
  const onbOriginal = useRef<Record<string, any> | null>(null);

  // Pull real account + onboarding data from the API, prefill empty fields.
  useEffect(() => {
    if (!ready || prefilled.current) return;
    prefilled.current = true;
    (async () => {
      let accountName = "";
      let scopeKey = "anon";
      try {
        const { data } = await authClient.getSession();
        accountName = data?.user?.name || "";
        scopeKey = data?.user?.email || data?.user?.id || "anon";
        setEmail(data?.user?.email || "");
      } catch {
        /* ignore */
      }
      let dbOnb: Record<string, any> | null = null;
      try {
        const r = await fetch("/api/onboarding");
        if (r.ok) dbOnb = (await r.json()).onboarding;
      } catch {
        /* ignore */
      }

      // Fall back to locally-stored onboarding answers if the DB row is missing.
      const local = getOnboarding(scopeKey);
      const unified = {
        target_role: dbOnb?.target_role || local?.targetRole || "",
        industry: dbOnb?.industry || local?.industry || "",
        level: dbOnb?.level || local?.level || "",
        source: dbOnb?.source || local?.source || "",
        situation: dbOnb?.situation || local?.situation || "",
        goals:
          (Array.isArray(dbOnb?.goals) && dbOnb!.goals.length
            ? dbOnb!.goals
            : local?.goals) || [],
      };
      setOnb(unified);
      onbOriginal.current = unified;

      // Load the saved profile from the DB (source of truth); else use local.
      let dbProfile: Record<string, any> | null = null;
      try {
        const r2 = await fetch("/api/profile");
        if (r2.ok) dbProfile = (await r2.json()).profile;
      } catch {
        /* ignore */
      }
      const base: MasterProfile = dbProfile
        ? {
            fullName: dbProfile.full_name || "",
            title: dbProfile.title || "",
            email: "",
            phone: "",
            location: dbProfile.location || "",
            summary: dbProfile.summary || "",
            photo: dbProfile.photo || "",
            skills: dbProfile.skills || [],
            experiences: dbProfile.experiences || [],
            education: dbProfile.education || [],
            projects: dbProfile.projects || [],
          }
        : { ...profile };
      let changed = Boolean(dbProfile);
      if (accountName) {
        base.fullName = accountName;
        changed = true;
      }
      if (changed) setProfile(base);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function logout() {
    await authClient.signOut();
    window.location.assign("/");
  }

  function openDeleteConfirm() {
    setAcctOpen(false);
    setConfirmText("");
    setConfirmOpen(true);
  }

  async function performDelete() {
    if (confirmText.trim() !== "DELETE NOW") return;
    setDeleting(true);
    try {
      const res = await authClient.deleteUser();
      if (res?.error) {
        alert(
          res.error.message ||
            "Could not delete account. Try logging out and back in, then retry."
        );
        return;
      }
      const scopeKey = email || "anon";
      [
        `meet.profile.v2.${scopeKey}`,
        `meet.jobs.v2.${scopeKey}`,
        `meet.onboarding.${scopeKey}`,
        `meet.profile.${scopeKey}`,
        `meet.jobs.${scopeKey}`,
      ].forEach((k) => localStorage.removeItem(k));
      window.location.assign("/");
    } catch {
      alert("Could not delete account.");
    } finally {
      setDeleting(false);
    }
  }

  if (!ready) return <ProfileSkeleton />;
  const p = draft ?? profile;

  function update(patch: Partial<MasterProfile>) {
    setDraft({ ...p, ...patch });
    setSaved(false);
  }
  async function save() {
    setProfile(p);
    setDraft(null);
    setSaved(true);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(p),
      });
    } catch {
      /* ignore */
    }
    refreshCredits();
  }

  function refreshCredits() {
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => {
        setCredits({
          jobs: d.jobs || 0,
          percent: d.percent || 0,
          complete: !!d.complete,
          claimed: !!d.claimed,
        });
        if (d.justGranted) {
          setBonusToast(true);
          setTimeout(() => setBonusToast(false), 5000);
        }
      })
      .catch(() => {});
  }

  function updateOnb(patch: Record<string, any>) {
    setOnb((o) => ({ ...(o || {}), ...patch }));
    setSaved(false);
  }
  async function saveBasics() {
    save();
    if (onb) {
      const body = {
        situation: onb.situation || "",
        targetRole: onb.target_role || "",
        industry: onb.industry || "",
        level: onb.level || "",
        source: onb.source || "",
        goals: onb.goals || [],
      };
      try {
        await fetch("/api/onboarding", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {}
      try {
        const key = `meet.onboarding.${email || "anon"}`;
        const existing = JSON.parse(localStorage.getItem(key) || "{}");
        localStorage.setItem(
          key,
          JSON.stringify({ ...existing, ...body, completedAt: existing.completedAt || Date.now() })
        );
      } catch {}
      onbOriginal.current = onb;
    }
  }

  async function importResume() {
    if (resumeText.trim().length < 20) return;
    setImporting(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: resumeText }),
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setDraft(null);
        setResumeText("");
        setSaved(true);
        setTab("basics");
        fetch("/api/profile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data.profile),
        }).catch(() => {});
      }
    } finally {
      setImporting(false);
    }
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => update({ photo: String(reader.result) });
    reader.readAsDataURL(f);
  }

  async function onResumeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setDraft(null);
        setResumeText("");
        setSaved(true);
        setTab("basics");
        fetch("/api/profile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data.profile),
        }).catch(() => {});
      } else if (data.error) {
        alert(data.error);
      }
    } finally {
      setImporting(false);
      e.target.value = ""; // allow re-uploading the same file
    }
  }

  const initials =
    (p.fullName || "")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const onbLoading = onb === null;
  const levelLabel =
    LEVEL_OPTIONS.find((o) => o.value === onb?.level)?.label || "";

  const Avatar = ({ size }: { size: number }) =>
    p.photo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={p.photo}
        alt=""
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    ) : (
      <div
        className="grid place-items-center rounded-full bg-brand-100 font-bold text-brand-700"
        style={{ width: size, height: size }}
      >
        {initials || <FiUser aria-hidden />}
      </div>
    );

  return (
    <>
    <div className="grid gap-6 lg:h-full lg:grid-cols-[280px_1fr]">
      {/* Sidebar (full height) */}
      <aside className="hidden lg:block lg:w-full lg:h-full">
        <div className="card flex h-full flex-col p-5">
          <div className="flex items-center gap-3">
            <Avatar size={48} />
            <div className="min-w-0">
              <div className="truncate font-semibold">
                {p.fullName || "Your name"}
              </div>
              <div className="truncate text-xs text-muted">
                {onbLoading ? (
                  <Skeleton className="mt-1 h-3 w-20" />
                ) : (
                  levelLabel || "Add your experience"
                )}
              </div>
            </div>
          </div>

          <nav className="mt-5 hidden gap-1 lg:flex lg:flex-col">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition lg:w-full " +
                    (active
                      ? "bg-brand-100 text-brand-700"
                      : "text-muted hover:text-ink")
                  }
                >
                  <t.Icon className="shrink-0" aria-hidden />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {/* Free-tailors / completion widget */}
          <div className="mt-5 rounded-xl border border-line p-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Profile {credits.percent}%</span>
              {credits.complete && (
                <span className="chip bg-ok/15 text-ok">Complete</span>
              )}
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-coral-500 transition-all"
                style={{ width: `${credits.percent}%` }}
              />
            </div>
            {credits.claimed ? (
              <div className="mt-2 text-[11px] text-muted">
                <span className="font-semibold text-ink">{credits.jobs}</span> free
                job{credits.jobs === 1 ? "" : "s"} left — analyze + tailor included.
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-muted">
                Reach 100% to unlock{" "}
                <span className="font-semibold text-ink">3 free jobs</span> (analyze
                + tailor resume & cover, free).
              </div>
            )}
          </div>

          {/* Account actions (desktop only — mobile uses the bottom bar) */}
          <div className="mt-6 space-y-1 border-t border-line pt-4 lg:mt-auto">
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-brand-100/60 hover:text-ink"
            >
              <FiLogOut className="shrink-0" aria-hidden /> Log out
            </button>
            <button
              onClick={openDeleteConfirm}
              disabled={deleting}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
            >
              <FiTrash2 className="shrink-0" aria-hidden />
              {deleting ? "Deleting…" : "Delete account"}
            </button>
            <p className="flex items-start gap-1 px-3 pt-2 text-[11px] leading-snug text-muted">
              <FiLock className="mt-0.5 shrink-0" aria-hidden /> Truth-Lock uses{" "}
              <span className="font-semibold text-ink">only</span> your facts.
            </p>
          </div>
        </div>
      </aside>

      {/* Content (scrolls independently) */}
      <div className="min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1">
        <div className="lg:pb-2">
        {tab === "basics" && (
          <Card
            title="Basics"
            sub="All your profile details in one place."
            action={
              editing ? (
                <div className="flex gap-2">
                  <button
                    className="btn-outline text-xs"
                    onClick={() => {
                      setDraft(null);
                      setOnb(onbOriginal.current);
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary inline-flex items-center gap-1 text-xs"
                    onClick={() => {
                      saveBasics();
                      setEditing(false);
                    }}
                  >
                    <FiCheck aria-hidden/> Save
                  </button>
                </div>
              ) : (
                <button
                  className="size-6 rounded-full border border-rose-100/50 inline-flex items-center justify-center gap-1"
                  onClick={() => setEditing(true)}
                >
                  <FiEdit2 size={12} aria-hidden className="text-black dark:text-white" />
                </button>
              )
            }
          >
            {/* Header: avatar + name + email */}
            <div className="mb-6 flex items-start gap-4">
              <Avatar size={72} />
              <div className="min-w-0 flex-1">
                {editing ? (
                  <input
                    className="input"
                    value={p.fullName}
                    onChange={(e) => update({ fullName: e.target.value })}
                    placeholder="Your name"
                  />
                ) : (
                  <div className="truncate text-lg font-bold">
                    {p.fullName || (
                      <span className="italic text-muted">Your name</span>
                    )}
                  </div>
                )}
                <div className="mt-1 truncate text-sm text-muted">
                  {email || p.email || "—"}
                </div>
                {editing && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <label className="btn-outline cursor-pointer">
                      {p.photo ? "Change photo" : "Upload photo"}
                      <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                    </label>
                    {p.photo && (
                      <button
                        className="text-xs font-semibold text-muted hover:text-danger"
                        onClick={() => update({ photo: "" })}
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Location</label>
                {editing ? (
                  <LocationField
                    value={p.location}
                    onChange={(v) => update({ location: v })}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm">
                    {p.location?.trim() ? (
                      p.location
                    ) : (
                      <span className="italic text-muted">Not set</span>
                    )}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <EditableField
                  editing={editing}
                  label="Summary"
                  value={p.summary}
                  onChange={(v) => update({ summary: v })}
                  textarea
                />
              </div>
            </div>

            {/* Stack & experience — from sign-up */}
            <div className="mt-6 border-t border-line pt-5">
              <div className="label mb-3">Stack &amp; experience</div>
              {onbLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <SkeletonField />
                  <SkeletonField />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField editing={editing} label="Experience level" value={onb?.level || ""} onChange={(v) => updateOnb({ level: v })} options={LEVEL_OPTIONS} />
                  <SelectField editing={editing} label="Situation" value={onb?.situation || ""} onChange={(v) => updateOnb({ situation: v })} options={SITUATION_OPTIONS} />
                </div>
              )}

              {/* Skills summary — edit on the Skills tab */}
              <div className="mt-4">
                <label className="label">Skills</label>
                {p.skills.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {p.skills.map((s) => (
                      <span key={s} className="chip bg-brand-100 text-brand-700">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="mt-1 text-sm font-semibold text-brand-500 hover:underline"
                    onClick={() => setTab("skills")}
                  >
                    + Add your skills
                  </button>
                )}
              </div>
            </div>

            {/* Experience summary — edit on the Experience tab */}
            <div className="mt-6 border-t border-line pt-5">
              <label className="label">Experience</label>
              {p.experiences.length > 0 ? (
                <div className="mt-1 space-y-2">
                  {p.experiences.map((exp) => (
                    <div
                      key={exp.id}
                      className="rounded-lg border border-line px-3 py-2"
                    >
                      <div className="text-sm font-semibold">
                        {exp.role || "Untitled role"}
                        {exp.company ? (
                          <span className="font-normal text-muted">
                            {" "}
                            · {exp.company}
                          </span>
                        ) : null}
                      </div>
                      {exp.bullets.length > 0 && (
                        <div className="mt-0.5 text-xs text-muted">
                          {exp.bullets.length} highlight
                          {exp.bullets.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-1 text-sm font-semibold text-brand-500 hover:underline"
                  onClick={() => setTab("experience")}
                >
                  + Add experience
                </button>
              )}
            </div>

            {/* Education summary — edit on the Skills & education tab */}
            <div className="mt-6 border-t border-line pt-5">
              <label className="label">Education</label>
              {p.education.length > 0 ? (
                <div className="mt-1 space-y-2">
                  {p.education.map((ed) => (
                    <div
                      key={ed.id}
                      className="rounded-lg border border-line px-3 py-2"
                    >
                      <div className="text-sm font-semibold">
                        {ed.degree || ed.school || "Education"}
                        {ed.degree && ed.school ? (
                          <span className="font-normal text-muted">
                            {" "}
                            · {ed.school}
                          </span>
                        ) : null}
                      </div>
                      {ed.year && (
                        <div className="mt-0.5 text-xs text-muted">{ed.year}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-1 text-sm font-semibold text-brand-500 hover:underline"
                  onClick={() => setTab("skills")}
                >
                  + Add education
                </button>
              )}
            </div>
          </Card>
        )}

        {tab === "skills" && (
          <Card title="Skills & education" sub="Comma-separate your skills.">
            <Field label="Skills (comma separated)">
              <input
                className="input"
                value={p.skills.join(", ")}
                onChange={(e) =>
                  update({ skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                }
              />
            </Field>
            {p.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.skills.map((s) => (
                  <span key={s} className="chip bg-brand-100 text-brand-700">{s}</span>
                ))}
              </div>
            )}

            {/* Education — multiple entries */}
            <div className="mt-6 border-t border-line pt-5">
              <div className="mb-3 flex items-center justify-between">
                <label className="label mb-0">Education</label>
                <button
                  type="button"
                  className="btn-outline text-xs"
                  onClick={() =>
                    update({
                      education: [
                        { id: uid(), school: "", degree: "", year: "" },
                        ...p.education,
                      ],
                    })
                  }
                >
                  + Add education
                </button>
              </div>

              {p.education.length === 0 && (
                <p className="rounded-lg border border-dashed border-line p-5 text-center text-sm text-muted">
                  No education yet. Add a school, degree, or certification.
                </p>
              )}

              <div className="space-y-3">
                {p.education.map((ed, idx) => {
                  const setEd = (patch: Partial<typeof ed>) => {
                    const education = [...p.education];
                    education[idx] = { ...ed, ...patch };
                    update({ education });
                  };
                  return (
                    <div key={ed.id} className="rounded-xl border border-line p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="School / institution">
                          <input
                            className="input"
                            value={ed.school}
                            onChange={(e) => setEd({ school: e.target.value })}
                            placeholder="e.g. Stanford University"
                          />
                        </Field>
                        <Field label="Degree / qualification">
                          <input
                            className="input"
                            value={ed.degree}
                            onChange={(e) => setEd({ degree: e.target.value })}
                            placeholder="e.g. B.S. Computer Science"
                          />
                        </Field>
                        <Field label="Year">
                          <input
                            className="input"
                            value={ed.year}
                            onChange={(e) => setEd({ year: e.target.value })}
                            placeholder="e.g. 2021"
                          />
                        </Field>
                      </div>
                      <div className="mt-2 text-right">
                        <button
                          type="button"
                          className="text-xs font-semibold text-muted hover:text-danger"
                          onClick={() =>
                            update({
                              education: p.education.filter((_, i) => i !== idx),
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <SaveRow saved={saved} onSave={save} />
          </Card>
        )}

        {tab === "experience" && (
          <Card
            title="Experience"
            sub="Add roles with real, metric-rich bullets."
            action={
              <button
                className="btn-outline"
                onClick={() =>
                  update({
                    experiences: [
                      { id: uid(), company: "", role: "", startDate: "", endDate: "", bullets: [] },
                      ...p.experiences,
                    ],
                  })
                }
              >
                + Add role
              </button>
            }
          >
            {p.experiences.length === 0 && (
              <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
                No experience yet. Click “Add role” or import your résumé.
              </p>
            )}
            <div className="space-y-4">
              {p.experiences.map((exp, idx) => (
                <div key={exp.id} className="rounded-xl border border-line p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Role">
                      <input
                        className="input"
                        value={exp.role}
                        onChange={(e) => {
                          const experiences = [...p.experiences];
                          experiences[idx] = { ...exp, role: e.target.value };
                          update({ experiences });
                        }}
                      />
                    </Field>
                    <Field label="Company">
                      <input
                        className="input"
                        value={exp.company}
                        onChange={(e) => {
                          const experiences = [...p.experiences];
                          experiences[idx] = { ...exp, company: e.target.value };
                          update({ experiences });
                        }}
                      />
                    </Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Bullets (one per line — include real metrics!)">
                      <textarea
                        className="input min-h-[100px]"
                        value={exp.bullets.join("\n")}
                        onChange={(e) => {
                          const experiences = [...p.experiences];
                          experiences[idx] = { ...exp, bullets: e.target.value.split("\n").filter(Boolean) };
                          update({ experiences });
                        }}
                      />
                    </Field>
                  </div>
                  <div className="mt-2 text-right">
                    <button
                      className="text-xs font-semibold text-muted hover:text-danger"
                      onClick={() => update({ experiences: p.experiences.filter((_, i) => i !== idx) })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <SaveRow saved={saved} onSave={save} />
          </Card>
        )}

        {tab === "projects" && (
          <Card
            title="Projects"
            sub="Showcase what you've built — used to strengthen your résumé."
            action={
              <button
                className="btn-outline"
                onClick={() =>
                  update({
                    projects: [
                      { id: uid(), name: "", description: "", tech: "", link: "" },
                      ...(p.projects || []),
                    ],
                  })
                }
              >
                + Add project
              </button>
            }
          >
            {(!p.projects || p.projects.length === 0) && (
              <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
                No projects yet. Click “Add project” or import your résumé.
              </p>
            )}
            <div className="space-y-4">
              {(p.projects || []).map((proj, idx) => (
                <div key={proj.id} className="rounded-xl border border-line p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Project name">
                      <input
                        className="input"
                        value={proj.name}
                        onChange={(e) => {
                          const projects = [...p.projects];
                          projects[idx] = { ...proj, name: e.target.value };
                          update({ projects });
                        }}
                      />
                    </Field>
                    <Field label="Tech stack">
                      <input
                        className="input"
                        value={proj.tech}
                        placeholder="React, Node.js, MongoDB"
                        onChange={(e) => {
                          const projects = [...p.projects];
                          projects[idx] = { ...proj, tech: e.target.value };
                          update({ projects });
                        }}
                      />
                    </Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Link (live or repo)">
                      <input
                        className="input"
                        value={proj.link}
                        placeholder="https://…"
                        onChange={(e) => {
                          const projects = [...p.projects];
                          projects[idx] = { ...proj, link: e.target.value };
                          update({ projects });
                        }}
                      />
                    </Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Description (what it does, your impact)">
                      <textarea
                        className="input min-h-[80px]"
                        value={proj.description}
                        onChange={(e) => {
                          const projects = [...p.projects];
                          projects[idx] = { ...proj, description: e.target.value };
                          update({ projects });
                        }}
                      />
                    </Field>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1">
                      <button
                        aria-label="Move up"
                        disabled={idx === 0}
                        className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-brand-100 hover:text-brand-700 disabled:opacity-30"
                        onClick={() => {
                          if (idx === 0) return;
                          const arr = [...p.projects];
                          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                          update({ projects: arr });
                        }}
                      >
                        <FiArrowUp aria-hidden />
                      </button>
                      <button
                        aria-label="Move down"
                        disabled={idx === p.projects.length - 1}
                        className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-brand-100 hover:text-brand-700 disabled:opacity-30"
                        onClick={() => {
                          const arr = [...p.projects];
                          if (idx >= arr.length - 1) return;
                          [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                          update({ projects: arr });
                        }}
                      >
                        <FiArrowDown aria-hidden />
                      </button>
                    </div>
                    <button
                      className="text-xs font-semibold text-muted hover:text-danger"
                      onClick={() =>
                        update({
                          projects: p.projects.filter((_, i) => i !== idx),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <SaveRow saved={saved} onSave={save} />
          </Card>
        )}

        {tab === "import" && (
          <Card
            title="Import your résumé"
            sub="Upload a file or paste your résumé — we'll autofill your profile from it."
          >
            <label className="mb-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line p-6 text-center transition hover:border-brand-300">
              <FiFileText className="text-xl text-brand-500" aria-hidden />
              <span className="text-sm font-semibold">
                {importing ? "Reading your résumé…" : "Upload résumé"}
              </span>
              <span className="text-xs text-muted">
                PDF, DOCX, or TXT — we extract the text and autofill
              </span>
              <input
                type="file"
                accept=".txt,.md,.pdf,.doc,.docx"
                className="hidden"
                onChange={onResumeFile}
                disabled={importing}
              />
            </label>
            <textarea
              className="input min-h-[200px] font-mono text-xs"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="…or paste your full résumé here"
            />
            <div className="mt-3 flex items-center gap-3">
              <button className="btn-coral" onClick={importResume} disabled={importing}>
                {importing ? "Reading…" : "Autofill my profile"}
              </button>
            </div>
          </Card>
        )}
        </div>
      </div>
    </div>

    {/* Backdrop to close the account menu */}
    {acctOpen && (
      <div
        className="fixed inset-0 z-20 sm:hidden"
        onClick={() => setAcctOpen(false)}
      />
    )}

    {/* Profile-specific floating mobile bottom bar */}
    <nav className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 sm:hidden">
      <div className="relative">
        {/* Account popup */}
        {acctOpen && (
          <div className="animate-fade absolute bottom-full right-0 mb-3 w-48 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <button
              onClick={() => {
                setAcctOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-ink transition hover:bg-brand-100/60"
            >
              <FiLogOut aria-hidden /> Log out
            </button>
            <button
              onClick={openDeleteConfirm}
              disabled={deleting}
              className="flex w-full items-center gap-2 border-t border-line px-4 py-3 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
            >
              <FiTrash2 aria-hidden /> Delete account
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 rounded-full border border-line bg-surface/90 p-1.5 shadow-card backdrop-blur">
          {TABS.map((t) => {
            const active = tab === t.id && !acctOpen;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setAcctOpen(false);
                  setTab(t.id);
                }}
                className="flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold"
              >
                <span
                  className={
                    "grid h-9 w-9 place-items-center rounded-full transition-all duration-300 ease-out " +
                    (active
                      ? "-translate-y-4 bg-brand-500 text-white shadow-[0_10px_25px_-3px_rgba(79,70,229,0.7)] ring-2 ring-brand-500/30"
                      : "text-muted")
                  }
                >
                  <t.Icon className="text-lg" aria-hidden />
                </span>
                <span className={active ? "text-brand-500" : "text-muted"}>
                  {t.short}
                </span>
              </button>
            );
          })}

          {/* Account item */}
          <button
            onClick={() => setAcctOpen((o) => !o)}
            className="flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold"
          >
            <span
              className={
                "grid h-9 w-9 place-items-center rounded-full transition-all duration-300 ease-out " +
                (acctOpen
                  ? "-translate-y-4 bg-brand-500 text-white shadow-[0_10px_25px_-3px_rgba(79,70,229,0.7)] ring-2 ring-brand-500/30"
                  : "text-muted")
              }
            >
              <FiSettings className="text-lg" aria-hidden />
            </span>
            <span className={acctOpen ? "text-brand-500" : "text-muted"}>
              Account
            </span>
          </button>
        </div>
      </div>
    </nav>

    {/* Delete-account confirmation modal */}
    {confirmOpen && (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={() => !deleting && setConfirmOpen(false)}
      >
        <div
          className="animate-fade w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-danger">
            <FiTrash2 aria-hidden />
            <h2 className="text-lg font-bold">Delete account</h2>
          </div>
          <p className="mt-2 text-sm text-muted">
            This permanently deletes your account and all your data. This{" "}
            <span className="font-semibold text-ink">cannot be undone.</span>
          </p>
          <label className="label mt-4">
            Type <span className="font-mono text-danger">DELETE NOW</span> to
            confirm
          </label>
          <input
            autoFocus
            className="input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE NOW"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button
              className="btn-outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              className="btn inline-flex items-center gap-1 bg-danger text-white hover:opacity-90"
              disabled={confirmText.trim() !== "DELETE NOW" || deleting}
              onClick={performDelete}
            >
              <FiTrash2 aria-hidden />
              {deleting ? "Deleting…" : "Delete account"}
            </button>
          </div>
        </div>
      </div>
    )}

    {bonusToast && (
      <div className="animate-fade fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-ok/40 bg-surface px-4 py-3 text-sm shadow-card">
        🎉 Profile complete! You unlocked{" "}
        <span className="font-semibold">3 free jobs</span> — analyze + tailor
        included.
      </div>
    )}
    </>
  );
}

function Card({
  title,
  sub,
  action,
  children,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SaveRow({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  return (
    <div className="mt-6 flex justify-end border-t border-line pt-4">
      <button
        className="btn-primary inline-flex items-center gap-1"
        onClick={onSave}
      >
        {saved ? (
          <>
            Saved <FiCheck aria-hidden />
          </>
        ) : (
          "Save changes"
        )}
      </button>
    </div>
  );
}

function Available({ label, value }: { label: string; value?: string }) {
  const has = Boolean(value && value.trim());
  return (
    <div className="rounded-lg border border-line px-3 py-2">
      <div className="label mb-0">{label}</div>
      <div
        className={
          "mt-0.5 flex items-center gap-1.5 text-sm " +
          (has ? "text-ink" : "text-muted")
        }
      >
        {has ? (
          <>
            <FiCheck className="shrink-0 text-ok" aria-hidden />
            <span className="truncate capitalize">{value}</span>
          </>
        ) : (
          <span className="italic">Not provided</span>
        )}
      </div>
    </div>
  );
}

const LEVEL_OPTIONS = [
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead / Exec" },
];

const SITUATION_OPTIONS = [
  { value: "student", label: "Student / new grad" },
  { value: "employed", label: "Employed, job-hunting" },
  { value: "unemployed", label: "Unemployed, job-hunting" },
  { value: "switcher", label: "Switching careers" },
  { value: "freelancer", label: "Freelancer / contractor" },
];

function SelectField({
  editing,
  label,
  value,
  onChange,
  options,
}: {
  editing: boolean;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const current = options.find((o) => o.value === value);
  return (
    <div>
      <label className="label">{label}</label>
      {editing ? (
        <select
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="text-sm capitalize">
          {current ? current.label : value?.trim() ? value : (
            <span className="italic text-muted">Not set</span>
          )}
        </div>
      )}
    </div>
  );
}

function EditableField({
  editing,
  label,
  value,
  onChange,
  textarea,
}: {
  editing: boolean;
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {editing ? (
        textarea ? (
          <textarea
            className="input min-h-[100px]"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            className="input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      ) : (
        <div className="whitespace-pre-wrap text-sm">
          {value?.trim() ? (
            value
          ) : (
            <span className="italic text-muted">Not set</span>
          )}
        </div>
      )}
    </div>
  );
}

function ReadRow({
  label,
  value,
  note,
}: {
  label: string;
  value?: string;
  note?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2 text-sm">
        {value?.trim() ? value : <span className="italic text-muted">—</span>}
        {note && <span className="text-[10px] text-muted">({note})</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

/** Placeholder for a labelled field while its data loads from the API. */
function SkeletonField() {
  return (
    <div>
      <Skeleton className="mb-1.5 h-3 w-24" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

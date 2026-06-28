"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Job, MasterProfile } from "./types";

const EMPTY_PROFILE: MasterProfile = {
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

type Store = {
  ready: boolean;
  profile: MasterProfile;
  jobs: Job[];
  setProfile: (p: MasterProfile) => void;
  addJob: (j: Job) => Promise<{ ok: boolean; error?: string }>;
  updateJob: (id: string, patch: Partial<Job>) => void;
  removeJob: (id: string) => void;
};

const Ctx = createContext<Store | null>(null);

function postJob(job: Job) {
  fetch("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(job),
  }).catch(() => {});
}

export function StoreProvider({
  scope,
  children,
}: {
  scope: string;
  children: React.ReactNode;
}) {
  const PROFILE_KEY = `meet.profile.v3.${scope}`;

  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState<MasterProfile>(EMPTY_PROFILE);
  const [jobs, setJobs] = useState<Job[]>([]);
  const jobsRef = useRef<Job[]>([]);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  // Load profile + jobs from the DB (with a fast localStorage paint first).
  useEffect(() => {
    try {
      const p = localStorage.getItem(PROFILE_KEY);
      if (p) setProfileState(JSON.parse(p));
    } catch {
      /* ignore */
    }
    Promise.all([
      fetch("/api/profile").then((r) => r.json()).catch(() => ({})),
      fetch("/api/jobs").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([pp, jj]) => {
        const d = pp?.profile;
        if (d) {
          setProfileState((prev) => ({
            ...prev,
            fullName: d.full_name || prev.fullName,
            title: d.title || prev.title,
            location: d.location || prev.location,
            summary: d.summary || prev.summary,
            photo: d.photo || prev.photo,
            skills: d.skills || prev.skills,
            experiences: d.experiences || prev.experiences,
            education: d.education || prev.education,
          }));
        }
        setJobs(Array.isArray(jj?.jobs) ? jj.jobs : []);
      })
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  useEffect(() => {
    if (ready) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, ready]);

  const setProfile = useCallback((p: MasterProfile) => setProfileState(p), []);

  const addJob = useCallback(async (j: Job) => {
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(j),
      });
      if (!res.ok) {
        let error = "failed";
        try {
          error = (await res.json()).error || error;
        } catch {
          /* ignore */
        }
        return { ok: false, error };
      }
      setJobs((prev) => [j, ...prev]);
      return { ok: true };
    } catch {
      return { ok: false, error: "network" };
    }
  }, []);

  const updateJob = useCallback((id: string, patch: Partial<Job>) => {
    const current = jobsRef.current.find((j) => j.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
    postJob(updated);
  }, []);

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    fetch(`/api/jobs?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
      () => {}
    );
  }, []);

  return (
    <Ctx.Provider
      value={{ ready, profile, jobs, setProfile, addJob, updateJob, removeJob }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

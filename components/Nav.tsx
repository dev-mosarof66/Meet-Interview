"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { Logo } from "./Logo";
import { authClient } from "@/lib/auth-client";
import {
  FiClipboard,
  FiBarChart2,
  FiUser,
  FiLogOut,
  FiTarget,
} from "react-icons/fi";

const links = [
  { href: "/pipeline", label: "Pipeline", Icon: FiClipboard },
  { href: "/practice", label: "Practice", Icon: FiTarget },
  { href: "/analytics", label: "Analytics", Icon: FiBarChart2 },
  { href: "/profile", label: "Profile", Icon: FiUser },
];

const topLinks = links.filter((l) => l.href !== "/profile");

export default function Nav() {
  const path = usePathname();
  const [name, setName] = useState("");

  useEffect(() => {
    authClient
      .getSession()
      .then(({ data }) => setName(data?.user?.name || ""))
      .catch(() => {});
  }, []);

  async function logout() {
    await authClient.signOut();
    window.location.assign("/");
  }


  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/pipeline">
            <Logo size={40} withWordmark />
          </Link>

          {/* Desktop links */}
          <nav className="hidden items-center gap-1 sm:flex">
            {topLinks.map((l) => {
              const active = path === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    "rounded-lg px-3 py-1.5 text-sm font-semibold transition " +
                    (active
                      ? "text-brand-700"
                      : "text-muted hover:text-ink")
                  }
                >
                  {l.label}
                </Link>
              );
            })}
            <div className="ml-2 flex items-center gap-2 border-l border-line pl-3">
              <ThemeToggle />
              <ProfileMenu name={name} onLogout={logout} />
            </div>
          </nav>

          {/* Mobile: toggle + account menu (page links go to bottom bar) */}
          <div className="flex items-center gap-1 sm:hidden">
            <ThemeToggle />
            <ProfileMenu name={name} onLogout={logout} />
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar — hidden on profile (it has its own) */}
      {path !== "/profile" && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-5xl items-stretch justify-around">
            {links.map((l) => {
              const active = path === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition " +
                    (active ? "text-brand-500" : "text-muted")
                  }
                >
                  <l.Icon className="text-lg" aria-hidden />
                  {l.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}

/** Avatar button that opens a dropdown with Profile + Log out. */
function ProfileMenu({
  name,
  onLogout,
}: {
  name: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = name
    ? name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 ring-2 ring-transparent transition hover:ring-brand-300"
      >
        {initials || <FiUser size={18} aria-hidden />}
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-surface shadow-card"
        >
          <div className="border-b border-line px-4 py-3">
            <div className="truncate text-sm font-semibold text-ink">
              {name || "Your account"}
            </div>
            <div className="text-xs text-muted">Signed in</div>
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-brand-100/60"
          >
            <FiUser aria-hidden /> Profile
          </Link>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-muted transition hover:bg-danger/10 hover:text-danger"
          >
            <FiLogOut aria-hidden /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

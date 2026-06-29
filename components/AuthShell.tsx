"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "./Nav";
import AiBanner from "./AiBanner";
import { StoreProvider } from "@/lib/store";
import { authClient } from "@/lib/auth-client";
import { Skeleton } from "./Skeleton";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  const [scope, setScope] = useState("anon");
  const [onboarded, setOnboarded] = useState(true);

  useEffect(() => {
    let active = true;
    authClient
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        if (data?.user) {
          setScope(data.user.email || data.user.id);
          setOnboarded(Boolean((data.user as { onboarded?: boolean }).onboarded));
          setState("in");
        } else {
          setState("out");
        }
      })
      .catch(() => active && setState("out"));
    return () => {
      active = false;
    };
  }, [path]);

  // Public pages render on their own, no nav/gate.
  if (path === "/") return <>{children}</>;

  // The live mock-interview "call" screen runs full-bleed: no nav/banner,
  // a wider canvas for the problem + chat split.
  const isInterview = /^\/prep\/[^/]+\/round\/[^/]+\/[^/]+$/.test(path);

  // Session still resolving: render the real (static) nav, skeleton only the page body.
  if (state === "loading")
    return (
      <>
        {!isInterview && <Nav />}
        <main
          className={
            "mx-auto space-y-4 px-4 pb-24 pt-6 " +
            (isInterview ? "max-w-7xl" : "max-w-5xl")
          }
        >
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </main>
      </>
    );

  if (state === "out") {
    if (typeof window !== "undefined") window.location.assign("/?auth=login");
    return null;
  }

  // First-run onboarding: render it full-screen (no nav), and force new users to it.
  if (path === "/onboarding") return <>{children}</>;
  if (!onboarded) {
    if (typeof window !== "undefined") window.location.assign("/onboarding");
    return null;
  }

  // Profile gets a fixed, non-scrolling shell on desktop (its panel scrolls itself).
  const isProfile = path === "/profile";

  return (
    <StoreProvider key={scope} scope={scope}>
      {!isInterview && <AiBanner />}
      {!isInterview && <Nav />}
      <main
        className={
          "mx-auto px-4 " +
          (isInterview
            ? "max-w-7xl pb-10 pt-4"
            : "max-w-5xl pt-6 " +
              (isProfile
                ? "pb-24 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:pb-0"
                : "pb-24"))
        }
      >
        {children}
      </main>
    </StoreProvider>
  );
}

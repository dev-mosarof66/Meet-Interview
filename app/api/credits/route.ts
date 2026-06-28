import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getCredits,
  maybeGrantBonus,
  profileCompleteness,
  PROFILE_BONUS,
} from "@/lib/credits";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({
      jobs: 0,
      claimed: false,
      percent: 0,
      complete: false,
      missing: [],
      justGranted: false,
      bonus: PROFILE_BONUS,
    });
  }
  const grant = await maybeGrantBonus(session.user.id);
  const credits = await getCredits(session.user.id);
  const comp = await profileCompleteness(session.user.id);
  return NextResponse.json({
    jobs: credits.jobs,
    claimed: credits.claimed,
    ...comp,
    justGranted: grant.granted,
    bonus: PROFILE_BONUS,
  });
}

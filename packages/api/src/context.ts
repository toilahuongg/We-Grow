import { auth } from "@we-grow/auth";
import { UserProfile } from "@we-grow/db/models/index";

export async function createContext(req: Request) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  let timezone = "Asia/Ho_Chi_Minh";
  if (session?.user?.id) {
    const profile = await UserProfile.findOne(
      { userId: session.user.id },
      { timezone: 1 },
    ).lean() as { timezone?: string } | null;
    if (profile?.timezone) {
      timezone = profile.timezone;
    }
  }

  return {
    session,
    timezone,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

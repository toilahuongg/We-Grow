import type { RouterClient } from "@orpc/server";

import { publicProcedure, protectedProcedure } from "../index";
import { habitsRouter } from "./habits";
import { groupsRouter } from "./groups";
import { gamificationRouter } from "./gamification";
import { notificationsRouter } from "./notifications";
import { profileRouter } from "./profile";
import { analyticsRouter } from "./analytics";
import { feedRouter } from "./feed";
import { telegramRouter } from "./telegram";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  habits: habitsRouter,
  groups: groupsRouter,
  gamification: gamificationRouter,
  notifications: notificationsRouter,
  profile: profileRouter,
  analytics: analyticsRouter,
  feed: feedRouter,
  telegram: telegramRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;

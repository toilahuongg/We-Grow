import type { RouterClient } from "@orpc/server";

import { publicProcedure, protectedProcedure } from "../index";
import { habitsRouter } from "./habits";
import { todosRouter } from "./todos";
import { groupsRouter } from "./groups";
import { gamificationRouter } from "./gamification";
import { notificationsRouter } from "./notifications";

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
  todos: todosRouter,
  groups: groupsRouter,
  gamification: gamificationRouter,
  notifications: notificationsRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;

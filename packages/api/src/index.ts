import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";
import { requireGroupRole } from "./middlewares/group-auth";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

export const groupMemberProcedure = requireGroupRole(["owner", "moderator", "member"]);
export const groupModeratorProcedure = requireGroupRole(["owner", "moderator"]);
export const groupOwnerProcedure = requireGroupRole(["owner"]);

import { ORPCError } from "@orpc/server";
import { GroupMember } from "@we-grow/db/models/index";

import { protectedProcedure } from "../index";

type GroupRole = "owner" | "moderator" | "member";

export function requireGroupRole(roles: GroupRole[]) {
  return protectedProcedure.middleware(async ({ context, next, input }) => {
    const { groupId } = input as { groupId: string };
    if (!groupId) {
      throw new ORPCError("BAD_REQUEST", { message: "groupId is required" });
    }

    const member = await GroupMember.findOne({
      groupId,
      userId: context.session.user.id,
      status: "active",
    });

    if (!member || !roles.includes(member.role as GroupRole)) {
      throw new ORPCError("FORBIDDEN", {
        message: "You do not have permission to perform this action",
      });
    }

    return next({
      context: {
        ...context,
        groupMember: member,
      },
    });
  });
}

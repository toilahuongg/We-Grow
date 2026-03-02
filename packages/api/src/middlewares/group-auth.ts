import { ORPCError } from "@orpc/server";
import { GroupMember } from "@we-grow/db/models/index";

type GroupRole = "owner" | "moderator" | "member";

export async function requireGroupRole(
  userId: string,
  groupId: string,
  roles: GroupRole[],
) {
  const member = await GroupMember.findOne({
    groupId,
    userId,
    status: "active",
  });

  if (!member || !roles.includes(member.role as GroupRole)) {
    throw new ORPCError("FORBIDDEN", {
      message: "You do not have permission to perform this action",
    });
  }

  return member;
}

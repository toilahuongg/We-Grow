import { Activity, GroupMember } from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";
import { getUserInfoMap } from "./user-lookup";

type ActivityType = "habit_completed" | "streak_milestone" | "level_up" | "all_habits_completed" | "member_joined";

export async function createActivity(
  groupId: string,
  userId: string,
  type: ActivityType,
  metadata: Record<string, unknown> = {},
) {
  try {
    const userInfo = await getUserInfoMap([userId]);
    const info = userInfo.get(userId);
    const userName = info?.name ?? "Unknown";
    const now = new Date();

    await Activity.create({
      _id: generateId(),
      groupId,
      userId,
      type,
      userName,
      userImage: info?.image ?? null,
      metadata,
      reactionCounts: {},
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    // Silent fail - activity creation should not block main operation
  }
}

export async function createActivityForUserGroups(
  userId: string,
  type: ActivityType,
  metadata: Record<string, unknown> = {},
) {
  try {
    const memberships = await GroupMember.find({ userId, status: "active" });
    for (const membership of memberships) {
      await createActivity(membership.groupId as string, userId, type, metadata);
    }
  } catch {
    // Silent fail
  }
}

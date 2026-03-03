import { User } from "@we-grow/db/models/index";

export async function getUserInfoMap(
  userIds: string[],
): Promise<Map<string, { name: string; image: string | null }>> {
  const uniqueIds = [...new Set(userIds)];
  const users = await User.find(
    { _id: { $in: uniqueIds } },
    { _id: 1, name: 1, image: 1 },
  );

  const map = new Map<string, { name: string; image: string | null }>();
  for (const user of users) {
    map.set(user._id as string, {
      name: user.name as string,
      image: (user.image as string | undefined) ?? null,
    });
  }
  return map;
}

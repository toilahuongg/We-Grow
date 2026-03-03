import mongoose from "mongoose";

export async function getUserInfoMap(
  userIds: string[],
): Promise<Map<string, { name: string; image: string | null }>> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return new Map();

  const db = mongoose.connection.db;
  if (!db) return new Map();

  // Better-Auth's MongoDB adapter stores _id as ObjectId, but
  // GroupMember.userId stores the hex string. Convert to ObjectId for query.
  const objectIds = uniqueIds.map((id) => {
    try {
      return new mongoose.Types.ObjectId(id);
    } catch {
      return id;
    }
  });

  const users = await db
    .collection("user")
    .find(
      { _id: { $in: objectIds } },
      { projection: { _id: 1, name: 1, image: 1 } },
    )
    .toArray();

  const map = new Map<string, { name: string; image: string | null }>();
  for (const user of users) {
    map.set(String(user._id), {
      name: user.name as string,
      image: (user.image as string | undefined) ?? null,
    });
  }
  return map;
}

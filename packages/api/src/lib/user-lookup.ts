import { client, ObjectId } from "@we-grow/db";

export async function getUserInfoMap(
  userIds: string[],
): Promise<Map<string, { name: string; image: string | null }>> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return new Map();

  // Better-Auth's MongoDB adapter stores _id as ObjectId, but
  // GroupMember.userId stores the hex string. Convert to ObjectId for query.
  const objectIds = uniqueIds.map((id) => {
    try {
      return new ObjectId(id);
    } catch {
      return id;
    }
  });

  const users = await client
    .collection("user")
    .find(
      { _id: { $in: objectIds } as any },
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

import { prisma } from "@/lib/prisma";

/**
 * Check if two users can directly chat without a chat request.
 * Currently allows:
 * - Linked Domme <-> Sub (via SubProfile.userId / linkedUserId)
 * - Friends (TODO: implement when friend system is built)
 */
export async function canDirectChat(
  userId: string,
  recipientId: string
): Promise<boolean> {
  if (userId === recipientId) return false;

  // Check if they are linked via SubProfile
  const linkedSub = await prisma.subProfile.findFirst({
    where: {
      OR: [
        { userId, linkedUserId: recipientId },
        { userId: recipientId, linkedUserId: userId },
      ],
    },
    select: { id: true },
  });

  if (linkedSub) return true;

  // TODO: Check friend relationship when friend system is built
  // const areFriends = await checkFriendship(userId, recipientId);
  // if (areFriends) return true;

  return false;
}

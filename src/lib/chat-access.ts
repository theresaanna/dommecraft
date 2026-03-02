import { prisma } from "@/lib/prisma";

/**
 * Check if two users can directly chat without a chat request.
 * Allows:
 * - Linked Domme <-> Sub (via SubProfile.userId / linkedUserId)
 * - Accepted friends (via Friendship)
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

  // Check if they are friends (ACCEPTED friendship)
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: recipientId },
        { requesterId: recipientId, addresseeId: userId },
      ],
      status: "ACCEPTED",
    },
    select: { id: true },
  });

  if (friendship) return true;

  return false;
}

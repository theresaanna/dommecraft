import { prisma } from "@/lib/prisma";
import type { GroupMemberRole } from "@prisma/client";

export async function isGroupMember(
  groupConversationId: string,
  userId: string
): Promise<{ isMember: boolean; role: GroupMemberRole | null }> {
  const member = await prisma.groupMember.findUnique({
    where: {
      groupConversationId_userId: { groupConversationId, userId },
    },
    select: { role: true },
  });
  return {
    isMember: !!member,
    role: member?.role ?? null,
  };
}

export async function isGroupAdmin(
  groupConversationId: string,
  userId: string
): Promise<boolean> {
  const { isMember, role } = await isGroupMember(groupConversationId, userId);
  return isMember && role === "ADMIN";
}

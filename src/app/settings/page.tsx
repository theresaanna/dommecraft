import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      avatarUrl: true,
      theme: true,
      calendarDefaultView: true,
      slug: true,
      showOnlineStatus: true,
      showReadReceipts: true,
      currency: true,
      notificationSound: true,
      pushNotifications: true,
      role: true,
      bio: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-24 pb-16">
      <SettingsClient
        userId={session.user.id}
        initialSettings={{
          name: user.name ?? "",
          email: user.email ?? "",
          avatarUrl: user.avatarUrl ?? null,
          theme: user.theme,
          currency: user.currency,
          calendarDefaultView: user.calendarDefaultView,
          slug: user.slug ?? "",
          showOnlineStatus: user.showOnlineStatus,
          showReadReceipts: user.showReadReceipts,
          notificationSound: user.notificationSound,
          pushNotifications: user.pushNotifications,
          bio: user.bio ?? "",
        }}
        userRole={user.role}
      />
    </div>
  );
}

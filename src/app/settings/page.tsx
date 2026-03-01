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
      role: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <SettingsClient
        initialSettings={{
          name: user.name ?? "",
          email: user.email ?? "",
          avatarUrl: user.avatarUrl ?? null,
          theme: user.theme,
          calendarDefaultView: user.calendarDefaultView,
        }}
        userRole={user.role}
      />
    </div>
  );
}

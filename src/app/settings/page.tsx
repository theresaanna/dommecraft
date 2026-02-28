import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Settings
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Signed in as {session.user.email}
      </p>
    </div>
  );
}

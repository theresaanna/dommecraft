import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CalendarPageClient from "./CalendarPageClient";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "DOMME") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <CalendarPageClient />
    </div>
  );
}

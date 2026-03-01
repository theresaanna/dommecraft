import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NewCalendarEventPageClient from "./NewCalendarEventPageClient";

export default async function NewCalendarEventPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "DOMME") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <NewCalendarEventPageClient />
    </div>
  );
}

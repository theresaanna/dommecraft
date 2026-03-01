import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LinkAccountForm from "./LinkAccountForm";

export default async function LinkPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Link Your Account
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Enter the invite code from your Domme to link your account.
      </p>
      <LinkAccountForm />
    </div>
  );
}

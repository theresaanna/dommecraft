import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-zinc-200 bg-white/40 backdrop-blur-sm p-8 dark:border-zinc-800 dark:bg-zinc-950/60">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Create your account
          </h1>
          <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
            Get started with DommeCraft
          </p>
        </div>
        <RegisterForm />
        <p className="text-center text-base text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

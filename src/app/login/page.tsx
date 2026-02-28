import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Sign in to DommeCraft
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Welcome back
          </p>
        </div>

        {params.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {params.error === "CredentialsSignin"
              ? "Invalid email or password."
              : "An error occurred. Please try again."}
          </div>
        )}

        <LoginForm callbackUrl={params.callbackUrl || "/dashboard"} />

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <a
            href="/register"
            className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          >
            Register
          </a>
        </p>
      </div>
    </div>
  );
}

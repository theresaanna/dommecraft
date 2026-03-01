"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const theme = session?.user?.theme ?? "SYSTEM";

  useEffect(() => {
    const root = document.documentElement;

    function applyTheme(mode: string) {
      if (mode === "DARK") {
        root.classList.add("dark");
      } else if (mode === "LIGHT") {
        root.classList.remove("dark");
      } else {
        // SYSTEM: follow OS preference
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        root.classList.toggle("dark", prefersDark);
      }
    }

    applyTheme(theme);

    if (theme === "SYSTEM") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle("dark", e.matches);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  return <>{children}</>;
}

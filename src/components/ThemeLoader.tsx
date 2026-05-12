"use client";

import { useEffect, useState } from "react";

export function ThemeLoader({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.appearance?.theme) {
          setTheme(data.settings.appearance.theme);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const html = document.documentElement;
    html.classList.remove("dark", "light");
    if (theme === "system") {
      html.classList.add(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } else {
      html.classList.add(theme);
    }
  }, [theme, loaded]);

  return <>{children}</>;
}
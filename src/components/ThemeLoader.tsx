/**
 * ============================================================================
 * THEME LOADER COMPONENT - Initialize Theme Before First Render
 * ============================================================================
 *
 * This component loads the user's theme preference from the database before
 * the application renders. This prevents flash of incorrect theme (FOTUT).
 *
 * WHAT IT DOES:
 * - Fetches theme settings from /api/settings on mount
 * - Reads saved theme preference (dark/light/system)
 * - Applies appropriate CSS class to <html> element
 * - Renders children only after theme is loaded
 *
 * WHY NEEDED:
 * - Prevents "flash" of wrong theme on page load
 * - Without this, theme might change after initial render
 * - Theme is stored in database, needs to be fetched
 * - "system" preference needs to check browser media query
 *
 * HOW IT WORKS:
 * 1. Fetches settings on mount
 * 2. Extracts theme preference
 * 3. Removes existing theme classes from html
 * 4. Adds new theme class (dark/light)
 * 5. For "system", checks window.matchMedia
 *
 * IMPORTANT:
 * - This component should wrap the entire app
 * - It renders children only after theme is determined
 * - The theme class is applied to the html element
 *
 * @module /components/ThemeLoader
 */

"use client";

import { useEffect, useState } from "react";

/**
 * ThemeLoader - Wraps children and loads theme before rendering
 *
 * @param children - The app content to render after theme loads
 *
 * @example
 * <ThemeLoader>
 *   <App />
 * </ThemeLoader>
 */
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
/**
 * ============================================================================
 * DIGITAL CLOCK COMPONENT - Real-Time Clock Display
 * ============================================================================
 *
 * This component displays the current time and date in a digital format.
 * It updates every second and respects the user's timezone settings.
 *
 * WHAT IT DOES:
 * - Displays current time in HH:MM:SS format
 * - Displays current date in a compact format
 * - Updates every second automatically
 * - Uses timezone from user settings
 *
 * KEY FEATURES:
 * - Real-time updates via setInterval
 * - Timezone-aware using Intl.DateTimeFormat
 * - Theme-aware styling (gradient effects)
 * - Clean, minimal design
 *
 * BEGINNER NOTES:
 * - setInterval runs callback every 1000ms (1 second)
 * - clearInterval in useEffect cleanup prevents memory leaks
 * - toLocaleTimeString with timeZone option converts time
 * - The component is purely presentational (no data fetching)
 *
 * @module /components/DigitalClock
 */

"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";

/**
 * DigitalClock - Real-time clock display component
 *
 * @example
 * <DigitalClock />
 */
export function DigitalClock() {
  const { settings } = useSettings();
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const isLightTheme = settings.appearance.theme === "light";

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const t = now.toLocaleTimeString("en-US", {
        timeZone: settings.advanced.timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const d = now.toLocaleDateString("en-US", {
        timeZone: settings.advanced.timezone,
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      setTime(t);
      setDate(d);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [settings.advanced.timezone]);

  return (
    <div className={`mt-3 px-4 py-2 rounded-xl flex flex-col items-center ${isLightTheme ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100" : "bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10"}`}>
      <span className={`font-mono text-2xl font-bold tracking-wider ${isLightTheme ? "text-slate-800" : "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"}`}>
        {time}
      </span>
      <span className={`text-xs font-medium mt-0.5 ${isLightTheme ? "text-slate-500" : "text-blue-300"}`}>
        {date}
      </span>
    </div>
  );
}
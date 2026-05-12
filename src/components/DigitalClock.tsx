"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";

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
"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";

export function DigitalClock() {
  const { settings } = useSettings();
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const t = new Date().toLocaleTimeString("en-US", {
        timeZone: settings.advanced.timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setTime(t);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [settings.advanced.timezone]);

  return (
    <div className="mt-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-lg">
      <span className="font-mono text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
        {time}
      </span>
    </div>
  );
}
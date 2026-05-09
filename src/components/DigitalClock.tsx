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
    <div className="fixed top-4 right-4 z-50 glass-dark px-3 py-1 rounded-lg">
      <span className="font-mono text-sm text-neutral-300">{time}</span>
    </div>
  );
}
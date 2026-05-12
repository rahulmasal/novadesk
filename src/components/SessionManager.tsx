"use client";

import { useEffect } from "react";
import { useTicketStore } from "@/lib/store";

export function SessionManager() {
  const { isAuthenticated, currentUserRole, authToken } = useTicketStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleBeforeUnload = () => {
      // Only logout admins on browser close
      if (currentUserRole === "ADMINISTRATOR" && authToken) {
        const data = JSON.stringify({ token: authToken, action: "logout" });
        navigator.sendBeacon("/api/auth/login", data);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isAuthenticated, currentUserRole, authToken]);

  return null;
}
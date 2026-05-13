"use client";

import { useEffect } from "react";
import { useTicketStore } from "@/lib/store";

export function SessionManager() {
  const { isAuthenticated } = useTicketStore();

  useEffect(() => {
    if (!isAuthenticated) return;
  }, [isAuthenticated]);

  return null;
}
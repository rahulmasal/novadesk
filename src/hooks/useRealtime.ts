/**
 * ============================================================================
 * USE REALTIME HOOK - Real-time Ticket Updates via Supabase Subscriptions
 * ============================================================================
 *
 * This hook subscribes to Supabase real-time changes for:
 * - Ticket updates (status, priority, assignment)
 * - New comments on tickets
 * - Ticket assignments
 *
 * WHY USE REAL-TIME?
 * - Instant UI updates without polling
 * - Better user experience
 * - Reduced server load from eliminated polling
 *
 * @module /hooks/useRealtime
 */

import { useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useTicketStore, Ticket } from "@/lib/store";

type RealtimeCallback = (payload: {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void;

/**
 * Hook for subscribing to real-time ticket updates
 */
export function useRealtimeTickets() {
  const { setTickets, tickets } = useTicketStore();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const handleTicketChange = useCallback(
    (payload: {
      eventType: "INSERT" | "UPDATE" | "DELETE";
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }) => {
      if (payload.eventType === "INSERT") {
        // New ticket - add to list
        const newTicket = payload.new as unknown as Ticket;
        setTickets([newTicket, ...tickets.filter((t) => t.id !== newTicket.id)]);
      } else if (payload.eventType === "UPDATE") {
        // Updated ticket - update in list
        const updatedTicket = payload.new as unknown as Ticket;
        setTickets(
          tickets.map((t) =>
            t.id === updatedTicket.id ? updatedTicket : t
          )
        );
      } else if (payload.eventType === "DELETE") {
        // Deleted ticket - remove from list
        const deletedId = (payload.old as { id: string }).id;
        setTickets(tickets.filter((t) => t.id !== deletedId));
      }
    },
    [setTickets, tickets]
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.log("Supabase not configured, skipping real-time subscriptions");
      return;
    }

    // Subscribe to ticket changes
    subscriptionRef.current = supabase
      .channel("tickets-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Ticket",
        },
        (payload) => {
          handleTicketChange({
            eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown>,
          });
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [handleTicketChange]);
}

/**
 * Hook for subscribing to real-time comments on a specific ticket
 */
export function useRealtimeComments(ticketId: string | null) {
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const onCommentChangeRef = useRef<RealtimeCallback | null>(null);

  const subscribe = useCallback(
    (callback: RealtimeCallback) => {
      onCommentChangeRef.current = callback;
    },
    []
  );

  useEffect(() => {
    if (!ticketId || !isSupabaseConfigured()) return;

    // Subscribe to comment changes for this ticket
    subscriptionRef.current = supabase
      .channel(`comments-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Comment",
          filter: `ticketId=eq.${ticketId}`,
        },
        (payload) => {
          if (onCommentChangeRef.current) {
            onCommentChangeRef.current({
              eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
              new: payload.new as Record<string, unknown>,
              old: payload.old as Record<string, unknown>,
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [ticketId]);

  return { subscribe };
}

/**
 * Hook for subscribing to SLA escalation events
 */
export function useRealtimeSlaAlerts() {
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const alertCallbackRef = useRef<((sla: { ticketId: string; level: string }) => void) | null>(null);

  const onSlaAlert = useCallback(
    (callback: (sla: { ticketId: string; level: string }) => void) => {
      alertCallbackRef.current = callback;
    },
    []
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    subscriptionRef.current = supabase
      .channel("sla-alerts")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "SlaEscalation",
        },
        (payload) => {
          if (alertCallbackRef.current && payload.new) {
            const newSla = payload.new as { ticketId: string; breachLevel: string };
            if (newSla.breachLevel === "WARNING" || newSla.breachLevel === "BREACHED") {
              alertCallbackRef.current({
                ticketId: newSla.ticketId,
                level: newSla.breachLevel,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  return { onSlaAlert };
}

/**
 * Generic real-time subscription hook
 */
export function useRealtimeSubscription<T>(
  table: string,
  filter?: string,
  onChange?: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: T;
    old: T;
  }) => void
) {
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || !onChange) return;

    const channel = supabase
      .channel(`${table}-realtime-${filter || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter && { filter }),
        },
        (payload) => {
          onChange({
            eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            new: payload.new as T,
            old: payload.old as T,
          });
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [table, filter, onChange]);
}
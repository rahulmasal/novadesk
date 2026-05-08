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
 * Subscribes to real-time INSERT/UPDATE/DELETE events on the tickets table via Supabase.
 * Automatically updates the Zustand store's ticket list so the UI stays in sync.
 *
 * @returns void (side-effect only: mutates the global ticket store)
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
 * Subscribes to real-time comment changes for a specific ticket.
 * Provides a `subscribe` method that callers use to register a callback
 * invoked on every INSERT / UPDATE / DELETE on the ticket's comments.
 *
 * @param ticketId - The ID of the ticket to listen for comment changes on (pass null to skip)
 * @returns An object with a `subscribe` method to register a RealtimeCallback
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
 * Subscribes to real-time SLA escalation alert events.
 * Fires a callback whenever an SLA record transitions to WARNING or BREACHED level.
 *
 * @returns An object with an `onSlaAlert` method to register a callback for SLA breach events
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
 * Generic real-time subscription hook for any Supabase table.
 * Opens a channel scoped to the given table and optional filter, calling
 * `onChange` for every INSERT, UPDATE, or DELETE event.
 *
 * @param table - The database table name to subscribe to
 * @param filter - Optional filter string (e.g. "ticketId=eq.123") to narrow which rows trigger events
 * @param onChange - Callback fired on INSERT / UPDATE / DELETE events, receiving the typed payload
 * @returns void (side-effect only; cleans up the channel on unmount or dependency change)
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
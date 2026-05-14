/**
 * ============================================================================
 * ACTIVITY FEED COMPONENT - Timeline of Recent Ticket Activity
 * ============================================================================
 *
 * This component displays a chronological feed of recent ticket activities
 * and events in the system. It provides a visual timeline of what's happening.
 *
 * WHAT IT DOES:
 * - Displays a timeline of recent ticket activities
 * - Shows activity messages with relative timestamps
 * - Visual timeline with connecting line and icons
 * - Automatically updates when activities are added to store
 *
 * KEY FEATURES:
 * - Visual timeline with vertical connecting line
 * - Relative time display (e.g., "5 minutes ago")
 * - Icon indicators for each activity
 * - Empty state message when no activities exist
 *
 * BEGINNER NOTES:
 * - Activities come from the global Zustand store
 * - formatDistanceToNow from date-fns for relative times
 * - parseISO converts ISO strings back to Date objects
 * - Timeline line is a CSS pseudo-element, not a component
 *
 * @module /components/ActivityFeed
 */

"use client";

import { useTicketStore } from "@/lib/store";
import { useSettings } from "@/contexts/SettingsContext";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Activity, MessageSquare } from "lucide-react";

/**
 * ActivityFeed - Timeline component showing recent ticket activities
 *
 * @example
 * <ActivityFeed />
 */
export function ActivityFeed() {
   const activities = useTicketStore((state) => state.activities);
   const { settings } = useSettings();
   const isLightTheme = settings.appearance.theme === "light";

  return (
    <div className={`${isLightTheme ? "glass-card" : "glass-dark"} rounded-2xl p-5 mt-4 flex flex-col h-full min-h-[400px]`}>
      <div className="flex items-center gap-2 mb-6">
        <Activity className={`w-5 h-5 ${isLightTheme ? "text-blue-600" : "text-blue-400"}`} />
        <h3 className={`text-lg font-semibold ${isLightTheme ? "text-heading" : "text-white"}`}>Activity Feed</h3>
      </div>
      
      <div className="flex-1 relative">
        <div className={`absolute top-2 bottom-0 left-[11px] w-[2px] ${isLightTheme ? "bg-slate-200" : "bg-white/5"}`} />
        
        <div className="space-y-6">
          {activities.map((activity) => (
            <div key={activity.id} className="relative flex gap-4">
              <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isLightTheme ? "bg-white border border-slate-200" : "bg-neutral-900 border border-white/20"}`}>
                <MessageSquare className={`w-3 h-3 ${isLightTheme ? "text-slate-500" : "text-neutral-400"}`} />
              </div>
              <div>
                <p className={`text-sm ${isLightTheme ? "text-slate-700" : "text-neutral-200"}`}>{activity.message}</p>
                <p className={`text-xs mt-1 ${isLightTheme ? "text-slate-400" : "text-neutral-500"}`}>
                  {formatDistanceToNow(parseISO(activity.timestamp))} ago
                </p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <p className={`text-sm text-center py-8 ${isLightTheme ? "text-slate-400" : "text-neutral-500"}`}>No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}

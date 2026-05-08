"use client";

import { useTicketStore } from "@/lib/store";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Activity, MessageSquare } from "lucide-react";

/**
 * ActivityFeed - Recent activity feed showing latest ticket comments, status changes, and system events
 */
export function ActivityFeed() {
   const activities = useTicketStore((state) => state.activities);

  return (
    <div className="glass-dark rounded-2xl p-5 mt-4 flex flex-col h-full min-h-[400px]">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Activity Feed</h3>
      </div>
      
      <div className="flex-1 relative">
        <div className="absolute top-2 bottom-0 left-[11px] w-[2px] bg-white/5" />
        
        <div className="space-y-6">
          {activities.map((activity) => (
            <div key={activity.id} className="relative flex gap-4">
              <div className="relative z-10 w-6 h-6 rounded-full bg-neutral-900 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="w-3 h-3 text-neutral-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-200">{activity.message}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {formatDistanceToNow(parseISO(activity.timestamp))} ago
                </p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-8">No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}

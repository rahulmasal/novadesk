/**
 * ============================================================================
 * SCORECARDS COMPONENT - Dashboard KPI Metric Cards
 * ============================================================================
 *
 * This component displays key performance indicators (KPIs) for the dashboard.
 * Each card shows a metric with an icon and visual styling.
 *
 * WHAT IT DOES:
 * - Calculates and displays 4 key metrics from ticket data:
 *   1. Total Tickets - count of all tickets in the system
 *   2. Open Tickets - tickets that are not RESOLVED or CLOSED
 *   3. SLA Violated - tickets past their due date (excluding resolved/closed)
 *   4. Avg Resolution - average time to resolve tickets in hours
 *
 * KEY FEATURES:
 * - Real-time metric calculation from Zustand store
 * - Visual indicators (urgent glow effect) for critical metrics
 * - Theme-aware styling for both light and dark modes
 * - Hover animation for interactive feedback
 *
 * BEGINNER NOTES:
 * - Uses useTicketStore to access ticket data from global state
 * - Filters tickets to calculate metrics (open, overdue, etc.)
 * - Date comparisons use new Date() for current time
 * - Average calculation: sum(resolution times) / count
 *
 * @module /components/Scorecards
 */

import { useTicketStore } from "@/lib/store";
import { useSettings } from "@/contexts/SettingsContext";
import { TicketIcon, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Scorecards - Dashboard KPI scorecards component
 *
 * Displays key metrics:
 * - Total Tickets: All tickets in system
 * - Open Tickets: Active, unresolved tickets
 * - SLA Violated: Overdue tickets past their deadline
 * - Avg Resolution: Average time to close tickets (in hours)
 *
 * @example
 * <Scorecards />
 */
export function Scorecards() {
  const tickets = useTicketStore((state) => state.tickets);
  const { settings } = useSettings();
  const isLightTheme = settings.appearance.theme === "light";

  const total = tickets.length;
  const open = tickets.filter((t) => t.status !== "CLOSED" && t.status !== "RESOLVED").length;
  const overdue = tickets.filter(
    (t) => new Date(t.dueDate) < new Date() && t.status !== "CLOSED" && t.status !== "RESOLVED"
  ).length;

  const resolved = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED");
  const avgTimeMs =
    resolved.reduce((acc, t) => acc + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()), 0) /
    (resolved.length || 1);
  const avgHours = (avgTimeMs / (1000 * 60 * 60)).toFixed(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card title="Total Tickets" value={total} icon={<TicketIcon className={`w-5 h-5 ${isLightTheme ? "text-blue-600" : "text-blue-400"}`} />} isLight={isLightTheme} />
      <Card title="Open Tickets" value={open} icon={<AlertTriangle className={`w-5 h-5 ${isLightTheme ? "text-amber-600" : "text-amber-400"}`} />} isLight={isLightTheme} />
      <Card title="SLA Violated" value={overdue} icon={<Clock className={`w-5 h-5 ${isLightTheme ? "text-red-600" : "text-red-400"}`} />} urgent={overdue > 0} isLight={isLightTheme} />
      <Card title="Avg Resolution" value={`${avgHours}h`} icon={<CheckCircle2 className={`w-5 h-5 ${isLightTheme ? "text-emerald-600" : "text-emerald-400"}`} />} isLight={isLightTheme} />
    </div>
  );
}

function Card({ title, value, icon, urgent, isLight }: { title: string; value: string | number; icon: React.ReactNode; urgent?: boolean; isLight: boolean }) {
  return (
    <div className={`p-5 rounded-2xl flex items-center justify-between transition-all duration-300 hover:-translate-y-1 ${urgent ? "glow-urgent" : ""} ${isLight ? "glass-card border-blue-200" : "glass-dark"}`}>
      <div>
        <p className={`text-sm font-medium mb-1 ${isLight ? "text-body" : "text-neutral-400"}`}>{title}</p>
        <p className={`text-3xl font-bold ${isLight ? "text-heading" : "text-white"}`}>{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${isLight ? "bg-blue-50 border border-blue-100" : "bg-white/5 border border-white/10"}`}>
        {icon}
      </div>
    </div>
  );
}

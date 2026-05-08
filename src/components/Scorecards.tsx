import { useTicketStore } from "@/lib/store";
import { TicketIcon, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Scorecards - KPI scorecards displaying total tickets, open tickets, overdue count, and avg resolution time
 */
export function Scorecards() {
  const tickets = useTicketStore((state) => state.tickets);

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
      <Card title="Total Tickets" value={total} icon={<TicketIcon className="w-5 h-5 text-blue-400" />} />
      <Card title="Open Tickets" value={open} icon={<AlertTriangle className="w-5 h-5 text-amber-400" />} />
      <Card title="SLA Violated" value={overdue} icon={<Clock className="w-5 h-5 text-red-400" />} urgent={overdue > 0} />
      <Card title="Avg Resolution" value={`${avgHours}h`} icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} />
    </div>
  );
}

function Card({ title, value, icon, urgent }: { title: string; value: string | number; icon: React.ReactNode; urgent?: boolean }) {
  return (
    <div className={`p-5 rounded-2xl glass-dark flex items-center justify-between transition-all duration-300 hover:-translate-y-1 ${urgent ? "glow-urgent" : ""}`}>
      <div>
        <p className="text-sm text-neutral-400 font-medium mb-1">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
        {icon}
      </div>
    </div>
  );
}

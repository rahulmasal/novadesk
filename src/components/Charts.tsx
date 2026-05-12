"use client";

import { useTicketStore } from "@/lib/store";
import { useSettings } from "@/contexts/SettingsContext";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

/**
 * Charts - Dashboard charts showing ticket volume trends (line chart) and priority distribution (pie chart)
 */
export function Charts() {
  const tickets = useTicketStore((state) => state.tickets);
  const { settings } = useSettings();
  const isLightTheme = settings.appearance.theme === "light";

  // Group tickets by creation date for line chart
  const volumeData = tickets
    .reduce<{ date: string; tickets: number }[]>((acc, t) => {
      const date = format(parseISO(t.createdAt), "MMM dd");
      const existing = acc.find((d) => d.date === date);
      if (existing) {
        existing.tickets += 1;
      } else {
        acc.push({ date, tickets: 1 });
      }
      return acc;
    }, [])
    .reverse();

  // Group by category for doughnut chart
  const categoryData = tickets.reduce<{ name: string; value: number }[]>(
    (acc, t) => {
      const existing = acc.find((d) => d.name === t.category);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: t.category, value: 1 });
      }
      return acc;
    },
    [],
  );

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      <div className={`lg:col-span-2 p-5 rounded-2xl ${isLightTheme ? "bg-white/70 border border-gray-200" : "glass-dark"} flex flex-col h-[300px] min-w-0`}>
        <h3 className={`text-lg font-semibold mb-4 ${isLightTheme ? "text-gray-900" : "text-white"}`}>Ticket Volume</h3>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={volumeData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isLightTheme ? "#ccc" : "#333"}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke={isLightTheme ? "#6b7280" : "#888"}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={isLightTheme ? "#6b7280" : "#888"}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isLightTheme ? "#ffffff" : "#171717",
                  border: isLightTheme ? "1px solid #e5e7eb" : "1px solid #333",
                  borderRadius: "8px",
                  color: isLightTheme ? "#171717" : "#ffffff",
                }}
              />
              <Line
                type="monotone"
                dataKey="tickets"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "#3b82f6",
                  strokeWidth: 2,
                  stroke: isLightTheme ? "#ffffff" : "#171717",
                }}
                activeDot={{ r: 6 }}
              />
</LineChart>
           </ResponsiveContainer>
         </div>
       </div>

      <div className={`p-5 rounded-2xl ${isLightTheme ? "bg-white/70 border border-gray-200" : "glass-dark"} flex flex-col h-[300px] min-w-0`}>
        <h3 className={`text-lg font-semibold mb-4 ${isLightTheme ? "text-gray-900" : "text-white"}`}>
          Category Distribution
        </h3>
<div className="flex-1 w-full flex items-center justify-center relative">
           <ResponsiveContainer width="100%" height={250}>
             <PieChart>
               <Pie
                 data={categoryData}
                 cx="50%"
                 cy="50%"
                 innerRadius={60}
                 outerRadius={80}
                 paddingAngle={5}
                 dataKey="value"
                 stroke="none"
               >
                 {categoryData.map((entry, index) => (
                   <Cell
                     key={`cell-${index}`}
                     fill={COLORS[index % COLORS.length]}
                   />
                 ))}
               </Pie>
               <Tooltip
                 contentStyle={{
                   backgroundColor: isLightTheme ? "#ffffff" : "#171717",
                   border: isLightTheme ? "1px solid #e5e7eb" : "none",
                   borderRadius: "8px",
                   color: isLightTheme ? "#171717" : "#ffffff",
                 }}
               />
             </PieChart>
           </ResponsiveContainer>
           <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
             <span className={`text-3xl font-bold ${isLightTheme ? "text-gray-900" : "text-white"}`}>
               {tickets.length}
             </span>
             <span className={`text-xs ${isLightTheme ? "text-gray-500" : "text-neutral-400"}`}>Total</span>
           </div>
         </div>
      </div>
    </div>
  );
}
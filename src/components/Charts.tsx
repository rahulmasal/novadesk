"use client";

import { useTicketStore } from "@/lib/store";
import { format, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

export function Charts() {
  const tickets = useTicketStore((state) => state.tickets);

  // Group tickets by creation date for line chart
  const volumeData = tickets.reduce((acc: any[], t) => {
    const date = format(parseISO(t.createdAt), "MMM dd");
    const existing = acc.find((d) => d.date === date);
    if (existing) {
      existing.tickets += 1;
    } else {
      acc.push({ date, tickets: 1 });
    }
    return acc;
  }, []).reverse();

  // Group by category for doughnut chart
  const categoryData = tickets.reduce((acc: any[], t) => {
    const existing = acc.find((d) => d.name === t.category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: t.category, value: 1 });
    }
    return acc;
  }, []);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      <div className="lg:col-span-2 p-5 rounded-2xl glass-dark flex flex-col">
        <h3 className="text-lg font-semibold text-white mb-4">Ticket Volume</h3>
        <div className="flex-1 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#171717", border: "1px solid #333", borderRadius: "8px" }}
              />
              <Line type="monotone" dataKey="tickets" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#171717" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="p-5 rounded-2xl glass-dark flex flex-col">
        <h3 className="text-lg font-semibold text-white mb-4">Category Distribution</h3>
        <div className="flex-1 min-h-[250px] flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
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
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#171717", border: "none", borderRadius: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
            <span className="text-3xl font-bold text-white">{tickets.length}</span>
            <span className="text-xs text-neutral-400">Total</span>
          </div>
        </div>
      </div>
    </div>
  );
}

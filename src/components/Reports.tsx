"use client";

import { useState } from "react";
import { useTicketStore } from "@/lib/store";
import {
  Download,
  Calendar,
  FileText,
  BarChart3,
  Users,
  Laptop,
} from "lucide-react";

interface ReportTicket {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  status: string;
  createdBy: string;
  assignedTo?: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  username: string;
  hostname: string;
  laptopSerial: string;
  department: string;
  userInfo: {
    id: string;
    email: string;
    name: string;
    role: string;
    department: string;
  };
}

interface ReportData {
  tickets: ReportTicket[];
  summary: {
    totalTickets: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    byDepartment: Record<string, number>;
  };
  generatedAt: string;
  dateRange: {
    from: string;
    to: string;
  };
}

/**
 * Reports - Report generation interface with date range picker, export buttons (CSV/PDF), and results table
 */
export function Reports() {
  const { authToken, currentUserRole } = useTicketStore();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUserRole === "ADMINISTRATOR";

  const generateReport = async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);

      const res = await fetch(`/api/reports?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        alert("Failed to generate report");
      }
    } catch (e) {
      console.error("Failed to generate report:", e);
      alert("Error generating report");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const headers = [
      "Ticket ID",
      "Title",
      "Description",
      "Priority",
      "Category",
      "Status",
      "Created By",
      "Username",
      "Hostname",
      "Laptop Serial",
      "Department",
      "Created At",
      "Due Date",
    ];

    const rows = reportData.tickets.map((t) => [
      t.id,
      t.title,
      t.description,
      t.priority,
      t.category,
      t.status,
      t.userInfo.email,
      t.username,
      t.hostname,
      t.laptopSerial,
      t.department,
      t.createdAt,
      t.dueDate,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="glass-dark p-6 rounded-2xl text-center">
          <p className="text-red-400">
            Access denied. Administrator privileges required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">
          Reports
        </h2>
        <p className="text-neutral-400 mt-1">
          Generate and export ticket reports
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="glass-dark rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">
          Generate Report
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-dark rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {reportData.summary.totalTickets}
                  </p>
                  <p className="text-sm text-neutral-400">Total Tickets</p>
                </div>
              </div>
            </div>
            <div className="glass-dark rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {Object.keys(reportData.summary.byDepartment).length}
                  </p>
                  <p className="text-sm text-neutral-400">Departments</p>
                </div>
              </div>
            </div>
            <div className="glass-dark rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Laptop className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {reportData.summary.byCategory.Hardware || 0}
                  </p>
                  <p className="text-sm text-neutral-400">Hardware Issues</p>
                </div>
              </div>
            </div>
            <div className="glass-dark rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {reportData.summary.byStatus.New || 0}
                  </p>
                  <p className="text-sm text-neutral-400">New Tickets</p>
                </div>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export to CSV
            </button>
          </div>

          {/* Tickets Table */}
          <div className="glass-dark rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-neutral-400 text-sm">
                    <th className="p-4 font-medium">User</th>
                    <th className="p-4 font-medium">Ticket</th>
                    <th className="p-4 font-medium">Device Info</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-white/5">
                      <td className="p-4">
                        <div>
                          <p className="text-white font-medium">
                            {ticket.userInfo.name}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {ticket.userInfo.email}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {ticket.department}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-white font-medium">
                            {ticket.title}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {ticket.category}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              ticket.priority === "URGENT"
                                ? "bg-red-500/20 text-red-400"
                                : ticket.priority === "HIGH"
                                  ? "bg-orange-500/20 text-orange-400"
                                  : ticket.priority === "MEDIUM"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            {ticket.priority}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-white text-sm">
                            {ticket.hostname}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {ticket.laptopSerial}
                          </p>
                          <p className="text-xs text-neutral-500">
                            User: {ticket.username}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                          <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                              ticket.status === "NEW"
                                ? "bg-blue-500/20 text-blue-400"
                                : ticket.status === "IN_PROGRESS"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : ticket.status === "RESOLVED"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-neutral-500/20 text-neutral-400"
                            }`}
                        >
                          {ticket.status}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-400 text-sm">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

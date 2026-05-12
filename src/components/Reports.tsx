"use client";

import { useState } from "react";
import { useTicketStore } from "@/lib/store";
import { useSettings } from "@/contexts/SettingsContext";
import {
  Download,
  Calendar,
  FileText,
  BarChart3,
  Users,
  Laptop,
  Filter,
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

type ReportType = "all" | "status" | "priority" | "category" | "department";

interface ColumnOption {
  id: string;
  label: string;
}

const AVAILABLE_COLUMNS: ColumnOption[] = [
  { id: "id", label: "Ticket ID" },
  { id: "title", label: "Title" },
  { id: "description", label: "Description" },
  { id: "priority", label: "Priority" },
  { id: "status", label: "Status" },
  { id: "category", label: "Category" },
  { id: "createdBy", label: "Created By" },
  { id: "assignedTo", label: "Assigned To" },
  { id: "department", label: "Department" },
  { id: "username", label: "Username" },
  { id: "hostname", label: "Hostname" },
  { id: "laptopSerial", label: "Laptop Serial" },
  { id: "createdAt", label: "Created At" },
  { id: "dueDate", label: "Due Date" },
];

/**
 * Reports - Report generation interface with date range picker, export buttons (CSV/PDF), and results table
 */
export function Reports() {
  const { authToken, currentUserRole } = useTicketStore();
  const { settings } = useSettings();
  const isLightTheme = settings.appearance.theme === "light";
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("all");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "id", "title", "status", "priority", "category", "department", "createdAt",
  ]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  const isAdmin = currentUserRole === "ADMINISTRATOR";

  const generateReport = async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      params.append("type", reportType);

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

  const toggleColumn = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const getColumnValue = (ticket: ReportTicket, columnId: string) => {
    switch (columnId) {
      case "id":
        return ticket.id.substring(0, 8);
      case "title":
        return ticket.title;
      case "description":
        return ticket.description;
      case "priority":
        return ticket.priority;
      case "status":
        return ticket.status;
      case "category":
        return ticket.category;
      case "createdBy":
        return ticket.userInfo.email;
      case "assignedTo":
        return ticket.assignedTo || "Unassigned";
      case "department":
        return ticket.department;
      case "username":
        return ticket.username;
      case "hostname":
        return ticket.hostname;
      case "laptopSerial":
        return ticket.laptopSerial;
      case "createdAt":
        return new Date(ticket.createdAt).toLocaleDateString();
      case "dueDate":
        return ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : "N/A";
      default:
        return "";
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const headers = selectedColumns.map((colId) => {
      const col = AVAILABLE_COLUMNS.find((c) => c.id === colId);
      return col ? col.label : colId;
    });

    const rows = reportData.tickets.map((ticket) =>
      selectedColumns.map((colId) => getColumnValue(ticket, colId))
    );

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const reportTypeLabel = reportType === "all" ? "tickets" : `${reportType}-tickets`;
    a.download = `tickets-report-${reportTypeLabel}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className={`${isLightTheme ? "glass-card" : "glass-dark"} p-6 rounded-2xl text-center`}>
          <p className="text-red-400">
            Access denied. Administrator privileges required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Date Range Selector */}
      <div className={`${isLightTheme ? "glass-card" : "glass-dark"} rounded-2xl p-6 mb-8`}>
        <h3 className="text-lg font-semibold text-white mb-4">
          Generate Report
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
            >
              <option value="all">All Tickets</option>
              <option value="status">By Status</option>
              <option value="priority">By Priority</option>
              <option value="category">By Category</option>
              <option value="department">By Department</option>
            </select>
          </div>
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
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <FileText className="w-5 h-5" />
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
            <div className={`${isLightTheme ? "glass-card" : "glass-dark"} p-6 rounded-2xl`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isLightTheme ? "bg-blue-100" : "bg-blue-500/20"}`}>
                  <BarChart3 className={`w-6 h-6 ${isLightTheme ? "text-blue-600" : "text-blue-400"}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isLightTheme ? "text-heading" : "text-white"}`}>
                    {reportData.summary.totalTickets}
                  </p>
                  <p className={`text-sm ${isLightTheme ? "text-body" : "text-neutral-400"}`}>Total Tickets</p>
                </div>
              </div>
            </div>
            <div className={`${isLightTheme ? "glass-card" : "glass-dark"} p-6 rounded-2xl`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isLightTheme ? "bg-emerald-100" : "bg-emerald-500/20"}`}>
                  <Users className={`w-6 h-6 ${isLightTheme ? "text-emerald-600" : "text-emerald-400"}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isLightTheme ? "text-heading" : "text-white"}`}>
                    {Object.keys(reportData.summary.byDepartment).length}
                  </p>
                  <p className={`text-sm ${isLightTheme ? "text-body" : "text-neutral-400"}`}>Departments</p>
                </div>
              </div>
            </div>
            <div className={`${isLightTheme ? "glass-card" : "glass-dark"} p-6 rounded-2xl`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isLightTheme ? "bg-purple-100" : "bg-purple-500/20"}`}>
                  <Laptop className={`w-6 h-6 ${isLightTheme ? "text-purple-600" : "text-purple-400"}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isLightTheme ? "text-heading" : "text-white"}`}>
                    {reportData.summary.byCategory.Hardware || 0}
                  </p>
                  <p className={`text-sm ${isLightTheme ? "text-body" : "text-neutral-400"}`}>Hardware Issues</p>
                </div>
              </div>
            </div>
            <div className={`${isLightTheme ? "glass-card" : "glass-dark"} p-6 rounded-2xl`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isLightTheme ? "bg-amber-100" : "bg-amber-500/20"}`}>
                  <Calendar className={`w-6 h-6 ${isLightTheme ? "text-amber-600" : "text-amber-400"}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isLightTheme ? "text-heading" : "text-white"}`}>
                    {reportData.summary.byStatus.New || 0}
                  </p>
                  <p className={`text-sm ${isLightTheme ? "text-body" : "text-neutral-400"}`}>New Tickets</p>
                </div>
              </div>
            </div>
          </div>

          {/* Export and Column Selector */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors"
            >
              <Filter className="w-5 h-5" />
              Column Selection
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
            >
              <Download className="w-5 h-5" />
              Export to CSV
            </button>
          </div>

          {/* Column Selector Panel */}
          {showColumnSelector && (
            <div className={`${isLightTheme ? "glass-card" : "glass-dark"} p-4 mb-4`}>
              <h4 className={`font-medium mb-3 ${isLightTheme ? "text-heading" : "text-white"}`}>Select Columns</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {AVAILABLE_COLUMNS.map((column) => (
                  <label
                    key={column.id}
                    className={`flex items-center gap-2 text-sm cursor-pointer ${isLightTheme ? "text-body hover:text-heading" : "text-neutral-300 hover:text-white"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(column.id)}
                      onChange={() => toggleColumn(column.id)}
                      className={`rounded ${isLightTheme ? "border-slate-300 bg-white" : "border-white/20 bg-black/40"}`}
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tickets Table */}
          <div className={`${isLightTheme ? "glass-card" : "glass-dark"} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className={`border-b text-sm ${isLightTheme ? "table-header bg-slate-50" : "bg-white/[0.02] border-white/5 text-neutral-400"}`}>
                    {selectedColumns.map((colId) => {
                      const col = AVAILABLE_COLUMNS.find((c) => c.id === colId);
                      return (
                        <th key={colId} className="p-4 font-medium">
                          {col ? col.label : colId}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {reportData.tickets.map((ticket) => (
                    <tr key={ticket.id} className={`border-b ${isLightTheme ? "hover:bg-slate-50 border-slate-200" : "border-white/5"}`}>
                      {selectedColumns.map((colId) => (
                        <td key={colId} className={`p-4 text-sm ${isLightTheme ? "text-body" : "text-neutral-300"}`}>
                          {getColumnValue(ticket, colId)}
                        </td>
                      ))}
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

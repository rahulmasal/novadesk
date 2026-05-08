"use client";

import { useState, useEffect } from "react";
import { useTicketStore, Role } from "@/lib/store";
import { UserPlus, Upload, Trash2, Edit2, X, Check, Search, ChevronLeft, ChevronRight, Lock } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  createdAt: string;
}

/**
 * UserManagement - Admin user management with search, pagination, inline editing, and CSV import
 */
export function UserManagement() {
  const { authToken, currentUserRole, currentUser } = useTicketStore();
  
  // State
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // New user form state
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    role: "END_USER" as Role,
    department: "",
  });

  const [csvData, setCsvData] = useState("");
  const [importResult, setImportResult] = useState<{ total: number; imported: number; skipped: number; errors?: string[] } | null>(null);

  const [resetPasswordUser, setResetPasswordUser] = useState<UserData | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetPasswordMsg, setResetPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Allow both Administrators and Agents to access user management
  const canAccess = currentUserRole === "ADMINISTRATOR" || currentUserRole === "AGENT";
  // Only Administrators can create/edit/delete users
  const canModify = currentUserRole === "ADMINISTRATOR";

  useEffect(() => {
    if (!canAccess || !authToken) return;
    (async () => {
      try {
        const res = await fetch("/api/users", {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (e) {
        console.error("Failed to fetch users:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [canAccess, authToken]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        const user = await res.json();
        setUsers([...users, user]);
        setShowCreateForm(false);
        setNewUser({
          email: "",
          password: "",
          name: "",
          role: "END_USER" as Role,
          department: "",
        });
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create user");
      }
    } catch (e) {
      console.error("Failed to create user:", e);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<UserData>) => {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ id: userId, ...updates }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUsers(users.map((u) => (u.id === userId ? updated : u)));
        setEditingUser(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update user");
      }
    } catch (e) {
      console.error("Failed to update user:", e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      alert("You cannot delete your own account.");
      return;
    }

    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ id: userId }),
      });

      if (res.ok) {
        setUsers(users.filter((u) => u.id !== userId));
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete user");
      }
    } catch (e) {
      console.error("Failed to delete user:", e);
    }
  };

  const handleImport = async () => {
    if (!csvData.trim()) {
      alert("Please paste CSV data");
      return;
    }

    try {
      const res = await fetch("/api/users/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ csv: csvData }),
      });

      const result = await res.json();
      setImportResult(result);

      if (result.success && result.summary.imported > 0) {
        const refreshRes = await fetch("/api/users", {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setUsers(refreshData);
        }
      }
    } catch (e) {
      console.error("Failed to import:", e);
    }
  };

  if (!canAccess) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="glass-dark p-6 rounded-2xl text-center">
          <p className="text-red-400">
            Access denied. Administrator or Agent privileges required.
          </p>
        </div>
      </div>
    );
  }

  const sampleCSV = `email,password,name,role,department
john.doe@company.com,pass123,John Doe,Agent,IT Support
jane.smith@company.com,pass123,Jane Smith,End User,Marketing
bob.wilson@company.com,pass123,Bob Wilson,Agent,Network Team`;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            User Management
          </h2>
          <p className="text-neutral-400 mt-1">
            {canModify
              ? "Manage users, roles, and permissions"
              : "View all users in the system"}
          </p>
        </div>
        <div className="flex flex-1 max-w-md items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search by name, email or department..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          {canModify && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                Bulk Import
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User List */}
      <div className="glass-dark rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-neutral-400 text-sm">
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Department</th>
                <th className="p-4 font-medium">Created</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500">
                    Loading...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <p className="text-neutral-500 mb-2">No users found.</p>
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="text-blue-400 hover:underline text-sm"
                    >
                      Clear search filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          {editingUser?.id === user.id ? (
                            <input
                              type="text"
                              value={editingUser.name}
                              onChange={(e) =>
                                setEditingUser({
                                  ...editingUser,
                                  name: e.target.value,
                                })
                              }
                              className="bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-sm w-32 mb-1"
                            />
                          ) : (
                            <p className="text-white font-medium">
                              {user.name}
                            </p>
                          )}
                          <p className="text-xs text-neutral-500">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {editingUser?.id === user.id ? (
                        <select
                          value={editingUser.role}
                          onChange={(e) =>
                            setEditingUser({
                              ...editingUser,
                              role: e.target.value as Role,
                            })
                          }
                          className="bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-sm"
                        >
                          <option value="ADMINISTRATOR">Administrator</option>
                          <option value="AGENT">Agent</option>
                          <option value="END_USER">End User</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            user.role === "ADMINISTRATOR"
                              ? "bg-red-500/20 text-red-400"
                              : user.role === "AGENT"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-neutral-500/20 text-neutral-400"
                          }`}
                        >
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-neutral-400 text-sm">
                      {editingUser?.id === user.id ? (
                        <input
                          type="text"
                          value={editingUser.department}
                          onChange={(e) =>
                            setEditingUser({
                              ...editingUser,
                              department: e.target.value,
                            })
                          }
                          className="bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-sm w-32"
                        />
                      ) : (
                        user.department
                      )}
                    </td>
                    <td className="p-4 text-neutral-500 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {canModify && (
                        <div className="flex items-center gap-2">
                          {editingUser?.id === user.id ? (
                            <>
                              <button
                                onClick={() =>
                                  handleUpdateUser(editingUser.id, {
                                    name: editingUser.name,
                                    role: editingUser.role,
                                    department: editingUser.department,
                                  })
                                }
                                className="p-1.5 hover:bg-green-500/20 rounded text-green-400"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingUser(null)}
                                className="p-1.5 hover:bg-neutral-500/20 rounded text-neutral-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingUser(user)}
                                className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setResetPasswordUser(user);
                                  setResetPasswordValue("");
                                  setResetPasswordMsg(null);
                                }}
                                className="p-1.5 rounded text-neutral-500 hover:bg-amber-500/10 hover:text-amber-400 transition-colors"
                                title={`Reset password for ${user.name}`}
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={user.id === currentUser?.id}
                                className={`p-1.5 rounded transition-colors ${
                                  user.id === currentUser?.id
                                    ? "text-neutral-700 cursor-not-allowed"
                                    : "text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
                                }`}
                                title={user.id === currentUser?.id ? "You cannot delete yourself" : "Delete user"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              Showing <span className="text-neutral-300">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-neutral-300">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="text-neutral-300">{filteredUsers.length}</span> users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white/5 border border-white/10 rounded-lg text-neutral-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 3 + i + 1;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? "bg-blue-500 text-white"
                          : "text-neutral-500 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-white/5 border border-white/10 rounded-lg text-neutral-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                Create New User
              </h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="user@company.com"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-300 mb-1">
                  Password
                </label>
                <input
                  type="text"
                  required
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Temporary password"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Full Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value as Role })
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="END_USER">End User</option>
                    <option value="AGENT">Agent</option>
                    <option value="ADMINISTRATOR">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.department}
                    onChange={(e) =>
                      setNewUser({ ...newUser, department: e.target.value })
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                    placeholder="IT, Sales, etc."
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Bulk Import Users
                </h3>
                <p className="text-sm text-neutral-500 mt-0.5">
                  Paste CSV data below
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-2">
                  CSV Format
                </label>
                <textarea
                  value={csvData || sampleCSV}
                  onChange={(e) => setCsvData(e.target.value)}
                  className="w-full h-48 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm font-mono"
                  placeholder="email,password,name,role,department&#10;..."
                />
              </div>

              {importResult && (
                <div
                  className={`p-4 rounded-lg ${importResult.total > 0 ? "bg-green-500/20" : "bg-red-500/20"}`}
                >
                  <p
                    className={`font-medium ${importResult.total > 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    Import Complete
                  </p>
                  <div className="mt-2 text-sm text-neutral-400">
                    <p>Total rows: {importResult.total}</p>
                    <p>Imported: {importResult.imported}</p>
                    <p>Skipped: {importResult.skipped}</p>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2 text-sm text-red-400 max-h-32 overflow-y-auto">
                      {importResult.errors.map((err: string, i: number) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportResult(null);
                  }}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
                >
                  <Upload className="w-4 h-4" />
                  Import Users
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                Reset Password
              </h3>
              <button
                onClick={() => setResetPasswordUser(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setResetPasswordMsg(null);
                setIsResettingPassword(true);
                try {
                  const res = await fetch("/api/auth/password", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                      userId: resetPasswordUser.id,
                      newPassword: resetPasswordValue,
                    }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setResetPasswordMsg({ type: "success", text: data.message });
                    setResetPasswordValue("");
                  } else {
                    setResetPasswordMsg({ type: "error", text: data.error || "Failed to reset password" });
                  }
                } catch {
                  setResetPasswordMsg({ type: "error", text: "Network error" });
                } finally {
                  setIsResettingPassword(false);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <p className="text-sm text-neutral-400 mb-4">
                  Resetting password for{" "}
                  <span className="text-white font-medium">{resetPasswordUser.name}</span>
                  {" "}({resetPasswordUser.email})
                </p>
              </div>
              <div>
                <label className="block text-sm text-neutral-300 mb-1">
                  New Password
                </label>
                <input
                  type="text"
                  required
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Min 8 chars, uppercase, lowercase, number"
                />
              </div>
              {resetPasswordMsg && (
                <div className={`text-sm ${resetPasswordMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>
                  {resetPasswordMsg.text}
                </div>
              )}
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white rounded-lg transition-all"
                >
                  <Lock className="w-4 h-4" />
                  {isResettingPassword ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

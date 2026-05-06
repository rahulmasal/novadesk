"use client";

import { useState, useEffect, useCallback } from "react";
import { useTicketStore, Role } from "@/lib/store";
import { User, UserPlus, Upload, Trash2, Edit2, X, Check } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  createdAt: string;
}

export function UserManagement() {
  const { authToken, currentUserRole } = useTicketStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  // New user form state
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    role: "End User" as Role,
    department: "",
  });

  // Import state
  const [csvData, setCsvData] = useState("");
  const [importResult, setImportResult] = useState<{ total: number; imported: number; skipped: number; errors?: string[] } | null>(null);

  // Allow both Administrators and Agents to access user management
  const canAccess = currentUserRole === "Administrator" || currentUserRole === "Agent";

  const fetchUsers = async () => {
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
  };

  useEffect(() => {
    if (canAccess) {
      fetchUsers();
    }
  }, [canAccess]);

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
          role: "End User",
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

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ id: userId, role: newRole }),
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
        fetchUsers();
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

  // Only Administrators can create/edit/delete users
  const canModify = currentUserRole === "Administrator";

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.name}</p>
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
                          <option value="Administrator">Administrator</option>
                          <option value="Agent">Agent</option>
                          <option value="End User">End User</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            user.role === "Administrator"
                              ? "bg-red-500/20 text-red-400"
                              : user.role === "Agent"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-neutral-500/20 text-neutral-400"
                          }`}
                        >
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-neutral-400 text-sm">
                      {user.department}
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
                                  handleUpdateRole(
                                    editingUser.id,
                                    editingUser.role,
                                  )
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
                            <button
                              onClick={() => setEditingUser(user)}
                              className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                    <option value="End User">End User</option>
                    <option value="Agent">Agent</option>
                    <option value="Administrator">Administrator</option>
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
                  className={`p-4 rounded-lg ${importResult.imported > 0 ? "bg-green-500/20" : "bg-red-500/20"}`}
                >
                  <p
                    className={`font-medium ${importResult.imported > 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {importResult.imported > 0
                      ? "Import Complete!"
                      : "Import Failed"}
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
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useTicketStore, Role } from "@/lib/store";
import { UserPlus, Upload, Trash2, Edit2, X, Check, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  hostname: string | null;
  laptopSerial: string | null;
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
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200, 500];

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // New user form state
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    role: "END_USER" as Role,
    department: "",
    hostname: "",
    laptopSerial: "",
  });

  const [csvData, setCsvData] = useState("");
  const [importResult, setImportResult] = useState<{ success: boolean; summary: { total: number; imported: number; skipped: number }; errors?: string[] } | null>(null);
  
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "name", "email", "role", "department", "hostname", "laptopSerial", "createdAt"
  ]);

  const availableColumns = [
    { id: "name", label: "Name" },
    { id: "email", label: "Email" },
    { id: "role", label: "Role" },
    { id: "department", label: "Department" },
    { id: "hostname", label: "Hostname" },
    { id: "laptopSerial", label: "Laptop Serial" },
    { id: "createdAt", label: "Created" },
  ];

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
          hostname: "",
          laptopSerial: "",
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

      if (result.success && result.summary?.imported > 0) {
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

  const toggleColumn = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedUsers.size} user(s)? This cannot be undone.`)) return;
    
    setShowProgressModal(true);
    setProgressTotal(selectedUsers.size);
    setProgressStep(0);
    
    try {
      const userIds = Array.from(selectedUsers);
      const deletePromises = userIds.map(async (id) => {
        setProgressStep(prev => prev + 1);
        const res = await fetch("/api/users", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ id }),
        });
        return res.ok;
      });
      
      await Promise.all(deletePromises);
      setUsers(users.filter((u) => !selectedUsers.has(u.id)));
      setSelectedUsers(new Set());
    } catch (e) {
      console.error("Failed to bulk delete:", e);
    } finally {
      setShowProgressModal(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="p-8">
        <div className="glass-dark p-6 rounded-2xl text-center">
          <p className="text-red-400">
            Access denied. Administrator or Agent privileges required.
          </p>
        </div>
      </div>
    );
  }

  const sampleCSV = `email,password,name,role,department,hostname,laptopSerial
john.doe@company.com,pass123,John Doe,Agent,IT Support,LAPTOP-001,SN12345678
jane.smith@company.com,pass123,Jane Smith,End User,Marketing,LAPTOP-002,SN87654321
bob.wilson@company.com,pass123,Bob Wilson,Agent,Network Team,WORKSTATION-01,SN11223344`;

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex flex-1 max-w-lg relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by name, email or department..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <select
          value={itemsPerPage}
          onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          {PAGE_SIZE_OPTIONS.map(size => (
            <option key={size} value={size} className="bg-neutral-800">
              {size} per page
            </option>
          ))}
          <option value={users.length || 999999} className="bg-neutral-800">
            All ({users.length})
          </option>
        </select>
        {canModify && (
          <>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl font-medium transition-colors"
            >
              <Upload className="w-5 h-5" />
              Bulk Import
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Add User
            </button>
          </>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && canModify && (
        <div className="flex items-center gap-3 mb-4 p-4 glass-dark rounded-xl">
          <span className="text-sm text-neutral-300">{selectedUsers.size} selected</span>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedUsers(new Set())}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* Column Selector */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowColumnSelector(!showColumnSelector)}
          className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Column Selection
        </button>
      </div>

      {/* Column Selector Panel */}
      {showColumnSelector && (
        <div className="glass-dark rounded-2xl p-4 mb-4">
          <h4 className="text-white font-medium mb-3">Select Columns</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {availableColumns.map((column) => (
              <label
                key={column.id}
                className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer hover:text-white"
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(column.id)}
                  onChange={() => toggleColumn(column.id)}
                  className="rounded border-white/20 bg-black/40"
                />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* User List */}
      <div className="glass-dark rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-neutral-400 text-sm">
                <th className="p-4 font-medium w-12">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(new Set(paginatedUsers.map(u => u.id)));
                      } else {
                        setSelectedUsers(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-blue-500 checked:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                  />
                </th>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Department</th>
                {selectedColumns.includes("hostname") && <th className="p-4 font-medium">Hostname</th>}
                {selectedColumns.includes("laptopSerial") && <th className="p-4 font-medium">Laptop Serial</th>}
                <th className="p-4 font-medium">Created</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-500">
                    Loading...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
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
                    <td className="p-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedUsers);
                          if (e.target.checked) {
                            newSelected.add(user.id);
                          } else {
                            newSelected.delete(user.id);
                          }
                          setSelectedUsers(newSelected);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-blue-500 checked:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                      />
                    </td>
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
                    <td className="p-4 text-neutral-400 text-sm">
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
                        user.role
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
                    {selectedColumns.includes("hostname") && (
                      <td className="p-4 text-neutral-500 text-sm">
                        {editingUser?.id === user.id ? (
                          <input
                            type="text"
                            value={editingUser.hostname || ""}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                hostname: e.target.value,
                              })
                            }
                            className="bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-sm w-28"
                            placeholder="LAPTOP-001"
                          />
                        ) : (
                          user.hostname || <span className="text-neutral-700">—</span>
                        )}
                      </td>
                    )}
                    {selectedColumns.includes("laptopSerial") && (
                      <td className="p-4 text-neutral-500 text-sm">
                        {editingUser?.id === user.id ? (
                          <input
                            type="text"
                            value={editingUser.laptopSerial || ""}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                laptopSerial: e.target.value,
                              })
                            }
                            className="bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-sm w-28"
                            placeholder="SN12345678"
                          />
                        ) : (
                          user.laptopSerial || <span className="text-neutral-700">—</span>
                        )}
                      </td>
                    )}
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
                                className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingUser(user)}
                                className="p-1.5 hover:bg-blue-500/20 rounded text-blue-400"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
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
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              Showing {Math.min(filteredUsers.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredUsers.length, currentPage * itemsPerPage)} of {filteredUsers.length} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-neutral-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Add New User</h3>
              <button onClick={() => setShowCreateForm(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                    placeholder="Password"
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
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}
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
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                    placeholder="Department"
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
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Bulk Import Users</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-2">
                  CSV Format (email,password,name,role,department,hostname,laptopSerial)
                </label>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  className="w-full h-48 bg-black/40 border border-white/10 rounded-lg p-4 font-mono text-sm text-white"
                  placeholder={`email,password,name,role,department,hostname,laptopSerial
john.doe@company.com,pass123,John Doe,Agent,IT Support,LAPTOP-001,SN12345678`}
                />
              </div>
              {importResult && (
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-neutral-300">
                    Imported: {importResult.summary.imported} | Skipped: {importResult.summary.skipped}
                  </p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-400">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button
                onClick={() => setCsvData(sampleCSV)}
                className="px-4 py-2 text-neutral-400 hover:text-white"
              >
                Use Sample
              </button>
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-white mb-2">Deleting Users</h3>
              <p className="text-neutral-400 mb-4">
                Processing {progressStep} of {progressTotal}
              </p>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progressStep / progressTotal) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
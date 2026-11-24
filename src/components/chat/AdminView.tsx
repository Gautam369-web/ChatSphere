"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
} from "lucide-react";

export function AdminView() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "reports">("overview");

  const loadData = async () => {
    try {
      const [statsRes, usersRes, reportsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users"),
        fetch("/api/admin/reports"),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.users || []);
      }
      if (reportsRes.ok) {
        const d = await reportsRes.json();
        setReports(d.reports || []);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const handleReportAction = async (reportId: string, status: "RESOLVED" | "DISMISSED") => {
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Failed to update report:", err);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950/60 p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-amber-400" />
          <span>Platform Administration & Safety</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Monitor user growth, manage permissions, and review reported content
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === "overview"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Overview & Metrics
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === "users"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          User Management ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === "reports"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Moderation Queue ({reports.filter((r) => r.status === "PENDING").length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Users</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-3xl font-extrabold text-white mt-3">{stats.totalUsers}</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Messages</span>
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-extrabold text-white mt-3">{stats.totalMessages}</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Active Chats</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-3xl font-extrabold text-white mt-3">{stats.totalConversations}</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Pending Reports</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-3xl font-extrabold text-white mt-3">{stats.pendingReports}</p>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Joined</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30">
                  <td className="p-3.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                      <img
                        src={u.image || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name || "U"}`}
                        alt={u.name || "User"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{u.name || u.username}</p>
                      <p className="text-slate-400 text-[10px]">@{u.username}</p>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-300">{u.email}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === "ADMIN"
                          ? "bg-amber-500/20 text-amber-300"
                          : u.role === "MODERATOR"
                          ? "bg-indigo-500/20 text-indigo-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3.5 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-white px-2 py-1 focus:outline-none"
                    >
                      <option value="USER">User</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No reports filed</p>
          ) : (
            reports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">
                      Report by @{rep.reporter?.username}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rep.status === "PENDING"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {rep.status}
                    </span>
                  </div>
                  <p className="text-slate-300">Reason: {rep.reason}</p>
                  {rep.message && (
                    <p className="text-slate-400 text-[11px] mt-1 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      &quot;{rep.message.content}&quot;
                    </p>
                  )}
                </div>

                {rep.status === "PENDING" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleReportAction(rep.id, "RESOLVED")}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleReportAction(rep.id, "DISMISSED")}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

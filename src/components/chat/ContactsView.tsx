"use client";

import React, { useState, useEffect } from "react";
import { UserSummary } from "@/types";
import { useChatStore } from "@/store/useChatStore";
import {
  Users,
  UserPlus,
  MessageSquare,
  Check,
  X,
  Search,
  UserCheck,
  Clock,
  Trash2,
} from "lucide-react";

interface ContactsViewProps {
  onStartChat: (recipientId: string) => void;
}

export function ContactsView({ onStartChat }: ContactsViewProps) {
  const { onlineUsers } = useChatStore();
  const [contacts, setContacts] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [tab, setTab] = useState<"contacts" | "received" | "sent">("contacts");
  const [search, setSearch] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStatus, setAddStatus] = useState<string | null>(null);

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        setReceivedRequests(data.receivedRequests || []);
        setSentRequests(data.sentRequests || []);
      }
    } catch (err) {
      console.error("Error loading contacts:", err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    try {
      setAddStatus(null);
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername: newUsername.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddStatus(data.error || "Failed to send request");
      } else {
        setAddStatus("Friend request sent!");
        setNewUsername("");
        fetchContacts();
        setTimeout(() => setShowAddModal(false), 1500);
      }
    } catch {
      setAddStatus("An error occurred");
    }
  };

  const handleRequestAction = async (requestId: string, action: "ACCEPT" | "DECLINE") => {
    try {
      const res = await fetch(`/api/contacts/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchContacts();
      }
    } catch (err) {
      console.error("Error updating request:", err);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const u = c.user;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/70 dark:bg-slate-950/60 p-4 md:p-10 max-w-4xl mx-auto pb-24 md:pb-10 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Contacts & Connections</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage friends, requests, and direct connections</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-2xl font-medium text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 flex items-center gap-2 transition self-start"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          onClick={() => setTab("contacts")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            tab === "contacts"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>All Contacts</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
            {contacts.length}
          </span>
        </button>

        <button
          onClick={() => setTab("received")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            tab === "received"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>Pending Requests</span>
          {receivedRequests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold text-[10px]">
              {receivedRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab("sent")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            tab === "sent"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>Sent Requests</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
            {sentRequests.length}
          </span>
        </button>
      </div>

      {/* Tab Content 1: Contacts */}
      {tab === "contacts" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter contacts..."
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {filteredContacts.length === 0 ? (
              <p className="text-xs text-slate-500 col-span-2 py-8 text-center">No contacts found</p>
            ) : (
              filteredContacts.map((c) => {
                const u = c.user;
                const isOnline = onlineUsers.has(u.id) || u.isOnline;
                return (
                  <div
                    key={c.contactId}
                    className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-slate-800 shrink-0">
                        <img
                          src={u.image || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name || "U"}`}
                          alt={u.name || "User"}
                          className="w-full h-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-slate-900 ${
                            isOnline ? "bg-emerald-500" : "bg-slate-600"
                          }`}
                        />
                      </div>
                      <div className="text-xs">
                        <h4 className="font-semibold text-white">{u.name || u.username}</h4>
                        <p className="text-slate-400 text-[11px]">@{u.username}</p>
                        {u.statusMessage && (
                          <p className="text-slate-400 text-[10px] truncate max-w-[150px]">
                            {u.statusMessage}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onStartChat(u.id)}
                      className="p-2 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white transition"
                      title="Open Chat"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2: Received Requests */}
      {tab === "received" && (
        <div className="space-y-3">
          {receivedRequests.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No pending friend requests</p>
          ) : (
            receivedRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-800">
                    <img
                      src={req.sender.image || `https://api.dicebear.com/7.x/initials/svg?seed=${req.sender.name || "U"}`}
                      alt={req.sender.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-white">{req.sender.name || req.sender.username}</p>
                    <p className="text-slate-400 text-[11px]">@{req.sender.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRequestAction(req.id, "ACCEPT")}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => handleRequestAction(req.id, "DECLINE")}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Decline"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content 3: Sent Requests */}
      {tab === "sent" && (
        <div className="space-y-3">
          {sentRequests.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No sent requests pending</p>
          ) : (
            sentRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-800">
                    <img
                      src={req.receiver.image || `https://api.dicebear.com/7.x/initials/svg?seed=${req.receiver.name || "U"}`}
                      alt={req.receiver.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-white">{req.receiver.name || req.receiver.username}</p>
                    <p className="text-slate-400 text-[11px]">@{req.receiver.username}</p>
                  </div>
                </div>

                <span className="flex items-center gap-1 text-slate-500 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending</span>
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base">Add Friend by Username</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addStatus && (
              <p className="text-xs text-indigo-400 mb-3 bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                {addStatus}
              </p>
            )}

            <form onSubmit={handleSendRequest} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. bob, charlie"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-medium text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition"
              >
                Send Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

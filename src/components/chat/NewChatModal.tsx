"use client";

import React, { useState, useEffect } from "react";
import { UserSummary } from "@/types";
import {
  X,
  Search,
  Users,
  MessageSquare,
  Plus,
  Check,
  Globe,
  Lock,
  KeyRound,
} from "lucide-react";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDirectChat: (recipientId: string) => void;
  onConnectByCode?: (conversation: any) => void;
  onCreateGroupChat: (payload: {
    name: string;
    description?: string;
    memberIds: string[];
    isPublic: boolean;
  }) => void;
}

export function NewChatModal({
  isOpen,
  onClose,
  onCreateDirectChat,
  onConnectByCode,
  onCreateGroupChat,
}: NewChatModalProps) {
  const [tab, setTab] = useState<"direct" | "group" | "code">("direct");
  const [codeVal, setCodeVal] = useState("");
  const [codeFeedback, setCodeFeedback] = useState<string | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Group form state
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);

  // Search users API
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchUsers, 200);
    return () => clearTimeout(timer);
  }, [search, isOpen]);

  if (!isOpen) return null;

  const toggleSelectMember = (userId: string) => {
    if (selectedMemberIds.includes(userId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== userId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, userId]);
    }
  };

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    onCreateGroupChat({
      name: groupName.trim(),
      description: groupDescription.trim() || undefined,
      memberIds: selectedMemberIds,
      isPublic,
    });

    onClose();
  };

  const handleConnectCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeVal.trim()) return;

    try {
      setIsSubmittingCode(true);
      setCodeFeedback(null);
      const res = await fetch("/api/conversations/connect-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeVal.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCodeFeedback(data.error || "Failed to connect with ID");
      } else {
        if (onConnectByCode) {
          onConnectByCode(data.conversation);
        }
        onClose();
      }
    } catch {
      setCodeFeedback("Failed to connect via code");
    } finally {
      setIsSubmittingCode(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTab("code")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                tab === "code"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Direct ID
            </button>
            <button
              onClick={() => setTab("direct")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                tab === "direct"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              People
            </button>
            <button
              onClick={() => setTab("group")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                tab === "group"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              New Group
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 0: Direct ID Code Connect */}
        {tab === "code" && (
          <form onSubmit={handleConnectCode} className="p-6 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Connect via Direct ID</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Enter your partner&apos;s 5-digit Direct ID or any shared code (e.g. <span className="font-mono text-indigo-300">45632</span>). Both users entering this code connect exclusively!
              </p>
            </div>

            {codeFeedback && (
              <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 w-full">
                {codeFeedback}
              </p>
            )}

            <input
              type="text"
              value={codeVal}
              onChange={(e) => setCodeVal(e.target.value)}
              placeholder="e.g. 45632"
              required
              autoFocus
              className="w-full text-center tracking-widest font-mono text-xl py-3 px-4 rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <button
              type="submit"
              disabled={isSubmittingCode || !codeVal.trim()}
              className="w-full py-3 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {isSubmittingCode ? "Connecting..." : "Pair & Open Chat"}
            </button>
          </form>
        )}

        {/* Tab 1: Direct Message */}
        {tab === "direct" && (
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find people by name, username, or email..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {isLoading ? (
                <div className="text-center py-8 text-xs text-slate-500">Searching directory...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">No users found</div>
              ) : (
                users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      onCreateDirectChat(u.id);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-800/60 border border-transparent hover:border-slate-800 flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                        <img
                          src={u.image || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name || "U"}`}
                          alt={u.name || "User"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs">
                        <p className="font-semibold text-white">{u.name || u.username}</p>
                        <p className="text-slate-400">@{u.username}</p>
                      </div>
                    </div>
                    <button className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Group Creation */}
        {tab === "group" && (
          <form onSubmit={handleGroupSubmit} className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Design Systems, DevOps Guild"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="What is this channel about?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 text-xs">
                  {isPublic ? <Globe className="w-4 h-4 text-indigo-400" /> : <Lock className="w-4 h-4 text-slate-400" />}
                  <div>
                    <span className="font-semibold text-white">{isPublic ? "Public Channel" : "Private Group"}</span>
                    <p className="text-[10px] text-slate-400">
                      {isPublic ? "Anyone can view and join" : "Only invited members can access"}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Select Members Section */}
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-2">
              Add Members ({selectedMemberIds.length} selected)
            </label>

            <div className="flex-1 overflow-y-auto space-y-1 mb-4 pr-1">
              {users.map((u) => {
                const isSelected = selectedMemberIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleSelectMember(u.id)}
                    className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500/50"
                        : "border-slate-800 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                        <img
                          src={u.image || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name || "U"}`}
                          alt={u.name || "User"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs font-medium text-white">{u.name || u.username}</span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        isSelected ? "bg-indigo-600 text-white" : "border border-slate-700"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={!groupName.trim()}
              className="w-full py-2.5 rounded-xl font-medium text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              Create Group
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { formatTime, formatDateDivider } from "@/lib/utils";
import { useChatStore } from "@/store/useChatStore";
import { ConversationItem } from "@/types";
import {
  Search,
  Plus,
  Pin,
  CheckCheck,
  Check,
  VolumeX,
  Users,
  Image as ImageIcon,
  Mic,
  FileText,
  KeyRound,
  Copy,
  Zap,
  LogOut,
} from "lucide-react";

interface ConversationListProps {
  onSelectConversation: (id: string) => void;
  onOpenNewChatModal: () => void;
}

export function ConversationList({
  onSelectConversation,
  onOpenNewChatModal,
}: ConversationListProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const {
    conversations,
    upsertConversation,
    setActiveConversationId,
    activeConversationId,
    onlineUsers,
    typingUsers,
    searchQuery,
    setSearchQuery,
  } = useChatStore();

  const [activeFilter, setActiveFilter] = useState<"all" | "direct" | "groups" | "unread">("all");
  const [connectInput, setConnectInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectStatus, setConnectStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const myConnectCode = session?.user?.connectCode || "45632";

  const handleConnectByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectInput.trim()) return;

    try {
      setIsConnecting(true);
      setConnectStatus(null);

      const res = await fetch("/api/conversations/connect-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: connectInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setConnectStatus(data.error || "Could not connect with this ID");
        return;
      }

      if (data.conversation) {
        upsertConversation(data.conversation);
        setActiveConversationId(data.conversation.id);
        setConnectInput("");
        setConnectStatus("Connected successfully!");
        setTimeout(() => setConnectStatus(null), 3000);
      }
    } catch {
      setConnectStatus("Failed to connect via Direct ID");
    } finally {
      setIsConnecting(false);
    }
  };

  const copyMyCode = () => {
    navigator.clipboard.writeText(myConnectCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Tab filter
      if (activeFilter === "direct" && c.isGroup) return false;
      if (activeFilter === "groups" && !c.isGroup) return false;
      if (activeFilter === "unread" && (!c.unreadCount || c.unreadCount === 0)) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (c.isGroup) {
          return c.name?.toLowerCase().includes(q);
        }
        const otherMember = c.members.find((m) => m.userId !== currentUserId);
        const nameMatch = otherMember?.user?.name?.toLowerCase().includes(q);
        const usernameMatch = otherMember?.user?.username?.toLowerCase().includes(q);
        const lastMsgMatch = c.messages[0]?.content?.toLowerCase().includes(q);
        return nameMatch || usernameMatch || lastMsgMatch;
      }

      return true;
    });
  }, [conversations, activeFilter, searchQuery, currentUserId]);

  const getConversationDetails = (conv: ConversationItem) => {
    if (conv.isGroup) {
      return {
        title: conv.name || "Group Chat",
        avatar: conv.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${conv.id}`,
        isOnline: false,
        statusText: `${conv.members.length} members`,
      };
    }

    const otherMember = conv.members.find((m) => m.userId !== currentUserId);
    const otherUser = otherMember?.user;
    const isOnline = otherUser ? onlineUsers.has(otherUser.id) || otherUser.isOnline : false;

    return {
      title: otherUser?.name || otherUser?.username || "Direct Chat",
      avatar: otherUser?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUser?.name || "U"}`,
      isOnline,
      statusText: isOnline ? "online" : "offline",
    };
  };

  const renderLastMessagePreview = (conv: ConversationItem) => {
    const isTyping = typingUsers[conv.id] && typingUsers[conv.id].size > 0;
    if (isTyping) {
      const typers = Array.from(typingUsers[conv.id]).join(", ");
      return (
        <span className="text-indigo-500 dark:text-indigo-400 font-medium italic animate-pulse">
          {typers} {typingUsers[conv.id].size > 1 ? "are" : "is"} typing...
        </span>
      );
    }

    const lastMsg = conv.messages[0];
    if (!lastMsg) {
      return <span className="text-slate-400 dark:text-slate-500 italic">No messages yet</span>;
    }

    const isMine = lastMsg.senderId === currentUserId;

    return (
      <div className="flex items-center gap-1.5 truncate text-slate-500 dark:text-slate-400">
        {isMine && (
          <span className="text-slate-400 dark:text-slate-500 shrink-0">
            {lastMsg.status === "SEEN" ? (
              <CheckCheck className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            ) : lastMsg.status === "DELIVERED" ? (
              <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <Check className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            )}
          </span>
        )}

        {lastMsg.type === "IMAGE" ? (
          <span className="flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Photo</span>
          </span>
        ) : lastMsg.type === "VOICE" ? (
          <span className="flex items-center gap-1">
            <Mic className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>Voice message ({lastMsg.voiceDuration || 0}s)</span>
          </span>
        ) : lastMsg.type === "FILE" ? (
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span className="truncate">{lastMsg.fileName || "File"}</span>
          </span>
        ) : (
          <span className="truncate">{lastMsg.content}</span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full md:w-80 lg:w-96 h-full bg-white/90 dark:bg-slate-900/70 border-r border-slate-200 dark:border-slate-800/60 flex flex-col shrink-0 pb-16 md:pb-0 transition-colors duration-200">
      {/* Header & Search */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/60 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Messages
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal">
              {conversations.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewChatModal}
              className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition shadow-md shadow-indigo-600/20 active:scale-95"
              title="Start New Chat or Group"
            >
              <Plus className="w-4 h-4" />
            </button>
            {/* Mobile Logout Button in Header */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign Out"
              className="md:hidden w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500 flex items-center justify-center transition active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Direct Connect ID Card */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/60 dark:to-purple-950/60 border border-indigo-200 dark:border-indigo-500/30 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Your Direct ID:</span>
            </span>
            <button
              type="button"
              onClick={copyMyCode}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 text-white dark:bg-indigo-600/30 hover:bg-indigo-700 dark:hover:bg-indigo-600/50 border border-indigo-300 dark:border-indigo-400/40 text-xs font-mono font-bold transition active:scale-95"
              title="Click to copy your Direct ID"
            >
              <span>{myConnectCode}</span>
              <Copy className="w-3 h-3 text-indigo-100 dark:text-indigo-200" />
              {copied && <span className="text-[10px] text-emerald-300 font-sans">Copied!</span>}
            </button>
          </div>

          <form onSubmit={handleConnectByCode} className="flex items-center gap-1.5">
            <input
              type="text"
              value={connectInput}
              onChange={(e) => setConnectInput(e.target.value)}
              placeholder="Enter ID to connect (e.g. 45632)"
              className="flex-1 bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-xl py-1.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono shadow-sm"
            />
            <button
              type="submit"
              disabled={isConnecting || !connectInput.trim()}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1 transition active:scale-95 disabled:opacity-50 shrink-0"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isConnecting ? "..." : "Connect"}</span>
            </button>
          </form>

          {connectStatus && (
            <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100/60 dark:bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/20">
              {connectStatus}
            </p>
          )}
        </div>

        {/* Search input with Ctrl+K badge */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats, people, messages..."
            className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl py-2 pl-9 pr-14 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] font-mono border border-slate-300 dark:border-slate-700">
            Ctrl+K
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(["all", "direct", "groups", "unread"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition shrink-0 ${
                activeFilter === filter
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                  : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/30 p-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No conversations found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Start a new message or check your search</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const details = getConversationDetails(conv);
            const isSelected = activeConversationId === conv.id;
            const lastMsg = conv.messages[0];

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-200 dark:border-indigo-500/30 shadow-sm"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800/40 border border-transparent"
                }`}
              >
                {/* Avatar with Presence Indicator */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10">
                    <img
                      src={details.avatar}
                      alt={details.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {conv.isGroup ? (
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-2 ring-white dark:ring-slate-950 flex items-center justify-center text-[10px]">
                      <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    </span>
                  ) : (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-slate-950 ${
                        details.isOnline ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"
                      }`}
                    />
                  )}
                </div>

                {/* Info & Last message snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate pr-2">
                      {details.title}
                    </h3>
                    {lastMsg && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                        {formatTime(lastMsg.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="truncate max-w-[190px]">
                      {renderLastMessagePreview(conv)}
                    </div>

                    {/* Unread Counter Badge */}
                    {(conv.unreadCount || 0) > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-indigo-600 text-white font-bold rounded-full text-[10px] min-w-[18px] text-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

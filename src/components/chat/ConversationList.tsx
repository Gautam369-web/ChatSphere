"use client";

import React, { useState, useMemo, useRef } from "react";
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
  RotateCw,
  Trash2,
  MoreVertical,
  BellOff,
  Mail,
  X,
  AlertTriangle,
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
    setConversations,
    setMessages,
    upsertConversation,
    removeConversation,
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectStatus, setConnectStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // WhatsApp-style long-press context menu & delete dialog state
  const [selectedConvForMenu, setSelectedConvForMenu] = useState<ConversationItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleItemTouchStart = (conv: ConversationItem, e: React.TouchEvent) => {
    isLongPressRef.current = false;
    touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(40); } catch {}
      }
      setSelectedConvForMenu(conv);
    }, 450);
  };

  const handleItemTouchMove = (e: React.TouchEvent) => {
    const diffX = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
    const diffY = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
    if (diffX > 10 || diffY > 10) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    }
  };

  const handleItemTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handleDeleteChat = async () => {
    if (!selectedConvForMenu) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/conversations/${selectedConvForMenu.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        removeConversation(selectedConvForMenu.id);
        setShowDeleteConfirm(false);
        setSelectedConvForMenu(null);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try { navigator.vibrate(30); } catch {}
        }
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
      if (activeConversationId) {
        const msgRes = await fetch(`/api/conversations/${activeConversationId}/messages?limit=50`);
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(activeConversationId, msgData.messages || []);
        }
      }
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

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
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/60 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Messages
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal">
              {conversations.length}
            </span>
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition active:scale-95 disabled:opacity-50"
              title="Refresh messages and status"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-500" : ""}`} />
            </button>
            <button
              onClick={onOpenNewChatModal}
              className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition shadow-md shadow-indigo-600/20 active:scale-95"
              title="Start New Chat or Group"
            >
              <Plus className="w-4 h-4" />
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
                onTouchStart={(e) => handleItemTouchStart(conv, e)}
                onTouchMove={handleItemTouchMove}
                onTouchEnd={handleItemTouchEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedConvForMenu(conv);
                }}
                onClick={() => {
                  if (isLongPressRef.current) {
                    isLongPressRef.current = false;
                    return;
                  }
                  onSelectConversation(conv.id);
                }}
                className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all duration-150 relative select-none ${
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

      {/* WhatsApp-Style Long-Press Bottom Sheet / Context Menu */}
      {selectedConvForMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => {
            if (!showDeleteConfirm) setSelectedConvForMenu(null);
          }}
        >
          <div
            className="w-full sm:max-w-sm bg-white dark:bg-[#1f2c34] rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header info */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                  <img
                    src={getConversationDetails(selectedConvForMenu).avatar}
                    alt={getConversationDetails(selectedConvForMenu).title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {getConversationDetails(selectedConvForMenu).title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {selectedConvForMenu.isGroup
                      ? `${selectedConvForMenu.members.length} members`
                      : getConversationDetails(selectedConvForMenu).isOnline
                      ? "Online"
                      : "Direct message"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedConvForMenu(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Options */}
            <div className="py-2 text-sm text-slate-700 dark:text-slate-200">
              {/* Delete chat / Delete user */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-5 py-3 flex items-center gap-3.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition font-medium"
              >
                <Trash2 className="w-5 h-5 text-rose-500 shrink-0" />
                <span>Delete chat</span>
              </button>

              {/* Pin / Unpin */}
              <button
                onClick={() => {
                  setSelectedConvForMenu(null);
                }}
                className="w-full px-5 py-3 flex items-center gap-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <Pin className="w-5 h-5 text-slate-400 shrink-0" />
                <span>Pin chat</span>
              </button>

              {/* Mute */}
              <button
                onClick={() => {
                  setSelectedConvForMenu(null);
                }}
                className="w-full px-5 py-3 flex items-center gap-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <BellOff className="w-5 h-5 text-slate-400 shrink-0" />
                <span>Mute notifications</span>
              </button>

              {/* Mark as unread */}
              <button
                onClick={() => {
                  if (selectedConvForMenu) {
                    const hasUnread = (selectedConvForMenu.unreadCount || 0) > 0;
                    upsertConversation({ ...selectedConvForMenu, unreadCount: hasUnread ? 0 : 1 });
                  }
                  setSelectedConvForMenu(null);
                }}
                className="w-full px-5 py-3 flex items-center gap-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                <span>
                  {(selectedConvForMenu.unreadCount || 0) > 0 ? "Mark as read" : "Mark as unread"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp-Style Delete Confirmation Modal */}
      {showDeleteConfirm && selectedConvForMenu && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#233138] rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Delete this chat?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Messages and media with{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {getConversationDetails(selectedConvForMenu).title}
              </span>{" "}
              will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteChat}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition flex items-center gap-1.5"
              >
                {isDeleting ? "Deleting..." : "Delete Chat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

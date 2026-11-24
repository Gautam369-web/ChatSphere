"use client";

import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
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
    activeConversationId,
    onlineUsers,
    typingUsers,
    searchQuery,
    setSearchQuery,
  } = useChatStore();

  const [activeFilter, setActiveFilter] = useState<"all" | "direct" | "groups" | "unread">("all");

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // 1. Text Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        let matches = false;
        if (conv.name?.toLowerCase().includes(query)) matches = true;

        const otherMember = conv.members.find((m) => m.userId !== currentUserId);
        if (otherMember?.user.name?.toLowerCase().includes(query)) matches = true;
        if (otherMember?.user.username.toLowerCase().includes(query)) matches = true;

        const lastMsg = conv.messages[0];
        if (lastMsg?.content?.toLowerCase().includes(query)) matches = true;

        if (!matches) return false;
      }

      // 2. Tab Filter
      if (activeFilter === "direct") return !conv.isGroup;
      if (activeFilter === "groups") return conv.isGroup;
      if (activeFilter === "unread") return (conv.unreadCount || 0) > 0;

      return true;
    });
  }, [conversations, searchQuery, activeFilter, currentUserId]);

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
        <span className="text-indigo-400 font-medium italic animate-pulse">
          {typers} {typingUsers[conv.id].size > 1 ? "are" : "is"} typing...
        </span>
      );
    }

    const lastMsg = conv.messages[0];
    if (!lastMsg) {
      return <span className="text-slate-500 italic">No messages yet</span>;
    }

    const isMine = lastMsg.senderId === currentUserId;

    return (
      <div className="flex items-center gap-1.5 truncate text-slate-400">
        {isMine && (
          <span className="text-slate-500 shrink-0">
            {lastMsg.status === "SEEN" ? (
              <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
            ) : lastMsg.status === "DELIVERED" ? (
              <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <Check className="w-3.5 h-3.5 text-slate-500" />
            )}
          </span>
        )}

        {lastMsg.type === "IMAGE" ? (
          <span className="flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Photo</span>
          </span>
        ) : lastMsg.type === "VOICE" ? (
          <span className="flex items-center gap-1">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>Voice message ({lastMsg.voiceDuration || 0}s)</span>
          </span>
        ) : lastMsg.type === "FILE" ? (
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate">{lastMsg.fileName || "File"}</span>
          </span>
        ) : (
          <span className="truncate">{lastMsg.content}</span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full md:w-80 lg:w-96 h-full bg-slate-900/70 border-r border-slate-800/60 flex flex-col shrink-0">
      {/* Header & Search */}
      <div className="p-4 border-b border-slate-800/60 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Messages
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
              {conversations.length}
            </span>
          </h2>
          <button
            onClick={onOpenNewChatModal}
            className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition shadow-md shadow-indigo-600/20 active:scale-95"
            title="Start New Chat or Group"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search input with Ctrl+K badge */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats, people, messages..."
            className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-2 pl-9 pr-14 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-mono border border-slate-700">
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
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/30 p-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm text-slate-400 font-medium">No conversations found</p>
            <p className="text-xs text-slate-500 mt-1">Start a new message or check your search</p>
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
                    ? "bg-indigo-600/15 border border-indigo-500/30 shadow-md shadow-indigo-900/10"
                    : "hover:bg-slate-800/40 border border-transparent"
                }`}
              >
                {/* Avatar with Presence Indicator */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 ring-1 ring-white/10">
                    <img
                      src={details.avatar}
                      alt={details.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {conv.isGroup ? (
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-800 text-slate-300 ring-2 ring-slate-950 flex items-center justify-center text-[10px]">
                      <Users className="w-3 h-3 text-indigo-400" />
                    </span>
                  ) : (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-slate-950 ${
                        details.isOnline ? "bg-emerald-500" : "bg-slate-600"
                      }`}
                    />
                  )}
                </div>

                {/* Info & Last message snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-white truncate pr-2">
                      {details.title}
                    </h3>
                    {lastMsg && (
                      <span className="text-[11px] text-slate-500 shrink-0">
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

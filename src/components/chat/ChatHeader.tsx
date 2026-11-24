"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { formatLastSeen } from "@/lib/utils";
import { useChatStore } from "@/store/useChatStore";
import { ConversationItem } from "@/types";
import {
  Phone,
  Video,
  PanelRight,
  ArrowLeft,
  Pin,
  MoreVertical,
  ShieldAlert,
} from "lucide-react";

interface ChatHeaderProps {
  conversation: ConversationItem;
  onBackMobile?: () => void;
  onInitiateCall: (callType: "audio" | "video") => void;
}

export function ChatHeader({
  conversation,
  onBackMobile,
  onInitiateCall,
}: ChatHeaderProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { onlineUsers, typingUsers, toggleInfoPanel, infoPanelOpen } = useChatStore();

  const otherMember = conversation.members.find((m) => m.userId !== currentUserId);
  const otherUser = otherMember?.user;
  const isOnline = otherUser ? onlineUsers.has(otherUser.id) || otherUser.isOnline : false;

  const typers = typingUsers[conversation.id];
  const isTyping = typers && typers.size > 0;

  const title = conversation.isGroup
    ? conversation.name || "Group Chat"
    : otherUser?.name || otherUser?.username || "Chat";

  const avatar = conversation.isGroup
    ? conversation.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${conversation.id}`
    : otherUser?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUser?.name || "U"}`;

  const getSubtitle = () => {
    if (isTyping) {
      const names = Array.from(typers).join(", ");
      return (
        <span className="text-indigo-400 font-medium italic animate-pulse">
          {names} typing...
        </span>
      );
    }
    if (conversation.isGroup) {
      return <span>{conversation.members.length} members</span>;
    }
    if (isOnline) {
      return <span className="text-emerald-400 font-medium">Online</span>;
    }
    if (otherUser?.lastSeen) {
      return <span>last seen {formatLastSeen(otherUser.lastSeen)}</span>;
    }
    return <span>Offline</span>;
  };

  const pinnedCount = conversation.pinnedMessages?.length || 0;

  return (
    <header className="h-16 px-4 border-b border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl flex items-center justify-between z-10 shrink-0 transition-colors duration-200">
      <div className="flex items-center gap-3">
        {/* Mobile Back Button */}
        {onBackMobile && (
          <button
            onClick={onBackMobile}
            className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* Avatar */}
        <div className="relative">
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10">
            <img src={avatar} alt={title} className="w-full h-full object-cover" />
          </div>
          {!conversation.isGroup && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-950 ${
                isOnline ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"
              }`}
            />
          )}
        </div>

        {/* Header Details */}
        <div className="flex flex-col">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{title}</span>
            {conversation.isGroup && conversation.isPublic && (
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                Public
              </span>
            )}
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            {getSubtitle()}
            {pinnedCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-amber-500 dark:text-amber-400">
                <Pin className="w-3 h-3 fill-amber-500 dark:fill-amber-400" />
                <span>{pinnedCount} pinned</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: Audio Call, Video Call, Info Panel */}
      <div className="flex items-center gap-1">
        {/* 1-to-1 Calls */}
        {!conversation.isGroup && otherUser && (
          <>
            <button
              onClick={() => onInitiateCall("audio")}
              title="Voice Call"
              className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 active:scale-95 transition"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => onInitiateCall("video")}
              title="Video Call"
              className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 active:scale-95 transition"
            >
              <Video className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Toggle Right Info Panel */}
        <button
          onClick={toggleInfoPanel}
          title="Conversation Details & Media"
          className={`p-2.5 rounded-xl transition ${
            infoPanelOpen
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

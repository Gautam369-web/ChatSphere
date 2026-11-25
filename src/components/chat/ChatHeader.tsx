"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { formatLastSeen } from "@/lib/utils";
import { useChatStore } from "@/store/useChatStore";
import { useSocket } from "@/hooks/useSocket";
import { ConversationItem } from "@/types";
import {
  Phone,
  Video,
  ArrowLeft,
  Pin,
  MoreVertical,
  RotateCw,
  Trash2,
  Info,
  Eraser,
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

  const {
    onlineUsers,
    userLastSeen,
    presenceSynced,
    typingUsers,
    toggleInfoPanel,
    setMessages,
    setConversations,
    conversations,
    removeConversation,
    setActiveConversationId,
    setReplyingTo,
  } = useChatStore();
  const { emitClearChat, emitDeleteConversation } = useSocket();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, setTimeTick] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Re-render every 30s so relative "last seen" stays accurate in real time
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMenu]);

  const handleConfirmClearChat = async () => {
    try {
      setIsClearing(true);
      const memberIds = conversation.members.map((m) => m.userId);
      const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages(conversation.id, []);
        setConversations(
          conversations.map((conv) =>
            conv.id === conversation.id
              ? { ...conv, messages: [], pinnedMessages: [], unreadCount: 0 }
              : conv
          )
        );
        setReplyingTo(null);
        emitClearChat(conversation.id, memberIds);
        setShowClearModal(false);
        setShowMenu(false);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try { navigator.vibrate(30); } catch {}
        }
      }
    } catch (err) {
      console.error("Failed to clear chat:", err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      const memberIds = conversation.members.map((m) => m.userId);
      const res = await fetch(`/api/conversations/${conversation.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (!conversation.isGroup) {
          emitDeleteConversation(conversation.id, memberIds);
        }
        removeConversation(conversation.id);
        setActiveConversationId(null);
        setShowDeleteModal(false);
        setShowMenu(false);
        if (onBackMobile) {
          onBackMobile();
        }
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
      const msgRes = await fetch(`/api/conversations/${conversation.id}/messages?limit=50`);
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessages(conversation.id, msgData.messages || []);
      }
      const convRes = await fetch("/api/conversations");
      if (convRes.ok) {
        const convData = await convRes.json();
        setConversations(convData.conversations || []);
      }
    } catch (err) {
      console.error("Refresh error in ChatHeader:", err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const otherMember = conversation.members.find((m) => m.userId !== currentUserId);
  const otherUser = otherMember?.user;
  const isOnline = otherUser
    ? presenceSynced
      ? onlineUsers.has(otherUser.id)
      : onlineUsers.has(otherUser.id) || otherUser.isOnline
    : false;
  const lastSeenValue = otherUser ? userLastSeen[otherUser.id] || otherUser.lastSeen : null;

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
      return <span className="text-emerald-400 font-medium">online</span>;
    }
    if (lastSeenValue) {
      return <span>last seen {formatLastSeen(lastSeenValue)}</span>;
    }
    return <span>Offline</span>;
  };

  const pinnedCount = conversation.pinnedMessages?.length || 0;

  return (
    <header className="h-16 px-3 sm:px-4 border-b border-slate-200 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl flex items-center justify-between z-30 shrink-0 sticky top-0 w-full transition-colors duration-200">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
        {/* Mobile Back Button */}
        {onBackMobile && (
          <button
            onClick={onBackMobile}
            className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition shrink-0"
            title="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* Avatar + Name (Tap to view Profile like WhatsApp) */}
        <button
          type="button"
          onClick={toggleInfoPanel}
          title={conversation.isGroup ? "Tap for group info" : "Tap for contact info"}
          className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 text-left cursor-pointer hover:opacity-85 active:opacity-75 transition rounded-xl py-1 pr-2"
        >
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10">
              <img src={avatar} alt={title} className="w-full h-full object-cover" />
            </div>
            {!conversation.isGroup && (
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-950 ${
                  isOnline ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"
                }`}
              />
            )}
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
              <span className="truncate">{title}</span>
              {conversation.isGroup && conversation.isPublic && (
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 shrink-0">
                  Public
                </span>
              )}
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 truncate">
              <span className="truncate">{getSubtitle()}</span>
              {pinnedCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-amber-500 dark:text-amber-400 shrink-0">
                  <Pin className="w-3 h-3 fill-amber-500 dark:fill-amber-400" />
                  <span>{pinnedCount} pinned</span>
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Action Buttons: Refresh, Audio Call, Video Call, More Options */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh Messages & Status"
          className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 active:scale-95 transition disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-500" : ""}`} />
        </button>

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

        {/* WhatsApp-Style 3-Dots More Options Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            title="More options"
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 active:scale-95 transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-[#1f2c34] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setShowMenu(false);
                  toggleInfoPanel();
                }}
                className="w-full px-4 py-2.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center gap-2.5 transition"
              >
                <Info className="w-4 h-4 text-slate-400" />
                <span>{conversation.isGroup ? "Group info" : "Contact info"}</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  handleRefresh();
                }}
                className="w-full px-4 py-2.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center gap-2.5 transition"
              >
                <RotateCw className="w-4 h-4 text-slate-400" />
                <span>Refresh messages</span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowClearModal(true);
                }}
                className="w-full px-4 py-2.5 text-xs text-left text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2.5 font-medium transition cursor-pointer"
              >
                <Eraser className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Clear chat for everyone</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowDeleteModal(true);
                }}
                className="w-full px-4 py-2.5 text-xs text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2.5 font-medium transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Delete chat</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp-Style Clear Chat For Everyone Confirmation Modal (Portaled to body) */}
      {showClearModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => {
              if (!isClearing) setShowClearModal(false);
            }}
          >
            <div
              className="w-full max-w-sm bg-white dark:bg-[#233138] rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700/80 space-y-4 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Eraser className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Clear chat for everyone?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                    All messages and media with{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {title}
                    </span>{" "}
                    will be permanently deleted from both sides.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  disabled={isClearing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearChat}
                  disabled={isClearing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-md shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>{isClearing ? "Clearing..." : "Clear for Everyone"}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* WhatsApp-Style Delete Confirmation Modal (Portaled to body) */}
      {showDeleteModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => {
              if (!isDeleting) setShowDeleteModal(false);
            }}
          >
            <div
              className="w-full max-w-sm bg-white dark:bg-[#233138] rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700/80 space-y-4 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Delete this chat?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                    Messages and media with{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {title}
                    </span>{" "}
                    will be permanently deleted.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-md shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? "Deleting..." : "Delete Chat"}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}

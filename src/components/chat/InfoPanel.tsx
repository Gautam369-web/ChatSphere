"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { ConversationItem, MessageItem } from "@/types";
import { useChatStore } from "@/store/useChatStore";
import {
  X,
  Users,
  Image as ImageIcon,
  FileText,
  Pin,
  BellOff,
  Bell,
  UserPlus,
  ShieldAlert,
  LogOut,
  Trash2,
  Crown,
  Shield,
} from "lucide-react";

interface InfoPanelProps {
  conversation: ConversationItem;
  messages: MessageItem[];
  onClose: () => void;
  onUnpin: (messageId: string) => void;
  onLeaveGroup?: () => void;
}

export function InfoPanel({
  conversation,
  messages,
  onClose,
  onUnpin,
  onLeaveGroup,
}: InfoPanelProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { onlineUsers, removeConversation, setActiveConversationId, setInfoPanelOpen } = useChatStore();

  const [activeTab, setActiveTab] = useState<"members" | "media" | "pinned">("members");
  const [isMuted, setIsMuted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/conversations/${conversation.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        removeConversation(conversation.id);
        setActiveConversationId(null);
        setInfoPanelOpen(false);
        setShowDeleteModal(false);
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

  const otherMember = conversation.members.find((m) => m.userId !== currentUserId);
  const otherUser = otherMember?.user;
  const isOnline = otherUser ? onlineUsers.has(otherUser.id) || otherUser.isOnline : false;

  const title = conversation.isGroup
    ? conversation.name || "Group Chat"
    : otherUser?.name || otherUser?.username || "Direct Chat";

  const avatar = conversation.isGroup
    ? conversation.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${conversation.id}`
    : otherUser?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUser?.name || "U"}`;

  // Filter media items
  const mediaMessages = messages.filter((m) => m.type === "IMAGE" || m.type === "VIDEO");
  const docMessages = messages.filter((m) => m.type === "FILE");
  const pinnedMessages = conversation.pinnedMessages || [];

  return (
    <aside className="w-80 lg:w-88 h-full bg-white/95 dark:bg-slate-900/90 border-l border-slate-200 dark:border-slate-800/60 flex flex-col z-20 shrink-0 transition-colors duration-200">
      {/* Header */}
      <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Details</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Card */}
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 ring-2 ring-indigo-500/30 mb-3 shadow-lg">
            <img src={avatar} alt={title} className="w-full h-full object-cover" />
          </div>
          <h4 className="font-bold text-base text-slate-900 dark:text-white">{title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {conversation.isGroup
              ? `${conversation.members.length} members`
              : isOnline
              ? "Active now"
              : "Offline"}
          </p>
          {conversation.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
              {conversation.description}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              isMuted
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {isMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            <span>{isMuted ? "Muted" : "Mute"}</span>
          </button>

          {conversation.isGroup ? (
            <button
              onClick={onLeaveGroup}
              className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Group</span>
            </button>
          ) : (
            <button
              className="p-2.5 rounded-xl border border-slate-700/60 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Report User</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 pb-2 text-xs font-semibold capitalize border-b-2 transition ${
              activeTab === "members"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {conversation.isGroup ? "Members" : "About"}
          </button>
          <button
            onClick={() => setActiveTab("media")}
            className={`flex-1 pb-2 text-xs font-semibold capitalize border-b-2 transition ${
              activeTab === "media"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Media ({mediaMessages.length})
          </button>
          <button
            onClick={() => setActiveTab("pinned")}
            className={`flex-1 pb-2 text-xs font-semibold capitalize border-b-2 transition ${
              activeTab === "pinned"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Pinned ({pinnedMessages.length})
          </button>
        </div>

        {/* Tab 1: Members */}
        {activeTab === "members" && (
          <div className="space-y-2">
            {conversation.members.map((member) => {
              const u = member.user;
              const isUserOnline = onlineUsers.has(u.id) || u.isOnline;
              return (
                <div
                  key={member.id}
                  className="p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-slate-700 shrink-0">
                      <img
                        src={u.image || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name || "U"}`}
                        alt={u.name || "User"}
                        className="w-full h-full object-cover"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-slate-900 ${
                          isUserOnline ? "bg-emerald-500" : "bg-slate-500"
                        }`}
                      />
                    </div>
                    <div className="truncate text-xs">
                      <p className="font-semibold text-white truncate">
                        {u.name || u.username} {u.id === currentUserId && "(You)"}
                      </p>
                      <p className="text-slate-400 text-[10px] truncate">@{u.username}</p>
                    </div>
                  </div>

                  {member.role === "OWNER" ? (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold">
                      <Crown className="w-3 h-3" />
                      <span>Owner</span>
                    </span>
                  ) : member.role === "ADMIN" ? (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold">
                      <Shield className="w-3 h-3" />
                      <span>Admin</span>
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Shared Media */}
        {activeTab === "media" && (
          <div>
            {mediaMessages.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No shared media yet</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {mediaMessages.map((m) => (
                  <div
                    key={m.id}
                    className="aspect-square rounded-xl overflow-hidden bg-slate-800 ring-1 ring-white/10 cursor-pointer hover:opacity-80 transition"
                    onClick={() => window.open(m.mediaUrl || "", "_blank")}
                  >
                    <img src={m.mediaUrl || ""} alt="media" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Pinned Messages */}
        {activeTab === "pinned" && (
          <div className="space-y-2">
            {pinnedMessages.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No pinned messages</p>
            ) : (
              pinnedMessages.map((pin) => (
                <div
                  key={pin.id}
                  className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs relative group"
                >
                  <div className="flex items-center justify-between mb-1 text-[11px] text-amber-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Pin className="w-3 h-3 fill-amber-400" />
                      <span>Pinned</span>
                    </span>
                    <button
                      onClick={() => onUnpin(pin.message.id)}
                      className="text-slate-400 hover:text-rose-400"
                      title="Unpin"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-slate-200 line-clamp-2">{pin.message.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Danger Zone: WhatsApp-style Delete Chat / Exit Group */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>{conversation.isGroup ? "Exit & Delete Group" : "Delete Chat"}</span>
          </button>
        </div>
      </div>

      {/* WhatsApp-Style Delete Confirmation Modal */}
      {showDeleteModal && (
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
        </div>
      )}
    </aside>
  );
}

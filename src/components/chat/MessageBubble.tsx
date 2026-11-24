"use client";

import React, { useState, useRef } from "react";
import { formatTime } from "@/lib/utils";
import { MessageItem, UserSummary } from "@/types";
import {
  Check,
  CheckCheck,
  Clock,
  Reply,
  Smile,
  MoreHorizontal,
  Pin,
  Star,
  Download,
  Play,
  Pause,
  Edit2,
  Trash2,
  FileText,
  Volume2,
} from "lucide-react";

interface MessageBubbleProps {
  message: MessageItem;
  isMine: boolean;
  isGroup: boolean;
  currentUser: UserSummary;
  onReply: (message: MessageItem) => void;
  onReact: (messageId: string, emoji: string) => void;
  onPin: (messageId: string) => void;
  onStar: (messageId: string) => void;
  onEdit: (message: MessageItem) => void;
  onDelete: (messageId: string, everyone: boolean) => void;
}

export function MessageBubble({
  message,
  isMine,
  isGroup,
  currentUser,
  onReply,
  onReact,
  onPin,
  onStar,
  onEdit,
  onDelete,
  }: MessageBubbleProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);

  // WhatsApp-style swipe to reply state
  const [dragX, setDragX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const isDeleted = !!message.deletedAt;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleted) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleted || !isSwiping) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartXRef.current;
    const diffY = currentY - touchStartYRef.current;

    // Detect if movement is predominantly horizontal
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
        isHorizontalSwipeRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (!isHorizontalSwipeRef.current) return;

    // WhatsApp-style swipe in either direction to reply
    const absDiff = Math.abs(diffX);
    const damped = absDiff > 42 ? 42 + (absDiff - 42) * 0.25 : absDiff;
    const finalVal = Math.min(damped, 70);

    setDragX(diffX > 0 ? finalVal : -finalVal);
  };

  const handleTouchEnd = () => {
    if (Math.abs(dragX) >= 36) {
      onReply(message);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(25);
        } catch {}
      }
    }
    setIsSwiping(false);
    setDragX(0);
    isHorizontalSwipeRef.current = null;
  };

  // Quick reaction emojis
  const quickEmojis = ["👍", "❤️", "😂", "🔥", "🎉", "👀"];

  // Group reactions by emoji
  const reactionsMap = new Map<string, { count: number; hasReacted: boolean; names: string[] }>();
  message.reactions?.forEach((r) => {
    const existing = reactionsMap.get(r.emoji) || { count: 0, hasReacted: false, names: [] };
    existing.count += 1;
    if (r.userId === currentUser.id) existing.hasReacted = true;
    if (r.user?.name) existing.names.push(r.user.name);
    reactionsMap.set(r.emoji, existing);
  });

  const toggleAudio = () => {
    setIsPlayingAudio(!isPlayingAudio);
  };

  if (message.type === "SYSTEM") {
    return (
      <div className="flex justify-center my-3">
        <span className="text-[11px] font-medium bg-slate-800/80 text-slate-300 px-3 py-1 rounded-full border border-slate-700/50">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowMoreMenu(false);
        setShowQuickReactions(false);
      }}
      className={`group relative flex gap-2 my-0.5 px-1 sm:px-2 ${
        isMine ? "justify-end" : "justify-start"
      }`}
    >
      {/* Sender Avatar in Group Chats (Left side) */}
      {!isMine && isGroup && (
        <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-800 shrink-0 mt-1 ring-1 ring-white/10">
          <img
            src={
              message.sender?.image ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${message.sender?.name || "U"}`
            }
            alt={message.sender?.name || "User"}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Floating Action Toolbar on Hover */}
      {showActions && !isDeleted && (
        <div
          className={`absolute -top-3.5 z-20 flex items-center bg-slate-900 border border-slate-700/80 rounded-xl px-1.5 py-0.5 shadow-xl shadow-black/40 gap-0.5 ${
            isMine ? "right-6" : "left-12"
          }`}
        >
          {/* Quick emoji reactions */}
          <div className="relative">
            <button
              onClick={() => setShowQuickReactions(!showQuickReactions)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition"
              title="React"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
            {showQuickReactions && (
              <div className="absolute bottom-full left-0 mb-1 flex items-center gap-1 p-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-30">
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(message.id, emoji);
                      setShowQuickReactions(false);
                    }}
                    className="hover:scale-125 transition-transform p-1 text-sm"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply */}
          <button
            onClick={() => onReply(message)}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          {/* Pin */}
          <button
            onClick={() => onPin(message.id)}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition"
            title="Pin message"
          >
            <Pin className={`w-3.5 h-3.5 ${message.isPinned ? "fill-amber-400 text-amber-400" : ""}`} />
          </button>

          {/* Star */}
          <button
            onClick={() => onStar(message.id)}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition"
            title="Star message"
          >
            <Star className={`w-3.5 h-3.5 ${message.isStarred ? "fill-amber-400 text-amber-400" : ""}`} />
          </button>

          {/* More Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 text-xs z-30">
                {isMine && !isDeleted && (
                  <button
                    onClick={() => {
                      onEdit(message);
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-slate-300"
                  >
                    <Edit2 className="w-3 h-3 text-indigo-400" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(message.content || "");
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-slate-300"
                >
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>Copy text</span>
                </button>
                <button
                  onClick={() => {
                    onDelete(message.id, false);
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-rose-300"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span>Delete for me</span>
                </button>
                {isMine && (
                  <button
                    onClick={() => {
                      onDelete(message.id, true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-rose-400 font-semibold"
                  >
                    <Trash2 className="w-3 h-3 text-rose-500" />
                    <span>Delete for all</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Bubble Content Container with WhatsApp swipe-to-reply */}
      <div className="relative inline-flex items-center w-fit max-w-[76%] sm:max-w-[66%] md:max-w-[50%]">
        {/* Animated Swipe Reply Indicator (Swiping Right) */}
        {dragX > 0 && (
          <div
            style={{
              transform: `translateY(-50%) scale(${Math.min(dragX / 30, 1)})`,
              opacity: Math.min(dragX / 22, 1),
            }}
            className={`absolute -left-9 top-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center pointer-events-none transition-colors ${
              dragX >= 36
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/40"
                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200"
            }`}
          >
            <Reply className={`w-3.5 h-3.5 transition-transform duration-150 ${dragX >= 36 ? "scale-110 -rotate-12" : ""}`} />
          </div>
        )}

        {/* Animated Swipe Reply Indicator (Swiping Left) */}
        {dragX < 0 && (
          <div
            style={{
              transform: `translateY(-50%) scale(${Math.min(Math.abs(dragX) / 30, 1)})`,
              opacity: Math.min(Math.abs(dragX) / 22, 1),
            }}
            className={`absolute -right-9 top-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center pointer-events-none transition-colors ${
              Math.abs(dragX) >= 36
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/40"
                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200"
            }`}
          >
            <Reply className={`w-3.5 h-3.5 transition-transform duration-150 ${Math.abs(dragX) >= 36 ? "scale-110 rotate-12" : ""}`} />
          </div>
        )}

        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{
            transform: `translateX(${dragX}px)`,
            transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
          className={`w-fit max-w-[76%] sm:max-w-[66%] md:max-w-[50%] flex flex-col ${
            isMine ? "items-end" : "items-start"
          } touch-pan-y`}
        >
          {/* Sender Name in Group (for non-me) */}
          {!isMine && isGroup && (
            <span className="text-[11px] font-semibold text-indigo-400 mb-0.5 px-1">
              {message.sender?.name || message.sender?.username}
            </span>
          )}

          {/* Bubble */}
          <div
            className={`relative rounded-2xl px-2.5 py-1 text-sm shadow-xs transition-all ${
              isDeleted
                ? "bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 text-slate-400 italic"
                : isMine
                ? "bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-tr-xs shadow-indigo-900/10"
                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
            }`}
          >
          {/* Reply Quote Banner */}
          {message.replyTo && !isDeleted && (
            <div
              className={`mb-1.5 p-1.5 rounded-lg text-xs border-l-3 ${
                isMine
                  ? "bg-black/15 border-white/60 text-indigo-100"
                  : "bg-slate-100 dark:bg-slate-900/80 border-indigo-500 text-slate-600 dark:text-slate-300"
              }`}
            >
              <span className="font-semibold block text-[11px] truncate">
                {message.replyTo.sender?.name || "Reply"}
              </span>
              <span className="line-clamp-1 opacity-80 text-[11px]">
                {message.replyTo.content || (message.replyTo.type === "IMAGE" ? "Photo" : "Attachment")}
              </span>
            </div>
          )}

          {/* Deleted Message Notice */}
          {isDeleted ? (
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>🚫 This message was deleted</span>
            </span>
          ) : (
            <>
              {/* Media: Image */}
              {message.type === "IMAGE" && message.mediaUrl && (
                <div className="mb-1.5 rounded-xl overflow-hidden max-w-sm max-h-72 bg-black/30">
                  <img
                    src={message.mediaUrl}
                    alt="attachment"
                    className="w-full h-full object-cover hover:scale-105 transition cursor-pointer"
                    onClick={() => window.open(message.mediaUrl || "", "_blank")}
                  />
                </div>
              )}

              {/* Media: Video */}
              {message.type === "VIDEO" && message.mediaUrl && (
                <div className="mb-1.5 rounded-xl overflow-hidden max-w-sm bg-black/40">
                  <video src={message.mediaUrl} controls className="w-full max-h-64 rounded-xl" />
                </div>
              )}

              {/* Media: Voice Note with Interactive Waveform Simulation */}
              {message.type === "VOICE" && (
                <div className="flex items-center gap-3 py-1 min-w-[200px]">
                  <button
                    onClick={toggleAudio}
                    className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow transition active:scale-95"
                  >
                    {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>

                  <div className="flex-1 flex items-center gap-1 h-6">
                    {[3, 6, 2, 8, 4, 7, 5, 3, 9, 4, 6, 2, 7, 5, 8, 3].map((height, idx) => (
                      <span
                        key={idx}
                        style={{ height: `${height * 2.5}px` }}
                        className={`w-1 rounded-full transition-all ${
                          isPlayingAudio ? "bg-white animate-pulse" : isMine ? "bg-indigo-300" : "bg-slate-400"
                        }`}
                      />
                    ))}
                  </div>

                  <span className="text-[11px] font-mono opacity-80">
                    {message.voiceDuration ? `${message.voiceDuration}s` : "0:05"}
                  </span>
                </div>
              )}

              {/* Media: File / Document */}
              {message.type === "FILE" && (
                <div className="flex items-center gap-3 p-2 rounded-xl bg-black/20 my-1">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold truncate">{message.fileName || "Document.pdf"}</p>
                    <p className="opacity-70 text-[10px]">
                      {message.fileSize ? `${Math.round(message.fileSize / 1024)} KB` : "Attachment"}
                    </p>
                  </div>
                  {message.mediaUrl && (
                    <a
                      href={message.mediaUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg hover:bg-white/10 transition"
                      title="Download File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Text Message with WhatsApp-style compact inline/trailing timestamp */}
              {message.content && (!message.type || message.type === "TEXT") ? (
                <div className="relative">
                  <p className="text-[13.5px] sm:text-[14px] leading-snug break-words text-left select-text m-0">
                    <span>{message.content}</span>
                    {/* Inline spacer to reserve space for the bottom-right timestamp without breaking line */}
                    <span
                      className={`inline-block ${
                        isMine ? "w-[54px]" : "w-[38px]"
                      } h-2.5 select-none pointer-events-none`}
                      aria-hidden="true"
                    />
                  </p>
                  <span
                    className={`absolute right-0 bottom-0 inline-flex items-center gap-0.5 text-[10px] select-none shrink-0 whitespace-nowrap leading-none pb-0.5 ${
                      isMine ? "text-indigo-200" : "text-slate-400 dark:text-slate-400"
                    }`}
                  >
                    {message.editedAt && <span className="text-[9px] opacity-80">(edited)</span>}
                    {message.isStarred && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
                    {message.isPinned && <Pin className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
                    <span>{formatTime(message.createdAt)}</span>
                    {isMine && (
                      <span className="ml-0.5">
                        {message.isOptimistic ? (
                          <Clock className="w-3 h-3 text-indigo-300 animate-spin" />
                        ) : message.status === "SEEN" ? (
                          <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                        ) : message.status === "DELIVERED" ? (
                          <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-indigo-200" />
                        )}
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                message.content && (
                  <p className="whitespace-pre-wrap break-words leading-relaxed text-[14px]">
                    {message.content}
                  </p>
                )
              )}
            </>
          )}

          {/* Footer Metadata for Non-Text or Media Messages */}
          {(!(!message.type || message.type === "TEXT") || isDeleted) && (
            <div
              className={`flex items-center gap-1.5 mt-1 text-[10px] select-none ${
                isMine ? "text-indigo-200 justify-end" : "text-slate-400 justify-start"
              }`}
            >
              {message.editedAt && <span>(edited)</span>}
              {message.isStarred && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
              {message.isPinned && <Pin className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}

              <span>{formatTime(message.createdAt)}</span>

              {/* Status indicator for my messages */}
              {isMine && (
                <span className="ml-0.5">
                  {message.isOptimistic ? (
                    <Clock className="w-3 h-3 text-indigo-300 animate-spin" />
                  ) : message.status === "SEEN" ? (
                    <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                  ) : message.status === "DELIVERED" ? (
                    <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-indigo-200" />
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Reactions Row below Bubble */}
        {reactionsMap.size > 0 && !isDeleted && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {Array.from(reactionsMap.entries()).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition-all ${
                  data.hasReacted
                    ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                    : "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700/80"
                }`}
                title={data.names.join(", ")}
              >
                <span>{emoji}</span>
                <span className="text-[10px] font-semibold">{data.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
  );
}

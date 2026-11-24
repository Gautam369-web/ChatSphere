"use client";

import React, { useEffect, useRef, useState } from "react";
import { formatDateDivider } from "@/lib/utils";
import { MessageItem, UserSummary } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { ArrowDown, MessageSquare } from "lucide-react";

interface MessageListProps {
  messages: MessageItem[];
  currentUser: UserSummary;
  isGroup: boolean;
  onReply: (message: MessageItem) => void;
  onReact: (messageId: string, emoji: string) => void;
  onPin: (messageId: string) => void;
  onStar: (messageId: string) => void;
  onEdit: (message: MessageItem) => void;
  onDelete: (messageId: string, everyone: boolean) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function MessageList({
  messages,
  currentUser,
  isGroup,
  onReply,
  onReact,
  onPin,
  onStar,
  onEdit,
  onDelete,
  onLoadMore,
  hasMore,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, [messages.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    // Show jump to bottom button if scrolled up by more than 300px
    const isUp = scrollHeight - scrollTop - clientHeight > 300;
    setShowScrollBottom(isUp);

    // Infinite scroll load more when hitting top
    if (scrollTop === 0 && hasMore && onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <div className="relative flex-1 overflow-hidden whatsapp-doodle-bg transition-colors duration-200">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-2 sm:px-4 py-2 space-y-1 select-text"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-300">No messages in this chat yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Say hello or send a file to start the conversation! Real-time messaging with typing and read receipts is active.
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMine = message.senderId === currentUser.id;
            const prevMessage = messages[index - 1];

            // Show date divider if date changes
            const showDateDivider =
              !prevMessage ||
              new Date(prevMessage.createdAt).toDateString() !==
                new Date(message.createdAt).toDateString();

            return (
              <React.Fragment key={message.id || index}>
                {showDateDivider && (
                  <div className="flex items-center justify-center my-3">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/60 px-3 py-0.5 rounded-lg shadow-xs uppercase tracking-wide">
                      {formatDateDivider(message.createdAt)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={message}
                  isMine={isMine}
                  isGroup={isGroup}
                  currentUser={currentUser}
                  onReply={onReply}
                  onReact={onReact}
                  onPin={onPin}
                  onStar={onStar}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </React.Fragment>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Floating Jump to Latest Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-4 right-6 p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/40 border border-indigo-400/30 transition-all hover:scale-105 active:scale-95 z-20"
          title="Jump to latest message"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

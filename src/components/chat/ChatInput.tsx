"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useChatStore } from "@/store/useChatStore";
import { MessageItem } from "@/types";
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  Square,
  X,
  Image as ImageIcon,
  FileText,
  Reply,
} from "lucide-react";

// Dynamically import EmojiPicker to optimize bundle
const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => <div className="p-4 text-xs text-slate-400">Loading emojis...</div>,
});

interface ChatInputProps {
  conversationId: string;
  onSendMessage: (payload: {
    content?: string;
    type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "VOICE";
    replyToId?: string | null;
    replyTo?: MessageItem | null;
    mediaUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    voiceDuration?: number | null;
  }) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
}

export function ChatInput({
  conversationId,
  onSendMessage,
  onStartTyping,
  onStopTyping,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const { replyingTo, setReplyingTo } = useChatStore();

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto focus input on desktop
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth > 768) {
      textareaRef.current?.focus();
    }
  }, [conversationId, replyingTo]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onStartTyping();

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  };

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    onSendMessage({
      content: trimmed,
      type: "TEXT",
      replyToId: replyingTo?.id || null,
      replyTo: replyingTo || null,
    });

    setContent("");
    setReplyingTo(null);
    onStopTyping();
    setShowEmojiPicker(false);

    // Reset textarea height and keep focused so mobile keyboard never closes
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // File selection & upload preview
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate/Read file data URL for immediate rendering
    const reader = new FileReader();
    reader.onload = () => {
      const resultUrl = reader.result as string;
      const isImg = file.type.startsWith("image/");
      const isVid = file.type.startsWith("video/");

      onSendMessage({
        content: `Sent ${file.name}`,
        type: isImg ? "IMAGE" : isVid ? "VIDEO" : "FILE",
        mediaUrl: resultUrl,
        fileName: file.name,
        fileSize: file.size,
        replyToId: replyingTo?.id || null,
        replyTo: replyingTo || null,
      });

      setReplyingTo(null);
    };
    reader.readAsDataURL(file);

    // reset input
    e.target.value = "";
  };

  // Clipboard paste support (paste images/screenshots directly)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            onSendMessage({
              content: "Pasted image",
              type: "IMAGE",
              mediaUrl: reader.result as string,
              fileName: "screenshot.png",
              fileSize: file.size,
              replyToId: replyingTo?.id || null,
              replyTo: replyingTo || null,
            });
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // Voice recording simulation
  const startVoiceRecording = () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopVoiceRecording = (send: boolean) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecordingVoice(false);

    if (send && recordingSeconds > 0) {
      onSendMessage({
        type: "VOICE",
        content: "Voice note",
        voiceDuration: recordingSeconds,
        replyToId: replyingTo?.id || null,
      });
      setReplyingTo(null);
    }
    setRecordingSeconds(0);
  };

  return (
    <div className="relative p-2.5 sm:p-3 border-t border-slate-200 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl shrink-0 z-20 transition-colors duration-200">
      {/* Replying Banner */}
      {replyingTo && (
        <div className="mb-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Reply className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 dark:text-slate-400">Replying to </span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                {replyingTo.sender?.name || replyingTo.sender?.username}
              </span>
              <span className="text-slate-400 dark:text-slate-500 ml-1.5 truncate">
                {replyingTo.content || "Attachment"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Voice Recording Overlay Mode */}
      {isRecordingVoice ? (
        <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-rose-500/40">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-mono font-semibold text-rose-500 dark:text-rose-400">
              Recording Voice... {recordingSeconds}s
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => stopVoiceRecording(false)}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => stopVoiceRecording(true)}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Voice</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          {/* File input attachment hidden */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.txt"
          />

          {/* Action buttons: Attach file, Emoji picker */}
          <div className="flex items-center gap-1 mb-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach File / Image"
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add Emoji"
              className={`p-2 rounded-xl transition ${
                showEmojiPicker
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80"
              }`}
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {/* Text input area */}
          <div className="flex-1 relative min-w-0">
            <textarea
              ref={textareaRef}
              rows={1}
              value={content}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              enterKeyHint="send"
              autoCapitalize="sentences"
              autoCorrect="on"
              placeholder="Type a message..."
              className="w-full max-h-32 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl py-2 sm:py-2.5 px-3 sm:px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/80 transition select-text"
            />

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-3 z-30 shadow-2xl rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 max-w-[calc(100vw-24px)] scale-90 sm:scale-100 origin-bottom-left">
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    setContent((prev) => prev + emojiData.emoji);
                    textareaRef.current?.focus();
                  }}
                  theme={"dark" as any}
                  lazyLoadEmojis
                />
              </div>
            )}
          </div>

          {/* Send or Voice Record Button */}
          <div className="mb-1">
            {content.trim() ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => {
                  // Prevent touch focus shifting away from textarea
                  textareaRef.current?.focus();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                title="Send Message"
                className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={startVoiceRecording}
                title="Record Voice Note"
                className="p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

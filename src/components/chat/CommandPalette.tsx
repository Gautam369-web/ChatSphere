"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useChatStore } from "@/store/useChatStore";
import { fastLogout } from "@/lib/logout";
import {
  Search,
  MessageSquare,
  Users,
  Moon,
  Sun,
  Settings,
  LogOut,
  X,
  ArrowRight,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewChat: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpenNewChat }: CommandPaletteProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { conversations, setActiveConversationId } = useChatStore();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredConversations = conversations.filter((c) =>
    c.name?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Search header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search conversations..."
            autoFocus
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
          {/* Quick Actions */}
          <div className="px-2 py-1 text-[10px] font-semibold uppercase text-slate-500 tracking-wider">
            Quick Actions
          </div>

          <button
            onClick={() => {
              onOpenNewChat();
              onClose();
            }}
            className="w-full p-2 rounded-xl hover:bg-slate-800 flex items-center justify-between text-slate-200 transition"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Start a new conversation</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            onClick={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              onClose();
            }}
            className="w-full p-2 rounded-xl hover:bg-slate-800 flex items-center justify-between text-slate-200 transition"
          >
            <div className="flex items-center gap-2.5">
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              <span>Toggle theme ({theme === "dark" ? "Light" : "Dark"})</span>
            </div>
            <span className="text-[10px] text-slate-500">Theme</span>
          </button>

          <button
            onClick={() => {
              onClose();
              fastLogout(session?.user?.id);
            }}
            className="w-full p-2 rounded-xl hover:bg-rose-500/10 flex items-center justify-between text-rose-300 transition"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Sign out</span>
            </div>
            <span className="text-[10px] text-rose-400">Account</span>
          </button>

          {/* Conversations Section */}
          {filteredConversations.length > 0 && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase text-slate-500 tracking-wider mt-2">
                Conversations
              </div>
              {filteredConversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveConversationId(c.id);
                    onClose();
                  }}
                  className="w-full p-2 rounded-xl hover:bg-slate-800 flex items-center justify-between text-slate-200 transition"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                      {c.isGroup ? <Users className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                    </div>
                    <span className="truncate">{c.name || "Direct Chat"}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Open</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

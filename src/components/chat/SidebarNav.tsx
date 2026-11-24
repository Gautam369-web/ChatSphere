"use client";

import React from "react";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  MessageSquare,
  Users,
  UserCheck,
  Settings,
  Shield,
  Moon,
  Sun,
  LogOut,
  Sparkles,
} from "lucide-react";

interface SidebarNavProps {
  currentTab: "chats" | "groups" | "contacts" | "settings" | "admin";
  onTabChange: (tab: "chats" | "groups" | "contacts" | "settings" | "admin") => void;
  unreadTotal: number;
}

export function SidebarNav({ currentTab, onTabChange, unreadTotal }: SidebarNavProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";

  return (
    <aside className="w-16 md:w-20 bg-slate-950/90 border-r border-slate-800/60 flex flex-col items-center py-5 justify-between select-none z-20 shrink-0">
      {/* Top Logo & Avatar */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative group cursor-pointer" onClick={() => onTabChange("settings")}>
          <div className="w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-indigo-500/50 p-0.5 bg-slate-800 shadow-md shadow-indigo-500/20 group-hover:ring-indigo-400 transition">
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-col items-center gap-3 w-full px-2">
          {/* Chats Tab */}
          <button
            onClick={() => onTabChange("chats")}
            title="All Chats"
            className={`relative p-3 rounded-2xl transition-all duration-200 ${
              currentTab === "chats"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            {unreadTotal > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-950">
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </button>

          {/* Groups & Channels Tab */}
          <button
            onClick={() => onTabChange("groups")}
            title="Channels & Groups"
            className={`p-3 rounded-2xl transition-all duration-200 ${
              currentTab === "groups"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Users className="w-5 h-5" />
          </button>

          {/* Contacts & Social Tab */}
          <button
            onClick={() => onTabChange("contacts")}
            title="Contacts & Friends"
            className={`p-3 rounded-2xl transition-all duration-200 ${
              currentTab === "contacts"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <UserCheck className="w-5 h-5" />
          </button>

          {/* Admin Dashboard (if admin) */}
          {isAdmin && (
            <button
              onClick={() => onTabChange("admin")}
              title="Admin Portal"
              className={`p-3 rounded-2xl transition-all duration-200 ${
                currentTab === "admin"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30 scale-105"
                  : "text-amber-400/80 hover:text-amber-300 hover:bg-slate-800/60"
              }`}
            >
              <Shield className="w-5 h-5" />
            </button>
          )}

          {/* Settings Tab */}
          <button
            onClick={() => onTabChange("settings")}
            title="Settings & Privacy"
            className={`p-3 rounded-2xl transition-all duration-200 ${
              currentTab === "settings"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </nav>
      </div>

      {/* Bottom Controls: Theme Toggle & Logout */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle Light/Dark Theme"
          className="p-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign Out"
          className="p-3 rounded-2xl text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}

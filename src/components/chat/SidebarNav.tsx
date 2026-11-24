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
  isChatOpen?: boolean;
}

export function SidebarNav({ currentTab, onTabChange, unreadTotal, isChatOpen }: SidebarNavProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      {/* 1. Desktop Vertical Navigation Sidebar */}
      <aside className="hidden md:flex md:w-20 bg-slate-100/80 dark:bg-slate-950/90 border-r border-slate-200 dark:border-slate-800/60 flex-col items-center py-5 justify-between select-none z-20 shrink-0 h-full transition-colors duration-200">
        {/* Top Logo & Avatar */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => onTabChange("settings")}>
            <div className="w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-indigo-500/50 p-0.5 bg-white dark:bg-slate-800 shadow-md shadow-indigo-500/20 group-hover:ring-indigo-400 transition">
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
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
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
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              {unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-950">
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
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
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
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
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
                    : "text-amber-500 hover:text-amber-600 dark:text-amber-400/80 dark:hover:text-amber-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
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
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </nav>
        </div>

        {/* Bottom Controls: Theme Toggle */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleToggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-3 rounded-2xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition"
          >
            {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Bottom Navigation Bar (Hidden when inside active chat) */}
      {!isChatOpen && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-800/80 backdrop-blur-xl flex items-center justify-around z-50 px-2 shadow-lg transition-colors duration-200">
          {/* Chats */}
          <button
            onClick={() => onTabChange("chats")}
            className={`relative p-2 rounded-xl flex flex-col items-center gap-0.5 transition ${
              currentTab === "chats"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Chats</span>
            {unreadTotal > 0 && (
              <span className="absolute top-1 right-2 min-w-[16px] h-[16px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-950">
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </button>

          {/* Groups */}
          <button
            onClick={() => onTabChange("groups")}
            className={`p-2 rounded-xl flex flex-col items-center gap-0.5 transition ${
              currentTab === "groups"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Groups</span>
          </button>

          {/* Contacts */}
          <button
            onClick={() => onTabChange("contacts")}
            className={`p-2 rounded-xl flex flex-col items-center gap-0.5 transition ${
              currentTab === "contacts"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <UserCheck className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Contacts</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => onTabChange("settings")}
            className={`p-2 rounded-xl flex flex-col items-center gap-0.5 transition ${
              currentTab === "settings"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Settings</span>
          </button>

          {/* Theme */}
          <button
            onClick={handleToggleTheme}
            className="p-2 rounded-xl flex flex-col items-center gap-0.5 text-slate-500 dark:text-slate-400 transition"
          >
            {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            <span className="text-[10px] font-semibold">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </nav>
      )}
    </>
  );
}

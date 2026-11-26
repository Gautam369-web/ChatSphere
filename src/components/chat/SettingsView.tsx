"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { fastLogout } from "@/lib/logout";
import {
  User,
  Moon,
  Sun,
  Laptop,
  Shield,
  CheckCircle,
  AlertCircle,
  Save,
  LogOut,
  Trash2,
} from "lucide-react";

export function SettingsView() {
  const { data: session, update } = useSession();
  const { theme, setTheme } = useTheme();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    bio: "",
    statusMessage: "",
    image: "",
    soundEnabled: true,
    notificationsEnabled: true,
    privacyLastSeen: "everyone",
    privacyReadReceipts: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    // Load initial profile data
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          const u = data.user;
          setFormData({
            name: u.name || "",
            username: u.username || "",
            bio: u.bio || "",
            statusMessage: u.statusMessage || "",
            image: u.image || "",
            soundEnabled: u.profile?.soundEnabled ?? true,
            notificationsEnabled: u.profile?.notificationsEnabled ?? true,
            privacyLastSeen: u.profile?.privacyLastSeen || "everyone",
            privacyReadReceipts: u.profile?.privacyReadReceipts ?? true,
          });
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        username: formData.username.trim(),
        bio: formData.bio.trim(),
        statusMessage: formData.statusMessage.trim(),
        image: formData.image.trim(),
      };

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({ type: "error", message: data.error || "Failed to update settings" });
      } else {
        setStatus({ type: "success", message: "Settings and profile updated successfully!" });
        // Update NextAuth session in background
        await update({
          name: payload.name,
          username: payload.username,
          image: payload.image,
        });
      }
    } catch {
      setStatus({ type: "error", message: "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFastLogout = async () => {
    setIsLoggingOut(true);
    await fastLogout(session?.user?.id);
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      const res = await fetch("/api/user/profile", { method: "DELETE" });
      if (res.ok) {
        setShowDeleteAccountModal(false);
        await fastLogout(session?.user?.id);
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus({ type: "error", message: data.error || "Failed to delete account" });
        setShowDeleteAccountModal(false);
      }
    } catch {
      setStatus({ type: "error", message: "Failed to delete account" });
      setShowDeleteAccountModal(false);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/70 dark:bg-slate-950/60 p-4 md:p-10 max-w-4xl mx-auto pb-28 md:pb-10 transition-colors duration-200">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings & Preferences</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize your profile, privacy, themes, and notification preferences
        </p>
      </div>

      {status && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm ${
            status.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Details Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>Public Profile</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                About / Bio
              </label>
              <textarea
                rows={2}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Share a short bio..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Status Message
              </label>
              <input
                type="text"
                value={formData.statusMessage}
                onChange={(e) => setFormData({ ...formData, statusMessage: e.target.value })}
                placeholder="e.g. Working remotely, In a meeting"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Avatar Image URL
              </label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Theme & Display Section */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <Sun className="w-4 h-4" />
            <span>Appearance & Theme</span>
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "dark", label: "Dark Mode", icon: Moon },
              { id: "light", label: "Light Mode", icon: Sun },
              { id: "system", label: "System Sync", icon: Laptop },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id as any)}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-600 dark:text-indigo-300 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Privacy & Security Section */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Privacy & Read Receipts</span>
          </h2>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Send Read Receipts (Double Blue Tick)</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Let contacts know when you have read their messages</p>
            </div>
            <input
              type="checkbox"
              checked={formData.privacyReadReceipts}
              onChange={(e) => setFormData({ ...formData, privacyReadReceipts: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Who Can See My Last Seen Status</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Control presence visibility across the platform</p>
            </div>
            <select
              value={formData.privacyLastSeen}
              onChange={(e) => setFormData({ ...formData, privacyLastSeen: e.target.value })}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl py-1.5 px-3 focus:outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">Contacts Only</option>
              <option value="nobody">Nobody</option>
            </select>
          </div>
        </div>

        {/* Save Preferences Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto py-3 px-6 rounded-2xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Preferences</span>
          </button>
        </div>

        {/* Account, Fast Logout & Delete Account Section */}
        <div className="p-6 rounded-3xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span>Account & Session</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Signed in as <strong>{session?.user?.email}</strong> (Direct ID: {session?.user?.connectCode})
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={handleFastLogout}
                disabled={isLoggingOut}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>{isLoggingOut ? "Logging out..." : "Log Out"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(true)}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl font-semibold text-xs text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Delete Account Confirmation Modal (Portaled to body) */}
      {showDeleteAccountModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => {
              if (!isDeletingAccount) setShowDeleteAccountModal(false);
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
                    Delete your account?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                    Your account, profile, contacts, and all direct chats will be{" "}
                    <span className="font-semibold text-rose-500">permanently deleted</span>. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountModal(false)}
                  disabled={isDeletingAccount}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-md shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingAccount ? "Deleting..." : "Delete Account"}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

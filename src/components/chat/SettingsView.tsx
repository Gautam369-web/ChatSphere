"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  User,
  AtSign,
  FileText,
  Smile,
  Moon,
  Sun,
  Laptop,
  Bell,
  Volume2,
  Shield,
  Eye,
  CheckCircle,
  AlertCircle,
  Save,
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
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({ type: "error", message: data.error || "Failed to update settings" });
      } else {
        setStatus({ type: "success", message: "Settings and profile updated successfully!" });
        // Update session
        update({
          name: formData.name,
          username: formData.username,
          image: formData.image,
        });
      }
    } catch {
      setStatus({ type: "error", message: "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950/60 p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings & Preferences</h1>
        <p className="text-sm text-slate-400 mt-1">
          Customize your profile, privacy, themes, and notification preferences
        </p>
      </div>

      {status && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-center gap-2.5 text-xs ${
            status.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Section */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>Public Profile</span>
          </h2>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 ring-2 ring-indigo-500/40 shrink-0">
              <img
                src={formData.image || `https://api.dicebear.com/7.x/initials/svg?seed=${formData.name || "U"}`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Avatar Image URL
              </label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Status Message</label>
              <input
                type="text"
                value={formData.statusMessage}
                onChange={(e) => setFormData({ ...formData, statusMessage: e.target.value })}
                placeholder="Available, In a meeting, etc."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Bio</label>
              <input
                type="text"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="A brief note about you"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Theme & Display Section */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <Sun className="w-4 h-4" />
            <span>Appearance</span>
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "dark", label: "Dark", icon: Moon },
              { id: "light", label: "Light", icon: Sun },
              { id: "system", label: "System", icon: Laptop },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id as any)}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition ${
                    isSelected
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
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
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Privacy & Read Receipts</span>
          </h2>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <p className="text-sm font-semibold text-white">Send Read Receipts (Double Blue Tick)</p>
              <p className="text-xs text-slate-400">Let contacts know when you have read their messages</p>
            </div>
            <input
              type="checkbox"
              checked={formData.privacyReadReceipts}
              onChange={(e) => setFormData({ ...formData, privacyReadReceipts: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <p className="text-sm font-semibold text-white">Who Can See My Last Seen Status</p>
              <p className="text-xs text-slate-400">Control presence visibility across the platform</p>
            </div>
            <select
              value={formData.privacyLastSeen}
              onChange={(e) => setFormData({ ...formData, privacyLastSeen: e.target.value })}
              className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl py-1.5 px-3 focus:outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">Contacts Only</option>
              <option value="nobody">Nobody</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="py-3 px-6 rounded-2xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}

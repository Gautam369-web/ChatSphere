"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, Mail, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string; link?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setIsLoading(true);
      setStatus(null);

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", text: data.error || "Failed to process request" });
      } else {
        setStatus({
          type: "success",
          text: data.message,
          link: data.devResetLink,
        });
      }
    } catch {
      setStatus({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-2xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Reset Password</h1>
            <p className="text-sm text-slate-400 mt-1">
              Enter your email address and we will provide a reset link.
            </p>
          </div>

          {status && (
            <div
              className={`mb-5 p-4 rounded-xl text-xs flex flex-col gap-2 ${
                status.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {status.type === "success" ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{status.text}</span>
              </div>
              {status.link && (
                <div className="mt-2 p-2 rounded bg-slate-900 border border-slate-700">
                  <span className="text-slate-400 block mb-1">Development quick reset link:</span>
                  <Link href={status.link} className="text-indigo-400 underline break-all">
                    {status.link}
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Registered Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alice@chatsphere.io"
                  required
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

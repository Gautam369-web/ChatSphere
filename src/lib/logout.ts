"use client";

import { signOut } from "next-auth/react";
import { getSocket } from "@/hooks/useSocket";

export async function fastLogout(userId?: string) {
  try {
    // 1. Disconnect real-time socket immediately
    const sock = getSocket();
    if (sock) {
      sock.disconnect();
    }

    // 2. Clear local caches immediately
    if (typeof window !== "undefined") {
      if (userId) {
        localStorage.removeItem(`chatsphere_cache_${userId}`);
      }
      // Also clear any leftover chatsphere cache keys
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("chatsphere_cache_")) {
          localStorage.removeItem(key);
        }
      });
    }

    // 3. Fire NextAuth signOut without blocking UI for long (max 350ms wait)
    await Promise.race([
      signOut({ redirect: false }),
      new Promise((resolve) => setTimeout(resolve, 350)),
    ]);
  } catch {
    // Proceed to login page regardless
  } finally {
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  }
}

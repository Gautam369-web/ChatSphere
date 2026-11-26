"use client";

import { signOut } from "next-auth/react";
import { resetSocket } from "@/hooks/useSocket";
import { useChatStore } from "@/store/useChatStore";

export async function fastLogout(userId?: string) {
  try {
    // 1. Disconnect & reset socket singleton so next login creates a fresh user socket
    resetSocket();

    // 2. Clear Zustand store and localStorage caches immediately
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      messages: {},
      onlineUsers: new Set(),
      userLastSeen: {},
      presenceSynced: false,
      typingUsers: {},
      infoPanelOpen: false,
      replyingTo: null,
      activeCall: null,
      liveNotification: null,
    });

    if (typeof window !== "undefined") {
      if (userId) {
        localStorage.removeItem(`chatsphere_cache_${userId}`);
      }
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("chatsphere_cache_")) {
          localStorage.removeItem(key);
        }
      });
    }

    // 3. Await NextAuth signOut so the HTTP-only session cookie is guaranteed cleared
    await signOut({ redirect: false });
  } catch {
    // Proceed to login page regardless
  } finally {
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  }
}

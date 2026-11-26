"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { useChatStore } from "@/store/useChatStore";
import { MessageItem } from "@/types";
import { sounds } from "@/lib/sound";

let socketInstance: Socket | null = null;

export function getSocket(): Socket | null {
  return socketInstance;
}

export function useSocket() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(socketInstance);
  const socketRef = useRef<Socket | null>(socketInstance);

  const {
    addMessage,
    updateMessage,
    removeMessage,
    setOnlineUsers,
    setUserLastSeenMap,
    setUserPresence,
    setUserTyping,
    setActiveCall,
  } = useChatStore();

  useEffect(() => {
    if (!session?.user?.id) return;

    const isNonLocal =
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1";

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL &&
      process.env.NEXT_PUBLIC_SOCKET_URL !== "http://localhost:3001"
        ? process.env.NEXT_PUBLIC_SOCKET_URL
        : isNonLocal
        ? "https://chatsphere-socket-fbcz.onrender.com"
        : process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

    if (!socketInstance) {
      socketInstance = io(socketUrl, {
        auth: {
          userId: session.user.id,
          username: session.user.username || session.user.name || "User",
        },
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        transports: ["websocket", "polling"],
      });
    }

    const socket = socketInstance;
    if (!socket) return;

    socketRef.current = socket;
    setSocket(socket);

    socket.on("connect", () => {
      console.log("[Client Socket] Connected to server, ID:", socket.id);
      setSocket(socket);
    });

    socket.on("online_users_list", (users: string[]) => {
      setOnlineUsers(users);
    });

    socket.on("user_last_seen_map", (lastSeenMap: Record<string, string>) => {
      setUserLastSeenMap(lastSeenMap || {});
    });

    socket.on(
      "presence_update",
      ({ userId, isOnline, lastSeen }: { userId: string; isOnline: boolean; lastSeen?: string }) => {
        setUserPresence(userId, isOnline, lastSeen);
      }
    );

    socket.on("user_typing", ({ conversationId, username, isTyping }: { conversationId: string; username: string; isTyping: boolean }) => {
      setUserTyping(conversationId, username, isTyping);
    });

    // Ask for Notification permission on mount if supported
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    socket.on("receive_message", (message: MessageItem) => {
      sounds.playReceived();
      addMessage(message.conversationId, message);

      const state = useChatStore.getState();
      const isViewing =
        state.activeConversationId === message.conversationId &&
        typeof document !== "undefined" &&
        !document.hidden;

      if (isViewing) {
        socket.emit("mark_messages_read", {
          conversationId: message.conversationId,
          readerId: session.user.id,
        });
        fetch(`/api/conversations/${message.conversationId}/read`, { method: "POST" }).catch(() => {});
        // Follow-up read sync in case sender's DB insert completed just after 0ms socket delivery
        setTimeout(() => {
          fetch(`/api/conversations/${message.conversationId}/read`, { method: "POST" }).catch(() => {});
        }, 600);
      } else {
        socket.emit("message_delivered", {
          conversationId: message.conversationId,
          messageId: message.id,
          senderId: message.senderId,
        });

        // WhatsApp-style live in-app dropdown banner
        state.setLiveNotification(message);
        setTimeout(() => {
          if (useChatStore.getState().liveNotification?.id === message.id) {
            useChatStore.getState().setLiveNotification(null);
          }
        }, 4500);

        // System notification if app in background
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(message.sender?.name || message.sender?.username || "New Message", {
              body: message.content || (message.type === "IMAGE" ? "Photo" : "Attachment"),
              icon: message.sender?.image || "/icons/icon-192x192.png",
            });
          } catch {}
        }
      }
    });

    socket.on("new_message_notification", (message: MessageItem) => {
      const state = useChatStore.getState();
      if (state.activeConversationId !== message.conversationId) {
        state.setLiveNotification(message);
        setTimeout(() => {
          if (useChatStore.getState().liveNotification?.id === message.id) {
            useChatStore.getState().setLiveNotification(null);
          }
        }, 4500);
      }
    });

    // Real-time status update (Instant double tick & blue tick feedback)
    socket.on("message_status_update", ({ conversationId, messageId, status }: { conversationId: string; messageId: string; status: any }) => {
      const state = useChatStore.getState();
      const rank: Record<string, number> = { SENT: 1, DELIVERED: 2, SEEN: 3 };
      const applyUpdate = (msg: MessageItem) => {
        if (msg.id === messageId || (msg.isOptimistic && msg.senderId === session?.user?.id)) {
          const currentRank = rank[msg.status || "SENT"] || 1;
          const nextRank = rank[status] || 1;
          return {
            ...msg,
            status: nextRank >= currentRank ? status : msg.status,
            isOptimistic: false,
          };
        }
        return msg;
      };

      const currentMessages = state.messages[conversationId] || [];
      state.setMessages(conversationId, currentMessages.map(applyUpdate));

      const updatedConvs = state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: conv.messages.map(applyUpdate) }
          : conv
      );
      state.setConversations(updatedConvs);
    });

    socket.on("messages_seen", ({ conversationId, readerId }: { conversationId: string; readerId: string }) => {
      const state = useChatStore.getState();
      const markSeen = (msg: MessageItem) =>
        msg.senderId !== readerId
          ? { ...msg, status: "SEEN" as any, isOptimistic: false }
          : msg;

      const currentMessages = state.messages[conversationId] || [];
      state.setMessages(conversationId, currentMessages.map(markSeen));

      const updatedConvs = state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: conv.messages.map(markSeen) }
          : conv
      );
      state.setConversations(updatedConvs);
    });

    socket.on("reaction_updated", ({ messageId, conversationId, action, reaction, emoji, userId }: any) => {
      const state = useChatStore.getState();
      const currentMessages = state.messages[conversationId] || [];
      const updated = currentMessages.map((msg) => {
        if (msg.id === messageId) {
          let reactions = [...msg.reactions];
          if (action === "added" && reaction) {
            reactions = reactions.filter((r) => !(r.userId === reaction.userId && r.emoji === reaction.emoji));
            reactions.push(reaction);
          } else if (action === "removed") {
            reactions = reactions.filter((r) => !(r.userId === userId && r.emoji === emoji));
          }
          return { ...msg, reactions };
        }
        return msg;
      });
      state.setMessages(conversationId, updated);
    });

    socket.on("message_edited", ({ conversationId, messageId, content, editedAt }: any) => {
      updateMessage(conversationId, messageId, { content, editedAt });
    });

    socket.on("message_deleted", ({ conversationId, messageId, deletedForEveryone }: any) => {
      if (deletedForEveryone) {
        updateMessage(conversationId, messageId, {
          content: "This message was deleted",
          deletedAt: new Date().toISOString(),
          mediaUrl: null,
          fileName: null,
        });
      } else {
        removeMessage(conversationId, messageId);
      }
    });

    socket.on("chat_cleared", ({ conversationId }: { conversationId: string }) => {
      const state = useChatStore.getState();
      state.setMessages(conversationId, []);
      state.setConversations(
        state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, messages: [], pinnedMessages: [], unreadCount: 0 }
            : conv
        )
      );
      if (state.activeConversationId === conversationId) {
        state.setReplyingTo(null);
      }
    });

    socket.on("conversation_deleted", ({ conversationId }: { conversationId: string }) => {
      useChatStore.getState().removeConversation(conversationId);
    });

    // Call signaling events
    socket.on("incoming_call", ({ caller, callType, conversationId, offer }: any) => {
      setActiveCall({
        caller,
        callType,
        conversationId,
        status: "incoming",
        offer,
      });
    });

    socket.on("call_accepted", ({ from, answer }: any) => {
      const current = useChatStore.getState().activeCall;
      if (current) {
        setActiveCall({ ...current, status: "connected" });
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chatsphere:call_accepted", { detail: { from, answer } }));
      }
    });

    socket.on("call_signal", ({ from, signal }: any) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chatsphere:call_signal", { detail: { from, signal } }));
      }
    });

    socket.on("call_rejected", () => {
      setActiveCall(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chatsphere:call_rejected"));
      }
    });

    socket.on("call_ended", () => {
      setActiveCall(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chatsphere:call_ended"));
      }
    });

    return () => {
      // Keep persistent singleton across page switches unless unauthenticated
    };
  }, [
    session?.user?.id,
    session?.user?.name,
    session?.user?.username,
    addMessage,
    updateMessage,
    removeMessage,
    setOnlineUsers,
    setUserLastSeenMap,
    setUserPresence,
    setUserTyping,
    setActiveCall,
  ]);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit("join_conversation", conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit("leave_conversation", conversationId);
  }, []);

  const startTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit("typing_start", { conversationId });
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit("typing_stop", { conversationId });
  }, []);

  const emitSendMessage = useCallback((message: MessageItem, memberIds?: string[]) => {
    socketRef.current?.emit("send_message", {
      ...message,
      conversationMembers: memberIds,
    });
  }, []);

  const markAsRead = useCallback((conversationId: string) => {
    socketRef.current?.emit("mark_messages_read", { conversationId });
  }, []);

  const emitReaction = useCallback((payload: any) => {
    socketRef.current?.emit("reaction_update", payload);
  }, []);

  const emitClearChat = useCallback((conversationId: string, memberIds?: string[]) => {
    (socketInstance || socketRef.current)?.emit("clear_chat", {
      conversationId,
      memberIds,
    });
  }, []);

  const emitDeleteConversation = useCallback((conversationId: string, memberIds?: string[]) => {
    (socketInstance || socketRef.current)?.emit("delete_conversation", {
      conversationId,
      memberIds,
    });
  }, []);

  const emitMessageEdit = useCallback(
    (conversationId: string, messageId: string, content: string, editedAt: string) => {
      (socketInstance || socketRef.current)?.emit("message_edit", {
        conversationId,
        messageId,
        content,
        editedAt,
      });
    },
    []
  );

  const emitMessageDelete = useCallback(
    (conversationId: string, messageId: string, deletedForEveryone: boolean) => {
      (socketInstance || socketRef.current)?.emit("message_delete", {
        conversationId,
        messageId,
        deletedForEveryone,
      });
    },
    []
  );

  const emitCall = useCallback(
    (
      recipientId: string,
      callType: "audio" | "video",
      conversationId: string,
      recipientUser?: { name?: string | null; username?: string; image?: string | null }
    ) => {
      const activeSock = socketInstance || socketRef.current;
      if (!session?.user?.id) return;

      activeSock?.emit("call_initiate", {
        recipientId,
        callType,
        conversationId,
        caller: {
          id: session.user.id,
          name: session.user.name || session.user.username || "User",
          username: session.user.username || "",
          image: session.user.image || null,
        },
      });

      setActiveCall({
        caller: {
          id: recipientId,
          name: recipientUser?.name || recipientUser?.username || "Contact",
          username: recipientUser?.username || "",
          image: recipientUser?.image || null,
        },
        callType,
        conversationId,
        status: "outgoing",
      });
    },
    [session?.user, setActiveCall]
  );

  const sendCallSignal = useCallback((to: string, signal: any) => {
    socketRef.current?.emit("call_signal", { to, signal });
  }, []);

  const endCall = useCallback((recipientId: string, conversationId: string) => {
    socketRef.current?.emit("call_end", { to: recipientId, conversationId });
    setActiveCall(null);
  }, [setActiveCall]);

  const acceptCall = useCallback((recipientId: string, answer?: any) => {
    socketRef.current?.emit("call_accept", { to: recipientId, answer });
    const current = useChatStore.getState().activeCall;
    if (current) {
      setActiveCall({ ...current, status: "connected" });
    }
  }, [setActiveCall]);

  const rejectCall = useCallback((recipientId: string) => {
    socketRef.current?.emit("call_reject", { to: recipientId });
    setActiveCall(null);
  }, [setActiveCall]);

  return useMemo(
    () => ({
      socket: socket || socketInstance || socketRef.current,
      joinConversation,
      leaveConversation,
      startTyping,
      stopTyping,
      emitSendMessage,
      markAsRead,
      emitReaction,
      emitClearChat,
      emitDeleteConversation,
      emitMessageEdit,
      emitMessageDelete,
      emitCall,
      sendCallSignal,
      endCall,
      acceptCall,
      rejectCall,
    }),
    [
      joinConversation,
      leaveConversation,
      startTyping,
      stopTyping,
      emitSendMessage,
      markAsRead,
      emitReaction,
      emitClearChat,
      emitDeleteConversation,
      emitMessageEdit,
      emitMessageDelete,
      emitCall,
      sendCallSignal,
      endCall,
      acceptCall,
      rejectCall,
    ]
  );
}

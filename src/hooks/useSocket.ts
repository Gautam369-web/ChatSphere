"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { useChatStore } from "@/store/useChatStore";
import { MessageItem } from "@/types";
import { sounds } from "@/lib/sound";

let socketInstance: Socket | null = null;

export function useSocket() {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);

  const {
    addMessage,
    updateMessage,
    removeMessage,
    setOnlineUsers,
    setUserPresence,
    setUserTyping,
    setActiveCall,
  } = useChatStore();

  useEffect(() => {
    if (!session?.user?.id) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : "http://localhost:3001");

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
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Client Socket] Connected to server, ID:", socket.id);
    });

    socket.on("online_users_list", (users: string[]) => {
      setOnlineUsers(users);
    });

    socket.on("presence_update", ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setUserPresence(userId, isOnline);
    });

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
      const currentMessages = state.messages[conversationId] || [];
      const updated = currentMessages.map((msg) => {
        if (msg.id === messageId || (msg.isOptimistic && msg.senderId === session?.user?.id)) {
          return {
            ...msg,
            status,
            isOptimistic: false,
          };
        }
        return msg;
      });
      state.setMessages(conversationId, updated);
    });

    socket.on("messages_seen", ({ conversationId, readerId }: { conversationId: string; readerId: string }) => {
      const state = useChatStore.getState();
      const currentMessages = state.messages[conversationId] || [];
      const updated = currentMessages.map((msg) => {
        if (msg.senderId !== readerId) {
          return {
            ...msg,
            status: "SEEN" as any,
            isOptimistic: false,
          };
        }
        return msg;
      });
      state.setMessages(conversationId, updated);
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

    // Call signaling events
    socket.on("incoming_call", ({ caller, callType, conversationId }: any) => {
      setActiveCall({
        caller,
        callType,
        conversationId,
        status: "incoming",
      });
    });

    socket.on("call_accepted", () => {
      const current = useChatStore.getState().activeCall;
      if (current) {
        setActiveCall({ ...current, status: "connected" });
      }
    });

    socket.on("call_rejected", () => {
      setActiveCall(null);
    });

    socket.on("call_ended", () => {
      setActiveCall(null);
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

  const emitCall = useCallback(
    (recipientId: string, callType: "audio" | "video", conversationId: string) => {
      if (!session?.user) return;
      socketRef.current?.emit("call_initiate", {
        recipientId,
        callType,
        conversationId,
        caller: {
          id: session.user.id,
          name: session.user.name,
          username: session.user.username,
          image: session.user.image,
        },
      });
      setActiveCall({
        caller: {
          id: recipientId,
          name: "Calling...",
          username: "",
          image: null,
        },
        callType,
        conversationId,
        status: "outgoing",
      });
    },
    [session?.user, setActiveCall]
  );

  const endCall = useCallback((recipientId: string, conversationId: string) => {
    socketRef.current?.emit("call_end", { to: recipientId, conversationId });
    setActiveCall(null);
  }, [setActiveCall]);

  const acceptCall = useCallback((recipientId: string) => {
    socketRef.current?.emit("call_accept", { to: recipientId });
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
      socket: socketRef.current,
      joinConversation,
      leaveConversation,
      startTyping,
      stopTyping,
      emitSendMessage,
      markAsRead,
      emitReaction,
      emitCall,
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
      emitCall,
      endCall,
      acceptCall,
      rejectCall,
    ]
  );
}

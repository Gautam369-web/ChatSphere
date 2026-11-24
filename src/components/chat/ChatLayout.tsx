"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useChatStore } from "@/store/useChatStore";
import { useSocket } from "@/hooks/useSocket";
import { SidebarNav } from "./SidebarNav";
import { ConversationList } from "./ConversationList";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { InfoPanel } from "./InfoPanel";
import { CallModal } from "./CallModal";
import { CommandPalette } from "./CommandPalette";
import { NewChatModal } from "./NewChatModal";
import { SettingsView } from "./SettingsView";
import { ContactsView } from "./ContactsView";
import { AdminView } from "./AdminView";
import { MessageItem, UserSummary } from "@/types";
import { MessageSquare, Sparkles, X } from "lucide-react";
import { sounds } from "@/lib/sound";

export function ChatLayout() {
  const { data: session } = useSession();
  const currentUser = session?.user as unknown as UserSummary;

  const {
    conversations,
    setConversations,
    upsertConversation,
    activeConversationId,
    setActiveConversationId,
    messages,
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    infoPanelOpen,
    setInfoPanelOpen,
    setReplyingTo,
    markConversationAsRead,
    onlineUsers,
    liveNotification,
    setLiveNotification,
  } = useChatStore();

  const {
    socket,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    emitSendMessage,
    markAsRead,
    emitReaction,
    emitCall,
  } = useSocket();

  const [currentTab, setCurrentTab] = useState<"chats" | "groups" | "contacts" | "settings" | "admin">("chats");
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<MessageItem | null>(null);

  const isPopStateRef = React.useRef(false);

  // Initialize base history state on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !window.history.state?.chatsphere) {
      window.history.replaceState({ chatsphere: "root" }, "");
    }
  }, []);

  // Sync mobile chat screen with browser history stack
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPopStateRef.current) return;

    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      window.scrollTo(0, 0);
    }
    if (!isMobile) return;

    if (activeConversationId) {
      if (window.history.state?.chatsphere === "chat") {
        window.history.replaceState({ chatsphere: "chat", id: activeConversationId }, "");
      } else {
        window.history.pushState({ chatsphere: "chat", id: activeConversationId }, "");
      }
    }
  }, [activeConversationId]);

  // Sync mobile tab changes with browser history
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPopStateRef.current) return;

    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    if (currentTab !== "chats") {
      if (window.history.state?.chatsphere === "tab") {
        window.history.replaceState({ chatsphere: "tab", tab: currentTab }, "");
      } else if (window.history.state?.chatsphere !== "chat" && window.history.state?.chatsphere !== "modal") {
        window.history.pushState({ chatsphere: "tab", tab: currentTab }, "");
      }
    }
  }, [currentTab]);

  // Sync mobile new chat modal with browser history
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPopStateRef.current) return;

    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    if (isNewChatModalOpen) {
      if (window.history.state?.chatsphere !== "modal") {
        window.history.pushState({ chatsphere: "modal" }, "");
      }
    }
  }, [isNewChatModalOpen]);

  // Sync mobile command palette with browser history
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPopStateRef.current) return;

    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    if (isCommandPaletteOpen) {
      if (window.history.state?.chatsphere !== "command") {
        window.history.pushState({ chatsphere: "command" }, "");
      }
    }
  }, [isCommandPaletteOpen]);

  // Handle hardware & browser back button (popstate)
  useEffect(() => {
    const handlePopState = () => {
      isPopStateRef.current = true;

      // 1. If command palette is open, close it
      if (isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
        setTimeout(() => { isPopStateRef.current = false; }, 120);
        return;
      }

      // 2. If new chat modal is open, close it
      if (isNewChatModalOpen) {
        setIsNewChatModalOpen(false);
        setTimeout(() => { isPopStateRef.current = false; }, 120);
        return;
      }

      // 3. If right info panel is open, close it
      if (useChatStore.getState().infoPanelOpen) {
        setInfoPanelOpen(false);
        setTimeout(() => { isPopStateRef.current = false; }, 120);
        return;
      }

      // 4. If mobile chat is active, close chat back to conversation list!
      if (useChatStore.getState().activeConversationId) {
        setActiveConversationId(null);
        setTimeout(() => { isPopStateRef.current = false; }, 120);
        return;
      }

      // 5. If on another tab, return to chats list
      if (currentTab !== "chats") {
        setCurrentTab("chats");
        setTimeout(() => { isPopStateRef.current = false; }, 120);
        return;
      }

      setTimeout(() => { isPopStateRef.current = false; }, 120);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [
    isCommandPaletteOpen,
    isNewChatModalOpen,
    currentTab,
    setActiveConversationId,
    setInfoPanelOpen,
  ]);

  // Mobile In-app Back button handler (syncs with history)
  const handleBackMobile = useCallback(() => {
    if (typeof window !== "undefined" && window.history.state?.chatsphere === "chat") {
      window.history.back();
    } else {
      setActiveConversationId(null);
    }
  }, [setActiveConversationId]);

  // Modal close handler (syncs with history)
  const handleCloseNewChatModal = useCallback(() => {
    if (typeof window !== "undefined" && window.history.state?.chatsphere === "modal") {
      window.history.back();
    } else {
      setIsNewChatModalOpen(false);
    }
  }, []);

  // Command palette close handler (syncs with history)
  const handleCloseCommandPalette = useCallback(() => {
    if (typeof window !== "undefined" && window.history.state?.chatsphere === "command") {
      window.history.back();
    } else {
      setIsCommandPaletteOpen(false);
    }
  }, []);

  // 1. Fetch conversations on load (runs once on mount)
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        const convs = data.conversations || [];
        setConversations(convs);
        // Select first conversation if none selected on desktop
        const currentActive = useChatStore.getState().activeConversationId;
        if (convs.length > 0 && !currentActive && typeof window !== "undefined" && window.innerWidth > 768) {
          setActiveConversationId(convs[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, [setConversations, setActiveConversationId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 2. Fetch messages strictly when active conversation ID changes
  useEffect(() => {
    if (!activeConversationId) return;

    joinConversation(activeConversationId);
    markAsRead(activeConversationId);
    markConversationAsRead(activeConversationId);

    let isMounted = true;
    fetch(`/api/conversations/${activeConversationId}/messages?limit=50`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setMessages(activeConversationId, data.messages || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load messages:", err);
      });

    // Mark as read on server
    fetch(`/api/conversations/${activeConversationId}/read`, { method: "POST" }).catch(() => {});

    // When tab regains focus/visibility while viewing this chat, mark new messages as read
    const handleFocusOrVisible = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        markAsRead(activeConversationId);
        markConversationAsRead(activeConversationId);
        fetch(`/api/conversations/${activeConversationId}/read`, { method: "POST" }).catch(() => {});
      }
    };
    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
      leaveConversation(activeConversationId);
    };
  }, [activeConversationId]);

  // 3. Handle Send Message (Instant WhatsApp-style delivery)
  const handleSendMessage = (payload: {
    content?: string;
    type?: any;
    replyToId?: string | null;
    replyTo?: MessageItem | null;
    mediaUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    voiceDuration?: number | null;
  }) => {
    if (!activeConversationId || !currentUser) return;

    const activeConv = conversations.find((c) => c.id === activeConversationId);
    const memberIds = activeConv?.members.map((m) => m.userId) || [];
    const otherMembers = memberIds.filter((id) => id !== currentUser.id);
    const isRecipientOnline = otherMembers.some((id) => onlineUsers.has(id));

    const instantId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const instantMessage: MessageItem = {
      id: instantId,
      conversationId: activeConversationId,
      senderId: currentUser.id,
      content: payload.content || null,
      type: payload.type || "TEXT",
      replyToId: payload.replyToId || null,
      replyTo: payload.replyTo || undefined,
      mediaUrl: payload.mediaUrl || null,
      fileName: payload.fileName || null,
      fileSize: payload.fileSize || null,
      voiceDuration: payload.voiceDuration || null,
      isPinned: false,
      isStarred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: currentUser,
      reactions: [],
      status: (isRecipientOnline ? "DELIVERED" : "SENT") as any,
    };

    // 1. Instantly render on screen & play sent chime (0ms latency!)
    addMessage(activeConversationId, instantMessage);
    sounds.playSent();

    // 2. Instantly push to WebSocket room without waiting for DB roundtrip (<15ms!)
    emitSendMessage(instantMessage, memberIds);

    // 3. Non-blocking asynchronous database persistence
    fetch(`/api/conversations/${activeConversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: payload.content,
        type: payload.type,
        replyToId: payload.replyToId,
        mediaUrl: payload.mediaUrl,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        voiceDuration: payload.voiceDuration,
      }),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          // Silently update temporary client ID with permanent database ID and full replyTo
          updateMessage(activeConversationId, instantId, {
            id: data.message.id,
            replyTo: data.message.replyTo || payload.replyTo || undefined,
          });
        }
      })
      .catch((err) => {
        console.error("Background message persist error:", err);
      });
  };

  // 4. Reactions
  const handleReact = async (messageId: string, emoji: string) => {
    if (!activeConversationId) return;

    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });

      if (res.ok) {
        const data = await res.json();
        emitReaction({
          conversationId: activeConversationId,
          messageId,
          emoji,
          action: data.action,
          reaction: data.reaction,
          userId: currentUser.id,
        });
      }
    } catch (err) {
      console.error("Reaction error:", err);
    }
  };

  // 5. Pin / Unpin
  const handlePin = async (messageId: string) => {
    if (!activeConversationId) return;
    try {
      const res = await fetch(`/api/messages/${messageId}/pin`, { method: "POST" });
      if (res.ok) {
        loadConversations();
      }
    } catch (err) {
      console.error("Pin error:", err);
    }
  };

  const handleUnpin = async (messageId: string) => {
    if (!activeConversationId) return;
    try {
      const res = await fetch(`/api/messages/${messageId}/pin`, { method: "DELETE" });
      if (res.ok) {
        loadConversations();
      }
    } catch (err) {
      console.error("Unpin error:", err);
    }
  };

  // 6. Star
  const handleStar = async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/star`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (activeConversationId) {
          updateMessage(activeConversationId, messageId, { isStarred: data.isStarred });
        }
      }
    } catch (err) {
      console.error("Star error:", err);
    }
  };

  // 7. Edit message
  const handleEdit = async (message: MessageItem) => {
    const newContent = prompt("Edit message:", message.content || "");
    if (!newContent || newContent === message.content) return;

    try {
      const res = await fetch(`/api/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });

      if (res.ok) {
        const data = await res.json();
        if (activeConversationId) {
          updateMessage(activeConversationId, message.id, {
            content: data.message.content,
            editedAt: data.message.editedAt,
          });
        }
      }
    } catch (err) {
      console.error("Edit error:", err);
    }
  };

  // 8. Delete message
  const handleDelete = async (messageId: string, everyone: boolean) => {
    try {
      const res = await fetch(`/api/messages/${messageId}?everyone=${everyone}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (activeConversationId) {
          if (everyone) {
            updateMessage(activeConversationId, messageId, {
              content: "This message was deleted",
              deletedAt: new Date().toISOString(),
              mediaUrl: null,
              fileName: null,
            });
          } else {
            removeMessage(activeConversationId, messageId);
          }
        }
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // 9. Create 1-to-1 conversation
  const handleCreateDirectChat = async (recipientId: string) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, isGroup: false }),
      });

      if (res.ok) {
        const data = await res.json();
        upsertConversation(data.conversation);
        setActiveConversationId(data.conversation.id);
        setCurrentTab("chats");
      }
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  // 10. Create Group
  const handleCreateGroupChat = async (payload: {
    name: string;
    description?: string;
    memberIds: string[];
    isPublic: boolean;
  }) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, isGroup: true }),
      });

      if (res.ok) {
        const data = await res.json();
        upsertConversation(data.conversation);
        setActiveConversationId(data.conversation.id);
        setCurrentTab("chats");
      }
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  // 11. Call trigger
  const handleInitiateCall = (callType: "audio" | "video") => {
    const activeConv = conversations.find((c) => c.id === activeConversationId);
    if (!activeConv || activeConv.isGroup) return;

    const otherMember = activeConv.members.find((m) => m.userId !== currentUser.id);
    if (otherMember) {
      emitCall(otherMember.userId, callType, activeConv.id, otherMember.user);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeMessages = (activeConversationId && messages[activeConversationId]) || [];

  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="flex h-screen h-[100dvh] w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 select-none relative">
      {/* WhatsApp-Style Live In-App Dropdown Notification Banner */}
      {liveNotification && (
        <div
          className="fixed top-3 left-1/2 -translate-x-1/2 z-60 w-[94%] sm:w-[420px] max-w-md bg-white/95 dark:bg-[#1f2c34]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all duration-300 animate-in slide-in-from-top-4"
          onClick={() => {
            setActiveConversationId(liveNotification.conversationId);
            setCurrentTab("chats");
            setLiveNotification(null);
          }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 ring-2 ring-emerald-500/50">
                <img
                  src={
                    liveNotification.sender?.image ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${liveNotification.sender?.name || "U"}`
                  }
                  alt={liveNotification.sender?.name || "User"}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#1f2c34]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {liveNotification.sender?.name || liveNotification.sender?.username || "Chat"}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                  Now
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                {liveNotification.content || (liveNotification.type === "IMAGE" ? "📷 Photo" : "📎 Attachment")}
              </p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setLiveNotification(null);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Primary Left Navigation Bar */}
      <SidebarNav
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          if (tab !== "chats") {
            setInfoPanelOpen(false);
          }
        }}
        unreadTotal={unreadTotal}
        isChatOpen={Boolean(activeConversationId)}
      />

      {/* 2. Middle Views based on tab */}
      {currentTab === "settings" ? (
        <SettingsView />
      ) : currentTab === "contacts" ? (
        <ContactsView onStartChat={handleCreateDirectChat} />
      ) : currentTab === "admin" ? (
        <AdminView />
      ) : (
        <>
          {/* Conversation List (Visible on mobile when no active chat is selected) */}
          <div
            className={`${
              activeConversationId ? "hidden md:flex" : "flex w-full"
            } md:w-auto h-full shrink-0`}
          >
            <ConversationList
              onSelectConversation={(id) => setActiveConversationId(id)}
              onOpenNewChatModal={() => setIsNewChatModalOpen(true)}
            />
          </div>

          {/* Chat Window Panel */}
          <main
            className={`${
              !activeConversationId ? "hidden md:flex" : "flex"
            } flex-1 flex-col h-full max-h-[100dvh] overflow-hidden bg-slate-100/50 dark:bg-slate-950 min-w-0 relative`}
          >
            {activeConversation ? (
              <>
                <ChatHeader
                  conversation={activeConversation}
                  onBackMobile={handleBackMobile}
                  onInitiateCall={handleInitiateCall}
                />

                <MessageList
                  messages={activeMessages}
                  currentUser={currentUser}
                  isGroup={activeConversation.isGroup}
                  onReply={(msg) => setReplyingTo(msg)}
                  onReact={handleReact}
                  onPin={handlePin}
                  onStar={handleStar}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />

                <ChatInput
                  conversationId={activeConversation.id}
                  onSendMessage={handleSendMessage}
                  onStartTyping={() => startTyping(activeConversation.id)}
                  onStopTyping={() => stopTyping(activeConversation.id)}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-950/70">
                <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 shadow-xl">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Select a conversation</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">
                  Choose a chat from the sidebar or click the plus button to start a new direct message or group channel.
                </p>
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="mt-5 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition active:scale-95 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start a New Chat</span>
                </button>
              </div>
            )}
          </main>

          {/* 3. Profile / Contact Info Panel (Responsive Mobile Overlay & Desktop Sidebar) */}
          {activeConversation && infoPanelOpen && (
            <div className="fixed inset-0 z-40 flex lg:static lg:inset-auto lg:z-auto lg:h-full">
              <InfoPanel
                conversation={activeConversation}
                messages={activeMessages}
                onClose={() => setInfoPanelOpen(false)}
                onUnpin={handleUnpin}
                onLeaveGroup={() => {
                  fetch(`/api/conversations/${activeConversation.id}`, { method: "DELETE" }).then(() => {
                    setActiveConversationId(null);
                    loadConversations();
                  });
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Modals & Dialogs */}
      <CallModal />
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={handleCloseNewChatModal}
        onCreateDirectChat={handleCreateDirectChat}
        onConnectByCode={(conv) => {
          upsertConversation(conv);
          setActiveConversationId(conv.id);
        }}
        onCreateGroupChat={handleCreateGroupChat}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={handleCloseCommandPalette}
        onOpenNewChat={() => setIsNewChatModalOpen(true)}
      />
    </div>
  );
}

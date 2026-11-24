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
import { MessageSquare, Sparkles } from "lucide-react";
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

    return () => {
      isMounted = false;
      leaveConversation(activeConversationId);
    };
  }, [activeConversationId]);

  // 3. Handle Send Message (Instant WhatsApp-style delivery)
  const handleSendMessage = (payload: {
    content?: string;
    type?: any;
    replyToId?: string | null;
    mediaUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    voiceDuration?: number | null;
  }) => {
    if (!activeConversationId || !currentUser) return;

    const instantId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const instantMessage: MessageItem = {
      id: instantId,
      conversationId: activeConversationId,
      senderId: currentUser.id,
      content: payload.content || null,
      type: payload.type || "TEXT",
      replyToId: payload.replyToId || null,
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
      status: "SENT" as any, // Instant single tick like WhatsApp
    };

    // 1. Instantly render on screen & play sent chime (0ms latency!)
    addMessage(activeConversationId, instantMessage);
    sounds.playSent();

    // 2. Instantly push to WebSocket room without waiting for DB roundtrip (<15ms!)
    const activeConv = conversations.find((c) => c.id === activeConversationId);
    const memberIds = activeConv?.members.map((m) => m.userId) || [];
    emitSendMessage(instantMessage, memberIds);

    // 3. Non-blocking asynchronous database persistence
    fetch(`/api/conversations/${activeConversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          // Silently update temporary client ID with permanent database ID
          updateMessage(activeConversationId, instantId, { id: data.message.id });
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
      emitCall(otherMember.userId, callType, activeConv.id);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeMessages = (activeConversationId && messages[activeConversationId]) || [];

  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans">
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
            } flex-1 flex-col h-full bg-slate-950 min-w-0 relative`}
          >
            {activeConversation ? (
              <>
                <ChatHeader
                  conversation={activeConversation}
                  onBackMobile={() => setActiveConversationId(null)}
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

          {/* 3. Right Info Panel (Desktop Toggle) */}
          {activeConversation && infoPanelOpen && (
            <div className="hidden lg:flex h-full">
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
        onClose={() => setIsNewChatModalOpen(false)}
        onCreateDirectChat={handleCreateDirectChat}
        onConnectByCode={(conv) => {
          upsertConversation(conv);
          setActiveConversationId(conv.id);
        }}
        onCreateGroupChat={handleCreateGroupChat}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenNewChat={() => setIsNewChatModalOpen(true)}
      />
    </div>
  );
}

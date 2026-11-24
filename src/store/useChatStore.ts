import { create } from "zustand";
import { ConversationItem, MessageItem, UserSummary } from "@/types";

export interface ActiveCallState {
  caller: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
  callType: "audio" | "video";
  conversationId: string;
  status: "incoming" | "outgoing" | "connected";
  offer?: any;
}

interface ChatStore {
  conversations: ConversationItem[];
  activeConversationId: string | null;
  messages: Record<string, MessageItem[]>; // conversationId -> messages
  onlineUsers: Set<string>;
  userLastSeen: Record<string, string>;
  presenceSynced: boolean;
  typingUsers: Record<string, Set<string>>; // conversationId -> Set<username>
  infoPanelOpen: boolean;
  replyingTo: MessageItem | null;
  activeCall: ActiveCallState | null;
  searchQuery: string;
  liveNotification: MessageItem | null;

  setConversations: (conversations: ConversationItem[]) => void;
  upsertConversation: (conversation: ConversationItem) => void;
  setActiveConversationId: (id: string | null) => void;
  setMessages: (conversationId: string, messages: MessageItem[]) => void;
  addMessage: (conversationId: string, message: MessageItem) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<MessageItem>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  setOnlineUsers: (userIds: string[]) => void;
  setUserLastSeenMap: (lastSeenMap: Record<string, string>) => void;
  setUserPresence: (userId: string, isOnline: boolean, lastSeen?: string) => void;
  setUserTyping: (conversationId: string, username: string, isTyping: boolean) => void;
  setInfoPanelOpen: (open: boolean) => void;
  toggleInfoPanel: () => void;
  setReplyingTo: (message: MessageItem | null) => void;
  setActiveCall: (call: ActiveCallState | null) => void;
  setSearchQuery: (query: string) => void;
  markConversationAsRead: (conversationId: string) => void;
  removeConversation: (conversationId: string) => void;
  setLiveNotification: (notification: MessageItem | null) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
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
  searchQuery: "",
  liveNotification: null,

  setLiveNotification: (notification) => set({ liveNotification: notification }),

  setConversations: (conversations) => set({ conversations }),

  upsertConversation: (conv) =>
    set((state) => {
      const index = state.conversations.findIndex((c) => c.id === conv.id);
      if (index >= 0) {
        const nextConvs = [...state.conversations];
        nextConvs[index] = { ...nextConvs[index], ...conv };
        return {
          conversations: nextConvs.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          ),
        };
      }
      return {
        conversations: [conv, ...state.conversations].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
      };
    }),

  setActiveConversationId: (id) =>
    set((state) => {
      // Clear replying to when switching conversations
      return { activeConversationId: id, replyingTo: null };
    }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: messages,
      },
    })),

  addMessage: (conversationId, message) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      // Prevent duplicates by checking if message with same id already exists
      const existingIndex = currentMessages.findIndex(
        (m) => m.id === message.id || (m.isOptimistic && m.content === message.content && m.senderId === message.senderId)
      );

      let updatedMessages: MessageItem[];
      if (existingIndex >= 0) {
        updatedMessages = [...currentMessages];
        updatedMessages[existingIndex] = message;
      } else {
        updatedMessages = [...currentMessages, message];
      }

      // Also update conversation preview in list
      const updatedConvs = state.conversations.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            updatedAt: message.createdAt,
            messages: [message],
            unreadCount:
              state.activeConversationId === conversationId
                ? 0
                : (c.unreadCount || 0) + 1,
          };
        }
        return c;
      });

      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
        conversations: updatedConvs.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
      };
    }),

  updateMessage: (conversationId, messageId, updates) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      const updatedMessages = currentMessages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      );
      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
      };
    }),

  removeMessage: (conversationId, messageId) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: currentMessages.filter((m) => m.id !== messageId),
        },
      };
    }),

  setOnlineUsers: (userIds) =>
    set((state) => {
      const onlineSet = new Set(userIds);
      const updatedConvs = state.conversations.map((conv) => ({
        ...conv,
        members: conv.members.map((m) => ({
          ...m,
          user: {
            ...m.user,
            isOnline: onlineSet.has(m.userId),
          },
        })),
      }));
      return {
        onlineUsers: onlineSet,
        presenceSynced: true,
        conversations: updatedConvs,
      };
    }),

  setUserLastSeenMap: (lastSeenMap) =>
    set((state) => ({
      userLastSeen: { ...state.userLastSeen, ...lastSeenMap },
    })),

  setUserPresence: (userId, isOnline, lastSeen) =>
    set((state) => {
      const nextOnline = new Set(state.onlineUsers);
      if (isOnline) {
        nextOnline.add(userId);
      } else {
        nextOnline.delete(userId);
      }

      const nextLastSeen = { ...state.userLastSeen };
      const effectiveLastSeen = lastSeen || (!isOnline ? new Date().toISOString() : undefined);
      if (effectiveLastSeen) {
        nextLastSeen[userId] = effectiveLastSeen;
      }

      const updatedConvs = state.conversations.map((conv) => ({
        ...conv,
        members: conv.members.map((m) =>
          m.userId === userId
            ? {
                ...m,
                user: {
                  ...m.user,
                  isOnline,
                  lastSeen: effectiveLastSeen || m.user.lastSeen,
                },
              }
            : m
        ),
      }));

      return {
        onlineUsers: nextOnline,
        userLastSeen: nextLastSeen,
        conversations: updatedConvs,
      };
    }),

  setUserTyping: (conversationId, username, isTyping) =>
    set((state) => {
      const currentTyping = state.typingUsers[conversationId] || new Set();
      const nextTyping = new Set(currentTyping);
      if (isTyping) {
        nextTyping.add(username);
      } else {
        nextTyping.delete(username);
      }
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: nextTyping,
        },
      };
    }),

  setInfoPanelOpen: (open) => set({ infoPanelOpen: open }),
  toggleInfoPanel: () => set((state) => ({ infoPanelOpen: !state.infoPanelOpen })),
  setReplyingTo: (message) => set({ replyingTo: message }),
  setActiveCall: (call) => set({ activeCall: call }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  markConversationAsRead: (conversationId) =>
    set((state) => {
      const updatedConvs = state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      );
      return { conversations: updatedConvs };
    }),

  removeConversation: (conversationId) =>
    set((state) => {
      const nextConvs = state.conversations.filter((c) => c.id !== conversationId);
      const nextMessages = { ...state.messages };
      delete nextMessages[conversationId];
      return {
        conversations: nextConvs,
        messages: nextMessages,
        activeConversationId:
          state.activeConversationId === conversationId ? null : state.activeConversationId,
      };
    }),
}));

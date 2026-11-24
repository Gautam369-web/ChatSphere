import { MessageType, DeliveryStatus, MemberRole, UserRole } from "@prisma/client";

export interface UserSummary {
  id: string;
  name: string | null;
  username: string;
  connectCode?: string | null;
  email: string;
  image: string | null;
  bio?: string | null;
  statusMessage?: string | null;
  role: UserRole;
  isOnline: boolean;
  lastSeen: Date | string;
}

export interface ReactionItem {
  id: string;
  emoji: string;
  userId: string;
  user?: {
    id: string;
    name: string | null;
    username: string;
  };
}

export interface AttachmentItem {
  id: string;
  url: string;
  type: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  replyToId?: string | null;
  type: MessageType;
  content: string | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  voiceDuration?: number | null;
  voiceWaveform?: string | null;
  isPinned: boolean;
  isStarred?: boolean;
  editedAt?: Date | string | null;
  deletedAt?: Date | string | null;
  deletedFor?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
  sender: UserSummary;
  replyTo?: {
    id: string;
    content: string | null;
    type: MessageType;
    mediaUrl?: string | null;
    sender: {
      name: string | null;
      username: string;
    };
  } | null;
  reactions: ReactionItem[];
  attachments?: AttachmentItem[];
  status?: DeliveryStatus;
  statuses?: {
    userId: string;
    status: DeliveryStatus;
  }[];
  // Client optimistic flag
  isOptimistic?: boolean;
}

export interface ConversationMemberItem {
  id: string;
  userId: string;
  role: MemberRole;
  mutedUntil?: Date | string | null;
  lastReadAt: Date | string;
  joinedAt: Date | string;
  user: UserSummary;
}

export interface ConversationItem {
  id: string;
  name: string | null;
  isGroup: boolean;
  isChannel: boolean;
  isPublic: boolean;
  avatar: string | null;
  description: string | null;
  inviteCode?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  members: ConversationMemberItem[];
  messages: MessageItem[];
  pinnedMessages?: {
    id: string;
    message: MessageItem;
  }[];
  unreadCount?: number;
}

export interface TypingIndicatorPayload {
  conversationId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface PresencePayload {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}

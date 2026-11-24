import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateDivider(date: Date | string): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export function formatLastSeen(date: Date | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "recently";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffInMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffInMinutes < 1) return "just now";

  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) {
    return `today at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `yesterday at ${timeStr}`;
  }

  return `${d.toLocaleDateString()} at ${timeStr}`;
}

export function resolveMessageStatus(
  msg: {
    senderId: string;
    createdAt: Date | string;
    status?: string | null;
    statuses?: { userId: string; status: string }[];
  },
  members: { userId: string; lastReadAt?: Date | string | null }[] = []
): "SENT" | "DELIVERED" | "SEEN" {
  const otherStatuses = (msg.statuses || []).filter((s) => s.userId !== msg.senderId);
  if (otherStatuses.some((s) => s.status === "SEEN") || msg.status === "SEEN") {
    return "SEEN";
  }

  const msgTime = new Date(msg.createdAt).getTime();
  const otherMembers = members.filter((m) => m.userId !== msg.senderId);
  if (
    otherMembers.some(
      (m) => m.lastReadAt && new Date(m.lastReadAt).getTime() >= msgTime
    )
  ) {
    return "SEEN";
  }

  if (otherStatuses.some((s) => s.status === "DELIVERED") || msg.status === "DELIVERED") {
    return "DELIVERED";
  }

  return "SENT";
}

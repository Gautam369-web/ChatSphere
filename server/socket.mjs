import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || process.env.SOCKET_PORT || 3001;
const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "ok",
      name: "ChatSphere Socket Server",
      version: "1.0.0",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    })
  );
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
});

// Map of userId -> Set of active socket IDs
const userSockets = new Map();
// Map of socketId -> userId
const socketToUser = new Map();

io.use((socket, next) => {
  const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
  const username = socket.handshake.auth?.username || socket.handshake.query?.username;

  if (!userId) {
    return next(new Error("Authentication failed: Missing userId"));
  }

  socket.data.userId = userId;
  socket.data.username = username || "Anonymous";
  next();
});

io.on("connection", (socket) => {
  const userId = socket.data.userId;
  const username = socket.data.username;

  console.log(`[Socket] User connected: ${username} (${userId}) - Socket: ${socket.id}`);

  // Track socket mappings
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socket.id);
  socketToUser.set(socket.id, userId);

  // Join personal room for direct user notifications
  socket.join(`user:${userId}`);

  // Broadcast presence online
  io.emit("presence_update", {
    userId,
    isOnline: true,
    lastSeen: new Date().toISOString(),
  });

  // Return currently online users to the freshly connected socket
  socket.emit("online_users_list", Array.from(userSockets.keys()));

  // 1. Join Conversation Room
  socket.on("join_conversation", (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`[Socket] ${username} joined conversation:${conversationId}`);
  });

  // 2. Leave Conversation Room
  socket.on("leave_conversation", (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`[Socket] ${username} left conversation:${conversationId}`);
  });

  // 3. Typing Indicators
  socket.on("typing_start", ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit("user_typing", {
      conversationId,
      userId,
      username,
      isTyping: true,
    });
  });

  socket.on("typing_stop", ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit("user_typing", {
      conversationId,
      userId,
      username,
      isTyping: false,
    });
  });

  // 4. Send Message (broadcast to conversation & notify members)
  socket.on("send_message", (message) => {
    if (!message || !message.conversationId) return;

    // Check if another user is currently in this conversation room
    const convRoom = io.sockets.adapter.rooms.get(`conversation:${message.conversationId}`);
    let otherSocketsInRoom = 0;
    if (convRoom) {
      for (const sId of convRoom) {
        if (sId !== socket.id) otherSocketsInRoom++;
      }
    }

    // Check if any recipient is connected to the socket server
    let isRecipientOnline = false;
    if (message.conversationMembers && Array.isArray(message.conversationMembers)) {
      isRecipientOnline = message.conversationMembers.some((memberId) => {
        return memberId !== userId && userSockets.has(memberId) && userSockets.get(memberId).size > 0;
      });
    }

    // Instant status feedback to sender (0ms latency!)
    if (otherSocketsInRoom > 0) {
      socket.emit("message_status_update", {
        conversationId: message.conversationId,
        messageId: message.id,
        status: "SEEN",
      });
    } else if (isRecipientOnline) {
      socket.emit("message_status_update", {
        conversationId: message.conversationId,
        messageId: message.id,
        status: "DELIVERED",
      });
    }

    // Broadcast message to everyone ELSE in the conversation room immediately
    socket.to(`conversation:${message.conversationId}`).emit("receive_message", message);
    
    // Also notify individual user rooms for conversation list preview updates and live notifications
    if (message.conversationMembers && Array.isArray(message.conversationMembers)) {
      message.conversationMembers.forEach((memberId) => {
        if (memberId !== userId) {
          io.to(`user:${memberId}`).emit("conversation_preview_update", {
            conversationId: message.conversationId,
            lastMessage: message,
          });
          io.to(`user:${memberId}`).emit("new_message_notification", message);
        }
      });
    }
  });

  // Acknowledgment when recipient receives/delivers message
  socket.on("message_delivered", ({ conversationId, messageId, senderId }) => {
    io.to(`user:${senderId}`).emit("message_status_update", {
      conversationId,
      messageId,
      status: "DELIVERED",
    });
  });

  // 5. Message Read / Seen (Double blue tick)
  socket.on("mark_messages_read", ({ conversationId, readerId }) => {
    io.to(`conversation:${conversationId}`).emit("messages_seen", {
      conversationId,
      readerId: readerId || userId,
      seenAt: new Date().toISOString(),
    });
  });

  // 6. Message Reactions
  socket.on("reaction_update", (reactionPayload) => {
    const { conversationId } = reactionPayload;
    if (conversationId) {
      io.to(`conversation:${conversationId}`).emit("reaction_updated", reactionPayload);
    }
  });

  // 7. Message Edit / Delete
  socket.on("message_edit", ({ conversationId, messageId, content, editedAt }) => {
    io.to(`conversation:${conversationId}`).emit("message_edited", {
      conversationId,
      messageId,
      content,
      editedAt,
    });
  });

  socket.on("message_delete", ({ conversationId, messageId, deletedForEveryone, deletedFor }) => {
    io.to(`conversation:${conversationId}`).emit("message_deleted", {
      conversationId,
      messageId,
      deletedForEveryone,
      deletedFor,
    });
  });

  // 8. Pinned Message
  socket.on("pin_update", (pinPayload) => {
    const { conversationId } = pinPayload;
    io.to(`conversation:${conversationId}`).emit("pin_updated", pinPayload);
  });

  // 9. WebRTC 1-to-1 Audio/Video Call Signaling
  socket.on("call_initiate", ({ recipientId, callType, caller, conversationId, offer }) => {
    console.log(`[Socket Call] Initiate ${callType} from ${caller.name} to ${recipientId}`);
    io.to(`user:${recipientId}`).emit("incoming_call", {
      caller,
      callType,
      conversationId,
      offer,
    });
  });

  socket.on("call_signal", ({ to, signal }) => {
    io.to(`user:${to}`).emit("call_signal", {
      from: userId,
      signal,
    });
  });

  socket.on("call_accept", ({ to, answer }) => {
    io.to(`user:${to}`).emit("call_accepted", {
      from: userId,
      answer,
    });
  });

  socket.on("call_reject", ({ to }) => {
    io.to(`user:${to}`).emit("call_rejected", {
      from: userId,
    });
  });

  socket.on("call_end", ({ to, conversationId }) => {
    io.to(`user:${to}`).emit("call_ended", {
      from: userId,
      conversationId,
    });
  });

  // Disconnection handler
  socket.on("disconnect", () => {
    console.log(`[Socket] User disconnected: ${username} (${userId})`);
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        userSockets.delete(userId);
        io.emit("presence_update", {
          userId,
          isOnline: false,
          lastSeen: new Date().toISOString(),
        });
      }
    }
    socketToUser.delete(socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`> ChatSphere Socket.IO Server running on http://localhost:${port}`);

  // Automatic Render / Free-tier Keep-Alive
  // Render spins down instances after 15 minutes of HTTP inactivity.
  // Pinging the public external URL every 10 minutes keeps the server awake 24/7.
  const externalUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_URL ||
    process.env.SELF_URL;

  if (externalUrl) {
    const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (well under Render's 15m limit)
    console.log(`[KeepAlive] Service active. Auto self-ping scheduled for: ${externalUrl}`);

    setInterval(async () => {
      try {
        const pingUrl = externalUrl.replace(/\/$/, "");
        const res = await fetch(pingUrl);
        console.log(`[KeepAlive] Sent self-ping to ${pingUrl} - Status: ${res.status}`);
      } catch (err) {
        console.warn(`[KeepAlive] Ping attempt to ${externalUrl} notice:`, err.message);
      }
    }, PING_INTERVAL_MS);
  } else {
    console.log(
      `[KeepAlive] Tip: Set RENDER_EXTERNAL_URL or SELF_URL in environment to enable auto 24/7 keep-alive.`
    );
  }
});

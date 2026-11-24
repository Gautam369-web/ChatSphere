# ChatSphere 🌐💬

A complete, production-ready, real-time collaboration and messaging platform inspired by Slack, WhatsApp Web, and Discord. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui design tokens, Socket.IO, PostgreSQL (Prisma ORM), Redis, and NextAuth.

---

## 🌟 Highlights & Features

### 🔐 Authentication & Profiles
- **Credentials & OAuth**: Email + Password with bcrypt, NextAuth JWT sessions, Google OAuth ready.
- **Password Recovery**: Forgot & Reset password workflows with verification tokens.
- **Profiles**: Avatar upload/URL, display name, `@username`, custom bio, and customizable status message.
- **Online Presence & Last Seen**: Real-time online/offline indicator, last seen timestamps with privacy controls (`everyone`, `contacts`, `nobody`).

### 💬 Messaging & Real-Time Engine
- **Direct & Group Chats**: 1-to-1 direct messaging, private team groups, and public channels.
- **Sub-millisecond Socket.IO**: Low latency real-time messaging with instant optimistic UI.
- **Message Status Pipeline**:
  - `SENDING`: Pending clock icon
  - `SENT`: Single checkmark
  - `DELIVERED`: Double gray checkmarks
  - `SEEN`: Double cyan checkmarks
- **Typing Indicators**: Real-time "Alice is typing..." indicators with debouncing.
- **Replies & Mentions**: Quoted message replies with jump-to-context, and `@mentions`.
- **Emoji Reactions & Picker**: Quick floating reactions (`👍`, `❤️`, `😂`, `🔥`, `🎉`, `👀`), aggregated reaction counts, and full emoji picker.
- **Message Actions**: Edit messages, Delete for Me, Delete for Everyone (with soft-delete audit), Star messages, and Pin messages to conversation.
- **Infinite Scrolling**: Cursor-paginated message history with date separators ("Today", "Yesterday").

### 📁 Media & Rich Content
- **Images & Video**: Drag-and-drop, clipboard paste (`Ctrl+V`), image lightbox preview, and video playback.
- **Voice Notes**: Interactive voice recording with duration timer, simulated waveform visualizer, and instant playback.
- **Files & Documents**: Document downloads with file size and type preview.

### 📞 WebRTC Audio & Video Calls
- 1-to-1 voice and video calling powered by WebRTC signaling through Socket.IO.
- Ringing states, mute microphone, camera toggle, and active call timer.

### 🛡️ Administration & Moderation
- **Analytics Overview**: Real-time stats (Total users, active chats, messages in 24h, pending reports).
- **User Management**: Promote or demote user roles (`USER`, `MODERATOR`, `ADMIN`).
- **Content Moderation**: Review user-filed reports with message context, Resolve or Dismiss actions.

### 🎨 Design & Accessibility
- **Glassmorphic UI**: Refined dark/light palette, backdrop blurs, soft glows, and Framer Motion micro-interactions.
- **Three-Pane Desktop Layout**: Left Nav, Conversation List, Chat Area, and Right-hand Info Panel.
- **Single-Pane Mobile Stack**: Responsive back buttons and optimized touch targets.
- **Command Palette (`Ctrl+K`)**: Rapid conversation jumping, theme switching, and account shortcuts.
- **PWA**: Installable Progressive Web App with `manifest.json` and service worker (`sw.js`).

---

## 🏗️ Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│                   ChatSphere Client                    │
│    Next.js 14 (App Router) + Zustand + TanStack Query   │
└───────────────┬────────────────────────┬───────────────┘
                │ HTTP API               │ WebSocket
                ▼                        ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│       Next.js API Routes     │ │    Socket.IO Real-time Server│
│   (Auth, Messages, Admin)    │ │(Presence, Typing, WebRTC Call)│
└───────────────┬──────────────┘ └──────────────┬───────────────┘
                │ Prisma Client                 │ Redis Adapter
                ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│      PostgreSQL Database     │ │         Redis 7 Cache        │
│   (Users, Chats, Messages)   │ │  (Pub/Sub, Presence, Typing) │
└──────────────────────────────┘ └──────────────────────────────┘
```

---

## 📁 Project Folder Structure

```
chartApplication/
├── server/
│   └── socket.mjs                # Standalone Socket.IO cluster server
├── prisma/
│   ├── schema.prisma             # Normalized relational PostgreSQL schema
│   └── seed.mjs                  # Demo users (Alice, Bob, Charlie) and conversations
├── public/
│   ├── manifest.json             # PWA Web App Manifest
│   └── sw.js                     # PWA Service Worker & push notification handler
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx    # Sign In with 1-click demo accounts
│   │   │   ├── register/page.tsx # Sign Up with username & email
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── api/
│   │   │   ├── admin/            # Stats, users & moderation APIs
│   │   │   ├── auth/             # NextAuth, register, password reset
│   │   │   ├── contacts/         # Friends & requests APIs
│   │   │   ├── conversations/    # Chats, messages, read receipts
│   │   │   ├── messages/         # Edit, delete, pin, star, reactions
│   │   │   └── users/            # Search & profile update APIs
│   │   ├── chat/page.tsx         # Main chat dashboard entry
│   │   ├── globals.css           # Glassmorphism & Tailwind styles
│   │   └── layout.tsx            # Providers & HTML root
│   ├── components/
│   │   ├── chat/
│   │   │   ├── AdminView.tsx     # Admin dashboard & report resolution
│   │   │   ├── CallModal.tsx     # WebRTC Voice & Video call overlay
│   │   │   ├── ChatHeader.tsx    # Header with title, avatar & call buttons
│   │   │   ├── ChatInput.tsx     # Textarea, voice recorder & emoji picker
│   │   │   ├── ChatLayout.tsx    # Responsive orchestrator (3-pane desktop)
│   │   │   ├── CommandPalette.tsx# Ctrl+K quick actions dialog
│   │   │   ├── ContactsView.tsx  # Contact list & friend request tabs
│   │   │   ├── ConversationList.tsx # Chat list with unread badges & search
│   │   │   ├── InfoPanel.tsx     # Right pane (members, shared media, pins)
│   │   │   ├── MessageBubble.tsx # Rich bubble (media, voice, reactions)
│   │   │   ├── MessageList.tsx   # Virtualized message scroll & date dividers
│   │   │   ├── NewChatModal.tsx  # Modal to start DM or create group
│   │   │   ├── SettingsView.tsx  # User profile & privacy preferences
│   │   │   └── SidebarNav.tsx    # Leftmost vertical navigation bar
│   │   └── providers/
│   │       └── AppProviders.tsx  # Session, QueryClient & Theme providers
│   ├── hooks/
│   │   └── useSocket.ts          # Socket.IO client lifecycle hook
│   ├── lib/
│   │   ├── auth.ts               # NextAuth configuration
│   │   ├── prisma.ts             # Prisma client singleton
│   │   ├── redis.ts              # Redis client with graceful local fallback
│   │   ├── utils.ts              # Class merging & date formatters
│   │   └── validations/          # Zod validation schemas
│   ├── store/
│   │   └── useChatStore.ts       # Zustand centralized chat state
│   └── types/
│       ├── index.ts              # Core TypeScript interfaces
│       └── next-auth.d.ts        # NextAuth session type definitions
├── tests/
│   ├── auth.test.mjs             # Tests for auth, password hashing & validation
│   ├── messages.test.mjs         # Tests for message schemas & XSS sanitization
│   └── permissions.test.mjs      # Tests for group roles and permissions
├── Dockerfile                    # Multi-stage production container
├── docker-compose.yml            # PostgreSQL + Redis + App + Socket stack
└── package.json
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Node.js 18+ (tested on Node 20 & Node 26)
- PostgreSQL and Redis (or run via Docker Compose)

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` is set (e.g. `postgresql://postgres:postgres@localhost:5432/chatsphere?schema=public`).

### 4. Migrate and Seed Database
```bash
# Push schema to database
npx prisma db push

# Seed realistic demo users and conversations
npm run prisma:seed
```

### 5. Start the Application
Run both Next.js and the Socket.IO server together:
```bash
npm run dev:all
```
Or run individually in two terminal windows:
```bash
# Terminal 1: Next.js Frontend & API (Port 3000)
npm run dev

# Terminal 2: Socket.IO Server (Port 3001)
npm run socket
```

Open `http://localhost:3000` in your browser.

---

## 👥 Demo Accounts (Instant Testing)

The seed script preconfigures accounts with password `password123`:

| Name | Email | Username | Role | Notes |
|---|---|---|---|---|
| **Alice Johnson** | `alice@chatsphere.io` | `alice` | `ADMIN` | Has admin portal privileges |
| **Bob Smith** | `bob@chatsphere.io` | `bob` | `USER` | Core engineering teammate |
| **Charlie Davis** | `charlie@chatsphere.io` | `charlie` | `USER` | DevOps & Cloud engineer |
| **Dana Scully** | `dana@chatsphere.io` | `dana` | `USER` | Security specialist |

> **Pro-Tip**: Open two browser windows (or one regular and one Incognito). Click **Alice** on one window and **Bob** on the other to immediately test real-time typing indicators, double-blue checkmarks, reactions, and calls!

---

## 🧪 Running Unit Tests
```bash
npm test
```
Runs the 8 automated unit tests covering authentication, Zod validation, XSS input sanitization, and group permission rules.

---

## 🐳 Docker Deployment
To spin up the entire production environment with Docker:
```bash
docker-compose up --build -d
```
This starts:
- `chatsphere-postgres`: Port `5432`
- `chatsphere-redis`: Port `6379`
- `chatsphere-app`: Port `3000`
- `chatsphere-socket`: Port `3001`

---

## 🔑 Environment Variables Reference

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/chatsphere?schema=public` |
| `NEXTAUTH_URL` | Base URL of Next.js app | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret key for JWT & session encryption | Any secure 32+ character random string |
| `REDIS_URL` | Redis server connection string | `redis://localhost:6379` |
| `NEXT_PUBLIC_SOCKET_URL` | Public Socket.IO URL for clients | `http://localhost:3001` |
| `SOCKET_PORT` | Port for the standalone socket server | `3001` |
| `GOOGLE_CLIENT_ID` | *(Optional)* Google OAuth Client ID | Found in Google Cloud Console |
| `GOOGLE_CLIENT_SECRET`| *(Optional)* Google OAuth Client Secret | Found in Google Cloud Console |
| `CLOUDINARY_CLOUD_NAME`| *(Optional)* Cloudinary Cloud Name | Found in Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | *(Optional)* Cloudinary API Key | Found in Cloudinary dashboard |
| `CLOUDINARY_API_SECRET`| *(Optional)* Cloudinary API Secret | Found in Cloudinary dashboard |
| `SENDGRID_API_KEY` | *(Optional)* SendGrid API Key for reset emails | Found in Twilio SendGrid |
| `EMAIL_FROM` | *(Optional)* Sender address for emails | `noreply@chatsphere.io` |

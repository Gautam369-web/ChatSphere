import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ChatSphere database...');

  // Hash demo password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@chatsphere.io' },
    update: {},
    create: {
      name: 'Alice Johnson',
      username: 'alice',
      email: 'alice@chatsphere.io',
      password: hashedPassword,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      bio: 'Product Designer & Coffee Aficionado ☕',
      statusMessage: 'Designing the future of chats 🚀',
      role: 'ADMIN',
      isOnline: true,
      emailVerified: new Date(),
      profile: {
        create: {
          theme: 'dark',
          soundEnabled: true,
          notificationsEnabled: true,
          privacyLastSeen: 'everyone',
          privacyReadReceipts: true,
        }
      }
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@chatsphere.io' },
    update: {},
    create: {
      name: 'Bob Smith',
      username: 'bob',
      email: 'bob@chatsphere.io',
      password: hashedPassword,
      image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      bio: 'Full-stack Engineer building distributed systems 💻',
      statusMessage: 'In a flow state 🎧',
      role: 'USER',
      isOnline: false,
      lastSeen: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
      emailVerified: new Date(),
      profile: {
        create: {
          theme: 'system',
          soundEnabled: true,
          notificationsEnabled: true,
          privacyLastSeen: 'everyone',
          privacyReadReceipts: true,
        }
      }
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@chatsphere.io' },
    update: {},
    create: {
      name: 'Charlie Davis',
      username: 'charlie',
      email: 'charlie@chatsphere.io',
      password: hashedPassword,
      image: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      bio: 'DevOps & Cloud Architect ☁️',
      statusMessage: 'Deploying release 2.4.0',
      role: 'USER',
      isOnline: true,
      emailVerified: new Date(),
      profile: {
        create: {
          theme: 'dark',
          soundEnabled: true,
          notificationsEnabled: true,
          privacyLastSeen: 'everyone',
          privacyReadReceipts: true,
        }
      }
    },
  });

  const dana = await prisma.user.upsert({
    where: { email: 'dana@chatsphere.io' },
    update: {},
    create: {
      name: 'Dana Scully',
      username: 'dana',
      email: 'dana@chatsphere.io',
      password: hashedPassword,
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      bio: 'Security Specialist & Cryptography lover 🔒',
      statusMessage: 'Investigating edge cases 🔍',
      role: 'USER',
      isOnline: false,
      lastSeen: new Date(Date.now() - 3 * 3600 * 1000), // 3 hours ago
      emailVerified: new Date(),
      profile: {
        create: {
          theme: 'dark',
          soundEnabled: true,
          notificationsEnabled: true,
          privacyLastSeen: 'contacts',
          privacyReadReceipts: true,
        }
      }
    },
  });

  console.log('Created Users:', [alice.username, bob.username, charlie.username, dana.username]);

  // 2. Establish Contacts / Friendships
  await prisma.contact.upsert({
    where: { senderId_receiverId: { senderId: alice.id, receiverId: bob.id } },
    update: {},
    create: { senderId: alice.id, receiverId: bob.id, status: 'ACCEPTED' },
  });

  await prisma.contact.upsert({
    where: { senderId_receiverId: { senderId: alice.id, receiverId: charlie.id } },
    update: {},
    create: { senderId: alice.id, receiverId: charlie.id, status: 'ACCEPTED' },
  });

  await prisma.contact.upsert({
    where: { senderId_receiverId: { senderId: dana.id, receiverId: alice.id } },
    update: {},
    create: { senderId: dana.id, receiverId: alice.id, status: 'ACCEPTED' },
  });

  // 3. Create 1-to-1 Conversation (Alice & Bob)
  let directChat = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      members: { every: { userId: { in: [alice.id, bob.id] } } },
    },
  });

  if (!directChat) {
    directChat = await prisma.conversation.create({
      data: {
        isGroup: false,
        members: {
          create: [
            { userId: alice.id, role: 'MEMBER' },
            { userId: bob.id, role: 'MEMBER' },
          ],
        },
      },
    });

    const m1 = await prisma.message.create({
      data: {
        conversationId: directChat.id,
        senderId: bob.id,
        content: 'Hey Alice! How is the new ChatSphere UI looking?',
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
      },
    });

    const m2 = await prisma.message.create({
      data: {
        conversationId: directChat.id,
        senderId: alice.id,
        content: 'Hey Bob! Just finished the glassmorphism header and real-time typing indicators. Take a look!',
        replyToId: m1.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 25),
      },
    });

    await prisma.reaction.create({
      data: {
        messageId: m2.id,
        userId: bob.id,
        emoji: '🔥',
      },
    });
  }

  // 4. Create Group Conversation (Product Engineering)
  let groupChat = await prisma.conversation.findFirst({
    where: { name: 'ChatSphere Core Team' },
  });

  if (!groupChat) {
    groupChat = await prisma.conversation.create({
      data: {
        name: 'ChatSphere Core Team',
        isGroup: true,
        avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
        description: 'Design, Engineering and Product discussion for ChatSphere.',
        inviteCode: 'CORE-TEAM-2026',
        members: {
          create: [
            { userId: alice.id, role: 'OWNER' },
            { userId: bob.id, role: 'ADMIN' },
            { userId: charlie.id, role: 'MEMBER' },
            { userId: dana.id, role: 'MEMBER' },
          ],
        },
      },
    });

    const gm1 = await prisma.message.create({
      data: {
        conversationId: groupChat.id,
        senderId: alice.id,
        content: 'Welcome to the ChatSphere Core Team group! 🎉 Let us build the fastest real-time chat ever.',
        isPinned: true,
        createdAt: new Date(Date.now() - 1000 * 3600 * 2),
      },
    });

    await prisma.pinnedMessage.create({
      data: {
        conversationId: groupChat.id,
        messageId: gm1.id,
        pinnedById: alice.id,
      },
    });

    await prisma.message.create({
      data: {
        conversationId: groupChat.id,
        senderId: charlie.id,
        content: 'Socket.IO clusters and Redis pub/sub are configured! Ready for high throughput.',
        createdAt: new Date(Date.now() - 1000 * 3600 * 1),
      },
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

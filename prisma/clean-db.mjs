import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("🧹 Clearing all users, conversations, and history from database...");
  try {
    await prisma.report.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.pinnedMessage.deleteMany({});
    await prisma.reaction.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.messageStatus.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.conversationMember.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.block.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.profile.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.verificationToken.deleteMany({});
    await prisma.user.deleteMany({});

    console.log("✅ Database has been completely wiped. Fresh start ready!");
  } catch (err) {
    console.error("❌ Failed to wipe database:", err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();

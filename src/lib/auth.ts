import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendLoginAlertEmail } from "@/lib/email";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
            profile(profile) {
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: profile.picture,
                username:
                  profile.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") +
                  "_" +
                  Math.floor(100 + Math.random() * 900),
                connectCode: Math.floor(10000 + Math.random() * 90000).toString(),
                role: "USER",
                emailVerified: new Date(),
              };
            },
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid email or password");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { profile: true },
        });

        if (!user || !user.password) {
          throw new Error("No user found with this email");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Incorrect password");
        }

        if (!user.emailVerified) {
          throw new Error("UNVERIFIED_EMAIL");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username || user.email.split("@")[0],
          connectCode: user.connectCode || Math.floor(10000 + Math.random() * 90000).toString(),
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const lowerEmail = user.email?.toLowerCase();
          if (lowerEmail) {
            const dbUser = await prisma.user.findUnique({
              where: { email: lowerEmail },
            });
            if (dbUser) {
              await prisma.user.update({
                where: { id: dbUser.id },
                data: {
                  emailVerified: dbUser.emailVerified || new Date(),
                  connectCode:
                    dbUser.connectCode ||
                    Math.floor(10000 + Math.random() * 90000).toString(),
                },
              });
            }
            await sendLoginAlertEmail({
              eventType: dbUser ? "USER_LOGIN" : "NEW_USER_REGISTERED",
              name: user.name,
              email: lowerEmail,
              username: (user as any).username || dbUser?.username,
              provider: "Google",
            }).catch(() => {});
          }
        } catch (err) {
          console.error("Google signIn callback warning:", err);
        }
      } else if (user.email) {
        await sendLoginAlertEmail({
          eventType: "USER_LOGIN",
          name: user.name,
          email: user.email,
          username: (user as any).username,
          provider: account?.provider || "Credentials",
        }).catch(() => {});
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.connectCode = (user as any).connectCode;

        if (!token.connectCode || !token.username) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
            });
            if (dbUser) {
              token.username = dbUser.username || dbUser.email.split("@")[0];
              token.connectCode =
                dbUser.connectCode ||
                Math.floor(10000 + Math.random() * 90000).toString();
            }
          } catch {}
        }
      }

      // Handle user profile update trigger
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.image) token.picture = session.image;
        if (session.username) token.username = session.username;
        if (session.connectCode) token.connectCode = session.connectCode;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.connectCode = token.connectCode as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "chatsphere_fallback_secret_key_987654321",
};

export default authOptions;

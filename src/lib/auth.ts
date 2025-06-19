import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Admin user
        if (
          credentials.email === process.env.ADMIN_EMAIL &&
          credentials.password === process.env.ADMIN_PASSWORD
        ) {
          return {
            id: "admin",
            email: process.env.ADMIN_EMAIL,
            role: "admin",
            allowedCompanies: ["avalern", "craftycode"]
          };
        }

        // Member user
        if (
          credentials.email === process.env.MEMBER_EMAIL &&
          credentials.password === process.env.MEMBER_PASSWORD
        ) {
          return {
            id: "member",
            email: process.env.MEMBER_EMAIL,
            role: "member",
            allowedCompanies: ["avalern"]
          };
        }

        return null;
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.allowedCompanies = user.allowedCompanies;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.allowedCompanies = token.allowedCompanies;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  }
}; 
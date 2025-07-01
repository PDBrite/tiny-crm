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
          console.log("Missing credentials");
          return null;
        }

        console.log("Checking credentials for:", credentials.email);
        console.log("Admin email from env:", process.env.ADMIN_EMAIL);
        console.log("Member email from env:", process.env.MEMBER_EMAIL);

        // Admin user
        if (
          credentials.email === process.env.ADMIN_EMAIL &&
          credentials.password === process.env.ADMIN_PASSWORD
        ) {
          console.log("Admin credentials matched");
          return {
            id: "admin",
            email: process.env.ADMIN_EMAIL,
            name: "Admin User",
            role: "admin",
            allowedCompanies: ["avalern", "craftycode"]
          };
        }

        // Member user
        if (
          credentials.email === process.env.MEMBER_EMAIL &&
          credentials.password === process.env.MEMBER_PASSWORD
        ) {
          console.log("Member credentials matched");
          return {
            id: "member",
            email: process.env.MEMBER_EMAIL,
            name: "Member User",
            role: "member",
            allowedCompanies: ["avalern"]
          };
        }

        console.log("No credentials matched");
        return null;
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.allowedCompanies = user.allowedCompanies;
      }
      
      // Add custom claims for Supabase RLS
      if (token.role) {
        token.user_role = token.role; // For frontend session
        token.claims = {
          ...(token.claims as object || {}),
          role: token.role,
        };
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.user_role as string;
        session.user.allowedCompanies = token.allowedCompanies as string[];
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login", // Error code passed in query string as ?error=
  }
}; 
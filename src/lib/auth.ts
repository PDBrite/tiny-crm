import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { UserRoleType } from "@prisma/client";
import { prisma } from "./prisma";
import { compare } from "bcrypt";

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



        try {
          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              companyAccess: {
                select: {
                  company: true
                }
              }
            }
          });

          if (!user) {
  
            return null;
          }

          // Verify password
          const isPasswordValid = await compare(credentials.password, user.passwordHash);
          
          if (!isPasswordValid) {
  
            return null;
          }



          // Get allowed companies from user's company access
          const allowedCompanies = user.companyAccess.map(access => 
            access.company.toLowerCase()
          );

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            role: user.role,
            allowedCompanies: allowedCompanies
          };
        } catch (error) {
          console.error("Error during authentication:", error);
          return null;
        }
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
        token.id = user.id;
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
        session.user.role = token.user_role as UserRoleType;
        session.user.allowedCompanies = token.allowedCompanies as string[];
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login", // Error code passed in query string as ?error=
  }
}; 
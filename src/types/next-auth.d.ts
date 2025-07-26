import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";
import { UserRoleType } from "@prisma/client";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id?: string;
      role?: UserRoleType;
      allowedCompanies?: string[];
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: UserRoleType;
    allowedCompanies?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRoleType;
    user_role?: UserRoleType;
    allowedCompanies?: string[];
    claims?: {
      role?: UserRoleType;
      [key: string]: any;
    };
  }
} 
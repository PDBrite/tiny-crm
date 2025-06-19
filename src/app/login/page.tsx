"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoginForm from "./login-form";

export default function LoginPage() {
  return <LoginForm />;
} 
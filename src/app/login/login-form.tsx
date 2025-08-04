"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");

  // Show error from URL parameter
  useState(() => {
    if (errorParam) {
      setError(`Authentication error: ${errorParam}`);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
  
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });



      if (result?.error) {
        setError(`Authentication failed: ${result.error}`);
        setIsLoading(false);
      } else if (result?.url) {
        router.push(result.url);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError("An unexpected error occurred during sign in");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md px-8 py-10 bg-white shadow-lg rounded-lg">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-center w-16 h-16 mb-4 bg-blue-600 rounded-full">
          <Building2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-center">Lead Manager</h1>
        <p className="mt-2 text-gray-600">Sign in to your account</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white font-medium bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isLoading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm">
        <p className="text-gray-600">
          Demo credentials:
        </p>
        <p className="text-gray-600">
          Admins: admin@example.com, sarah.admin@example.com, mike.admin@example.com / adminpassword
        </p>
        <p className="text-gray-600">
          Members: member@example.com, lisa.member@example.com / memberpassword
        </p>
      </div>
    </div>
  );
} 
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SignOutButton from "@/components/SignOutButton";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="p-8">Loading...</div>;
  }

  if (!session) {
    return <div className="p-8">Redirecting to login...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Welcome to the CRM</h1>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
          <p className="text-lg font-medium">
            Hello, {session.user?.email}
          </p>
          <p className="text-gray-600">
            Role: <span className="capitalize">{session.user?.role}</span>
          </p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg border">
          <h2 className="text-xl font-bold mb-3">Your Companies</h2>
          <div className="space-y-3">
            {session.user?.allowedCompanies?.map((company) => (
              <div key={company} className="p-3 bg-white rounded border">
                <h3 className="text-lg font-semibold capitalize">{company}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <a 
          href="/dashboard" 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </a>
        <SignOutButton />
      </div>
    </div>
  );
}

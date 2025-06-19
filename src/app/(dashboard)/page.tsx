"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardHome() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-xl font-medium mb-2">Redirecting...</h2>
        <p className="text-gray-500">Taking you to the dashboard</p>
      </div>
    </div>
  );
} 
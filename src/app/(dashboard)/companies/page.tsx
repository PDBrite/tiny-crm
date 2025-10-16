"use client";

import { useSession } from "next-auth/react";

export default function Companies() {
  const { data: session } = useSession({ required: true });
  const allowedCompanies = session?.user?.allowedCompanies || [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Companies</h1>

      <div className="grid gap-6 mt-6">
        {allowedCompanies.includes("avalern") && (
          <div className="p-6 border rounded-lg bg-white">
            <h2 className="text-2xl font-bold mb-4">Avalern</h2>
            <p className="mb-2">Industry: Education Technology</p>
            <p className="mb-2">Founded: 2018</p>
            <p>Avalern provides AI-powered learning solutions for K-12 schools.</p>
          </div>
        )}

        {allowedCompanies.includes("craftycode") && (
          <div className="p-6 border rounded-lg bg-white">
            <h2 className="text-2xl font-bold mb-4">Partner Company</h2>
            <p className="mb-2">Industry: Developer Tools</p>
            <p className="mb-2">Founded: 2020</p>
            <p>Partner company profile and summary.</p>
          </div>
        )}

        {allowedCompanies.length === 0 && (
          <p>You don't have access to any companies.</p>
        )}
      </div>
    </div>
  );
} 
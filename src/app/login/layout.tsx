import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Tiny CRM",
  description: "Login to the Tiny CRM system",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {children}
    </div>
  );
} 
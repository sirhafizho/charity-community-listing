"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

type ProvidersProps = {
  children: React.ReactNode;
  session?: Session | null;
};

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <Toaster richColors position="top-right" />
      {children}
    </SessionProvider>
  );
}

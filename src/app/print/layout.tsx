"use client";

import { SettingsProvider } from "@/context/SettingsContext";

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      {children}
    </SettingsProvider>
  );
}

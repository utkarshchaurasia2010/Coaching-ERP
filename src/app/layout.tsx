import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

import { createClient } from '@supabase/supabase-js';

export async function generateMetadata(): Promise<Metadata> {
  let title = "Institute ERP System";
  let description = "Comprehensive management system for coaching institutes.";
  let icons = undefined;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.from('institute_settings').select('name, tagline, logo_url').single();
    if (data) {
      title = data.name || title;
      description = data.tagline || description;
      if (data.logo_url) {
        icons = { icon: data.logo_url, apple: data.logo_url };
      }
    }
  } catch (error) {
    // Fallback to defaults
  }

  return {
    title,
    description,
    icons
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}

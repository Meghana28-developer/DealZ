import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DEALZ - Your Personal AI Shopping Concierge",
  description: "AI agent that helps you make smarter purchasing decisions through requirement extraction, comparison, review summarization, and deal scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex bg-[#0b0f19] text-[#f3f4f6]">
        {/* Persistent Sidebar */}
        <Sidebar />
        
        {/* Main Content Area */}
        <main className="flex-1 ml-64 min-h-screen flex flex-col relative">
          {children}
        </main>
      </body>
    </html>
  );
}

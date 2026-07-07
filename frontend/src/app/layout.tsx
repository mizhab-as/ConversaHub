import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "ConversaHub – Enterprise Conversational AI Platform",
  description:
    "ConversaHub powers enterprise customer support with AI-driven conversations, intelligent RAG knowledge retrieval, and seamless human escalation workflows.",
  openGraph: {
    title: "ConversaHub – Enterprise Conversational AI Platform",
    description: "AI-powered customer support for enterprise teams.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

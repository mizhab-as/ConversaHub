import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex flex-col min-h-screen">{children}</body>
    </html>
  );
}

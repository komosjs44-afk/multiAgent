import type { Metadata } from "next";

import NavBar from "@/app/_components/NavBar";

import "./globals.css";

export const metadata: Metadata = {
  title: "Career Agent",
  description: "Evidence-based Career Agent — 진로 분석 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <NavBar />
        {children}
      </body>
    </html>
  );
}

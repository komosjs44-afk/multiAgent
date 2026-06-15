import type { Metadata } from "next";

import NavBar from "@/app/_components/NavBar";

import "./globals.css";

export const metadata: Metadata = {
  title: "Gong Fit",
  description: "Gong Fit — 공기업 전산직 맞춤형 취업 준비 분석 서비스",
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

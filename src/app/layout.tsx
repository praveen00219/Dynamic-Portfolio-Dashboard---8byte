import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dynamic Portfolio Dashboard",
  description:
    "Live portfolio dashboard — CMP from Yahoo Finance, P/E ratio and latest earnings from Google Finance, refreshed every 15 seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
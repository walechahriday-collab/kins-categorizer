import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kins Footwear — Ladies Article Board",
  description: "Digital shoe categorization system for Kins Footwear",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

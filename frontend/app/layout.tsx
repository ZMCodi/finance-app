'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/context/AuthContext'
import { Sidebar } from '@/components/Sidebar'; // Import the sidebar

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <AuthProvider>
          <div className="flex min-h-screen bg-background">
            <Sidebar />
            <div className="flex-1 pl-16"> {/* Add padding for the collapsed sidebar */}
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BookshelfProvider } from "@/hooks/useBookshelf";
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
  title: "小说搜索 - 聚合多源小说搜索",
  description: "聚合多源小说搜索，一键查找热门小说",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BookshelfProvider>{children}</BookshelfProvider>
      </body>
    </html>
  );
}

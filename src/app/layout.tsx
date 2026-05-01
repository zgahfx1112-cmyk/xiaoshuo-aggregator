import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BookshelfProvider } from "@/hooks/useBookshelf";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "小说搜索 - 聚合多源小说搜索平台",
    template: "%s | 小说聚合平台",
  },
  description: "聚合多源小说搜索，一键查找热门小说。支持多个小说源聚合搜索，提供便捷的在线阅读体验。",
  keywords: ["小说", "小说搜索", "聚合搜索", "在线阅读", "网络小说", "免费小说"],
  authors: [{ name: "Xiaoshuo Team" }],
  creator: "Xiaoshuo",
  publisher: "Xiaoshuo",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "小说聚合平台",
    title: "小说搜索 - 聚合多源小说搜索平台",
    description: "聚合多源小说搜索，一键查找热门小说。支持多个小说源聚合搜索，提供便捷的在线阅读体验。",
  },
  twitter: {
    card: "summary_large_image",
    title: "小说搜索 - 聚合多源小说搜索平台",
    description: "聚合多源小说搜索，一键查找热门小说。",
  },
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
        <BookshelfProvider>
          <div className="flex-1 pb-16">{children}</div>
          <BottomNav />
        </BookshelfProvider>
      </body>
    </html>
  );
}

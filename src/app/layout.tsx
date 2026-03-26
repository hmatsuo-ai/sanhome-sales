import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import SessionWrapper from "@/components/SessionWrapper";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "サンホーム 営業統合管理システム",
  description: "営業担当者の行動・売上・経費を一元管理するシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={notoSansJP.className}>
        <SessionWrapper>
          <AuthProvider>{children}</AuthProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}

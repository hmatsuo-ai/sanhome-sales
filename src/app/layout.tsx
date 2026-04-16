import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `
(function(){
  var t = localStorage.getItem('theme');
  document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={notoSansJP.className}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <SessionWrapper session={session}>
            <AuthProvider>{children}</AuthProvider>
          </SessionWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}

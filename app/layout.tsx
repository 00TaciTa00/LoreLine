import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Providers } from "./providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Loreline",
  description: "소설 집필을 돕는 서사 타임라인 관리 도구",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // 아래 스크립트가 하이드레이션 전에 .dark를 붙이므로 서버가 그린
      // className과 달라진다. 의도한 차이라 이 요소에 한해 경고를 끈다.
      suppressHydrationWarning
    >
      <head>
        {/*
          테마를 첫 페인트 전에 정해 화면이 번쩍이는 걸 막는다.
          내용이 우리가 만든 상수라 사용자 입력이 섞이지 않는다.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

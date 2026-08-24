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
      {/*
        min-h-full이 아니라 h-full이어야 한다.
        min-height만 주면 body의 height가 auto로 남아, 안쪽 flex-1 사슬이
        전부 내용 기준으로 늘어난다. 그러면 격자의 `h-full overflow-auto`가
        기댈 높이가 없어 auto로 풀리고, 자기 안에서 스크롤하는 대신 통째로
        길어져 페이지가 스크롤된다. 그 결과 sticky로 고정해 둔 열 머리글이
        컨테이너와 함께 밀려 올라가 화면에서 사라졌다.
      */}
      <body className="h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

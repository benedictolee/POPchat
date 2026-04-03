import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'POPchat',
  description: 'AI Study Assistant with Pop-up Sub Chat',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-white text-[#1a1a1a]" style={{height: '100dvh', overflow: 'hidden'}}>{children}</body>
    </html>
  );
}

// layout.tsx 수정 예시
export const metadata: Metadata = {
  title: "POPchat",
  description: "한 화면에서 여러 질문을 해보세요.",
  // 아래 부분을 추가하세요! 복사한 content 값만 따옴표 안에 넣으면 됩니다.
  verification: {
    google: "GF572f_q5kWMiUk88gxJJTkj1B5ZO99Nmvccp1-v46o"
  },
};


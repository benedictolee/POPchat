// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POPchat',
  description: '한 화면에서 여러 질문을 해보세요. 팝업 서브 채팅 지원.',
  manifest: '/manifest.webmanifest',
  icons: { apple: '/pop-icon.png' },
  verification: {
    google: 'GF572f_q5kWMiUk88gxJJTkj1B5ZO99Nmvccp1-v46o',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-white text-[#1a1a1a]" style={{ height: '100dvh', overflow: 'hidden' }}>
        {children}
        {/* 서비스 워커를 안전하게 등록하는 스크립트 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

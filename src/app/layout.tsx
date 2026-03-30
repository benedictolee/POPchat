import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'POPchat',
  description: 'AI Study Assistant with Pop-up Sub Chat',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-[#0a0a0a] text-white min-h-screen">{children}</body>
    </html>
  );
}

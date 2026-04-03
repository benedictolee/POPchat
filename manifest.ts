import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'POPchat',
    short_name: 'POPchat',
    description: '팝업으로 즐기는 스마트한 AI 채팅',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/pop-icon.png',
        sizes: '192x192', // ⭐️ 크롬이 필수로 요구하는 사이즈 추가!
        type: 'image/png',
      },
      {
        src: '/pop-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable', // ⭐️ 안드로이드 아이콘 최적화 옵션
      },
    ],
  }
}

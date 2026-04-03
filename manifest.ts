import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'POPchat',
    short_name: 'POPchat',
    description: '팝업으로 즐기는 스마트한 AI 채팅',
    start_url: '/',
    display: 'standalone', // ⭐️ 주소창을 날려버리는 핵심 옵션
    background_color: '#ffffff', // 하얀 배경 아이콘이므로 흰색으로
    theme_color: '#ffffff',
    icons: [
      {
        // ⭐️ 우리가 public 폴더에 올린 pop-icon.png
        src: '/pop-icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}

import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'POPchat',
    short_name: 'POPchat',
    description: '팝업으로 즐기는 스마트한 AI 채팅',
    start_url: '/',
    display: 'standalone', // ⭐️ 주소창을 날려버리는 핵심 마법!
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}

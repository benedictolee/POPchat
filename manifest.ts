// src/app/manifest.ts
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
        src: '/pop-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pop-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

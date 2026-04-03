// public/sw.js
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // 크롬 PWA 설치 조건을 통과하기 위한 최소한의 fetch 핸들러
});

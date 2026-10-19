/* Kync 서비스 워커
   - 항상 인터넷에서 먼저 받아요 (업데이트가 바로 보이게)
   - 인터넷이 끊겼을 때만 마지막으로 받아둔 파일을 보여줘요
   - 같은 사이트 파일만 다뤄요 (Firebase 등 다른 주소는 건드리지 않음) */
const CACHE = 'kync-v8';
const CORE = ['./', './index.html', './kync.css', './images/doci.png', './icons/icon-192.png', './fonts/SUIT-Variable.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(async () => {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    })
  );
});

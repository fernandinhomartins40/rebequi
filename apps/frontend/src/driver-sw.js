/* global self, caches */
const CACHE = 'rebequi-driver-__DRIVER_RELEASE__';
const OFFLINE = '/motoristas/offline.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(new Request(OFFLINE, { cache: 'reload', credentials: 'omit' }))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('rebequi-driver-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || url.origin !== self.location.origin || !/^\/painel-lojista\/painel\/entregas(?:\/|$)/.test(url.pathname)) return;
  // Navigation is never cached. API, photos and mutations always use the network.
  event.respondWith(fetch(event.request).catch(async () => (await (await caches.open(CACHE)).match(OFFLINE)) ?? new Response('Sem conexão. Conecte-se para consultar suas entregas.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'DRIVER_APPLY_UPDATE') self.skipWaiting();
});

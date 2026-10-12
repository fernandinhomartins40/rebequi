/* global workbox */
importScripts('__WORKBOX_DIR__/workbox-sw.js');
workbox.setConfig({ modulePathPrefix: '__WORKBOX_DIR__/', debug: false });
workbox.core.setCacheNameDetails({ prefix: 'rebequi-partners', suffix: 'v1' });
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);
workbox.precaching.cleanupOutdatedCaches();
workbox.routing.registerRoute(new workbox.routing.NavigationRoute(workbox.precaching.createHandlerBoundToURL('/index.html'), {
  allowlist: [/^\/parceiros\/(?!sw\.js|manifest\.webmanifest|workbox-)/],
}));
// Update only on explicit consent; never reload while capture or an edit is in progress.
self.addEventListener('message', event => {
  if (event.data?.type === 'PARTNERS_APPLY_UPDATE') self.skipWaiting();
});

// StudyFlow — service worker
//
// This intentionally does NOT cache anything. The app already relies on
// cache-busting "?v=NN" query strings on its own files to make sure updates
// show up right away — a caching service worker could easily serve stale
// HTML/JS/CSS on top of that and reintroduce the exact "why isn't my update
// showing up" bugs this project has already run into. So this file exists
// only so Android/Chrome offers a real "Instalar" option instead of just
// "Criar atalho" — every request still goes straight to the network.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

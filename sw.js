// 앱 화면만 저장해 두고(오프라인에서도 열림), 날씨·AI 요청은 항상 인터넷으로 보냄
const CACHE = "closet-app-v2";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return; // API·날씨는 캐시하지 않음

  if (sameOrigin && (e.request.mode === "navigate" || url.pathname.endsWith("index.html"))) {
    // 앱 화면: 새 버전 우선, 인터넷이 없으면 저장본
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put("index.html", copy));
        return r;
      }).catch(() => caches.match("index.html"))
    );
    return;
  }
  // 아이콘·글꼴: 저장본 우선
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }))
  );
});

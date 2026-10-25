const CACHE = 'lipid-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// インストール時はHTTPキャッシュを迂回して取り直す
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(ASSETS.map(function(u){
        return fetch(new Request(u, {cache: 'reload'}))
          .then(function(res){ if (res && res.ok) return c.put(u, res); })
          .catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; })
                            .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  const req = e.request;
  if (req.method !== 'GET') return;

  const isDoc = req.mode === 'navigate' || req.destination === 'document';

  if (isDoc) {
    // ページ本体：まずネットワーク。つながらなければ保存版
    e.respondWith(
      fetch(new Request(req.url, {cache: 'no-store'}))
        .then(function(res){
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(function(c){ c.put('./index.html', copy); });
          }
          return res;
        })
        .catch(function(){
          return caches.match('./index.html').then(function(hit){
            return hit || caches.match('./');
          });
        })
    );
    return;
  }

  // 画像などの部品：保存版を使いつつ、裏で更新
  e.respondWith(
    caches.match(req).then(function(hit){
      const net = fetch(req).then(function(res){
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});

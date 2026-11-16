const CACHE = 'chuzai-v1';  // build.py が app.json の version から埋める
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './cases/case01.json',
  './cases/case01_intro.json',
  './cases/index.json',
  './cases/prologue.json',
  './art/b.json',
  './art/sets.json',
  './art/c/bg_beach.jpg',
  './art/c/bg_clinic.jpg',
  './art/c/bg_hall.jpg',
  './art/c/bg_harbor.jpg',
  './art/c/bg_inn.jpg',
  './art/c/bg_light.jpg',
  './art/c/bg_office.jpg',
  './art/c/bg_school.jpg',
  './art/c/footprints.png',
  './art/c/room_day.jpg',
  './art/c/room_night.jpg',
  './art/c/sil_gen.svg',
  './art/c/sil_hinata.svg',
  './art/c/sil_hotaru.svg',
  './art/c/sil_iwasaki.svg',
  './art/c/sil_kids.svg',
  './art/c/sil_kurokawa.svg',
  './art/c/sil_minato.svg',
  './art/c/sil_sachi.svg',
  './art/c/sil_shimura.svg',
  './art/c/sil_shiota.svg',
  './art/c/sil_tome.svg',
  './art/c/sil_you.svg',
  './art/title/island.webp',
  './art/title/island_calm.webp'
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

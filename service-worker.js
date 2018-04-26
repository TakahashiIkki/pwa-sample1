var CACHE_NAME = 'my-okamoba-cache-v2';
var urlsToCache = [
    '/',
    '/index.html',
    '/?from=hom',
    '/icon.png',
    '/icon512.png',
    '/service-worker.js'
];

/** service worker.js の各イベント */
self.addEventListener('install', function(event) {
    // インストール時処理： ファイルをキャッシュさせるような処理をここに記述する。
    console.log('[ServiceWorker] Install');

    // どれか１つでもダウンロードに失敗したら ServiceWorkerのinstall処理は失敗となる.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', function(event) {
    // Service Workerの更新
    console.log('[ServiceWorker] Activate');

    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            // Service Worker内のキャッシュをループ: ホワイトリスト内に無いキャッシュは削除.
            keys.map(key => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            })
        )).then(() => {
            self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(event) {
    // Service Worker がインストールされた状態で、
    // 他のページヘ移動したりページを更新したりすると、Service Worker は fetch イベントを受け取ります。

    event.respondWith(
        caches.match(event.request)
          .then(function(response) {
            if (response) {
                // キャッシュがあったのでそのレスポンスを返す
                return response;
            }
            // // ↓ 下のように記述する事で、キャッシュが無ければネットワークリクエストを投げるようになる。
            // return fetch(event.request);

            // ↓ 下のように書く事でリクエストを再キャッシュさせるようになる。

            // 重要：リクエストを clone する。リクエストは Stream なので
            // 一度しか処理できない。ここではキャッシュ用、fetch 用と2回
            // 必要なので、リクエストは clone しないといけない
            var fetchRequest = event.request.clone();

            return fetch(fetchRequest).then(
                function(response) {
                  // レスポンスが正しいかをチェック
                  if(!response || response.status !== 200 || response.type !== 'basic') {
                      console.log('NG Response');
                      return response;
                  }
      
                  // 重要：レスポンスを clone する。レスポンスは Stream で
                  // ブラウザ用とキャッシュ用の2回必要。なので clone して
                  // 2つの Stream があるようにする
                  var responseToCache = response.clone();
      
                  caches.open(CACHE_NAME)
                    .then(function(cache) {
                        // cloneしなかった リクエストをCache用に使用する。
                        // Cache用にCloneしたレスポンスをキャッシュする。
                        cache.put(event.request, responseToCache);
                    });
      
                    // キャッシュしなかった方のレスポンスはブラウザに渡す.
                    return response;
                }
              );
          }
        )
      );
});
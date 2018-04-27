var CACHE_NAME = 'my-okamoba-cache-v2';
var CACHE_URLS = [
    '/pwa-sample1/',
    '/pwa-sample1/index.html',
    '/pwa-sample1/?from=hom',
    '/pwa-sample1/icon.png',
    '/pwa-sample1/icon512.png',
    '/pwa-sample1/service-worker.js'
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
                return cache.addAll(CACHE_URLS).then(() => self.skipWaiting());
            })
    );
});

self.addEventListener('fetch', function(event) {
    console.log('[ServiceWorker] Fetch');

    // Service Worker がインストールされた状態で、
    // 他のページヘ移動したりページを更新したりすると、Service Worker は fetch イベントを受け取ります。

    event.respondWith(
        caches.match(event.request)
          .then(function(response) {
            if (response) {
                console.log('[ServiceWorker] Already Exist Response');
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

            return fetch(fetchRequest)
                .then(
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
                                return responseToCache;
                            });
        
                        // キャッシュしなかった方のレスポンスはブラウザに渡す.
                        return response;
                    }
              );
          }
        )
      );
});
/* ============================================================
   sw.js — Service Worker，让网站可安装并支持离线访问
   ============================================================ */
const CACHE_NAME = 'my-website-v13';

const CORE_ASSETS = [
    './',
    './index.html',
    './about.html',
    './works.html',
    './hobby.html',
    './sitemap.html',
    './changelog.html',
    './404.html',
    './css/style.css',
    './css/theme.css',
    './js/interactions.js',
    './js/extras.js',
    './js/more.js',
    './js/upgrade.js',
    './js/upgrade2.js',
    './js/upgrade3.js',
    './js/upgrade4.js',
    './js/upgrade5.js',
    './js/upgrade6.js',
    './js/upgrade7.js',
    './js/video.js',
    './media/moon-poster.png',
    './favicon.svg',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './images/banner.png',
    './images/13.jpg',
    './images/78.png'
];

/* 安装：预缓存核心资源 */
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(CORE_ASSETS).catch(function () {
                // 单个资源失败不应阻断安装
                return Promise.all(CORE_ASSETS.map(function (url) {
                    return cache.add(url).catch(function () {});
                }));
            });
        }).then(function () { return self.skipWaiting(); })
    );
});

/* 激活：清理旧版本缓存 */
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.filter(function (k) {
                return k !== CACHE_NAME;
            }).map(function (k) { return caches.delete(k); }));
        }).then(function () { return self.clients.claim(); })
    );
});

/* 请求拦截：同源资源用「网络优先，失败回缓存」，离线也能打开 */
self.addEventListener('fetch', function (event) {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // 不处理 CDN 等外部资源
    // 视频使用 Range 分段请求，交给浏览器原生处理，避免缓存逻辑干扰拖动进度
    if (url.pathname.indexOf('.mp4') !== -1) return;

    event.respondWith(
        fetch(req).then(function (res) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(function (cache) {
                cache.put(req, copy);
            });
            return res;
        }).catch(function () {
            return caches.match(req).then(function (cached) {
                return cached || caches.match('./index.html');
            });
        })
    );
});

const CACHE = "nfc-games-v21";
const RUNTIME_CACHE = "nfc-games-runtime-v1";
const EMULATOR_DATA_ORIGIN = "https://cdn.emulatorjs.org";

const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./games.js",
  "./app.js",
  "./admin.html",
  "./admin.css",
  "./admin.js",
  "./manifest.webmanifest"
];

const GAME_ASSETS = [
  "./roms/Pokemon-Blue.gb"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(APP_ASSETS).then(() => cache.addAll(GAME_ASSETS).catch(() => {}))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => ![CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

function shouldRuntimeCache(request) {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  if (url.origin === EMULATOR_DATA_ORIGIN && url.pathname.startsWith("/stable/data/")) {
    return true;
  }

  return url.origin === self.location.origin && url.pathname.includes("/roms/");
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  if (shouldRuntimeCache(event.request)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request))
  );
});

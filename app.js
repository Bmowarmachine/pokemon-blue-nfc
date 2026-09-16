const $ = (selector) => document.querySelector(selector);
const EMULATOR_DATA_URL = "https://cdn.emulatorjs.org/stable/data/";
const SAVE_FLUSH_INTERVAL_MS = 5000;

const views = [
  $("#catalogView"),
  $("#loadingView"),
  $("#setupView"),
  $("#errorView"),
  $("#gameView")
];

function show(view) {
  views.forEach(v => v.hidden = v !== view);
}

const serviceWorkerReady = registerServiceWorker();
let saveStatusTimer = 0;

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") {
    return Promise.resolve(null);
  }

  return navigator.serviceWorker
    .register("./sw.js")
    .then(() => navigator.serviceWorker.ready)
    .catch(() => null);
}

function safeText(value) {
  return String(value ?? "");
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function gameUrl(id) {
  const url = new URL(location.href);
  url.search = "";
  url.searchParams.set("game", id);
  return url.toString();
}

function gameIdFor(id, game) {
  const configuredId = Number(game.gameId);
  if (Number.isInteger(configuredId) && configuredId > 0) {
    return configuredId;
  }

  let hash = 0;
  for (const char of id) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) || 1;
}

function warmGameCache(games) {
  if (!("caches" in window)) return;

  const urls = Object.values(games)
    .map(game => game.romUrl)
    .filter(url => typeof url === "string" && (url.startsWith("./") || url.startsWith("/")));

  if (!urls.length) return;

  serviceWorkerReady.then(() => {
    caches.open("nfc-games-runtime-v1")
      .then(cache => Promise.allSettled(urls.map(url => cache.add(url))))
      .catch(() => {});
  });
}

function showSaveStatus() {
  const status = $("#saveStatus");
  status.hidden = false;
  clearTimeout(saveStatusTimer);
  saveStatusTimer = setTimeout(() => {
    status.hidden = true;
  }, 2400);
}

function renderCatalog() {
  const catalog = $("#catalog");
  catalog.innerHTML = "";

  Object.entries(window.NFC_GAMES || {}).forEach(([id, game]) => {
    const link = document.createElement("a");
    link.className = "game-card" + (game.romUrl ? "" : " disabled");
    link.href = gameUrl(id);

    const top = document.createElement("div");
    top.className = "game-card-top";

    const icon = document.createElement("div");
    icon.className = "game-icon";
    icon.textContent = safeText(game.icon || "🎮");

    const meta = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = safeText(game.title);
    const desc = document.createElement("p");
    desc.textContent = safeText(game.description || game.system);

    meta.append(title, desc);
    top.append(icon, meta);

    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = game.romUrl ? "Listo para jugar" : "Falta fuente del juego";

    link.append(top, pill);
    catalog.append(link);
  });

  show($("#catalogView"));
  warmGameCache(window.NFC_GAMES || {});
}

function showSetup(id, game) {
  $("#setupIcon").textContent = safeText(game.icon || "🎮");
  $("#setupTitle").textContent = safeText(game.title);
  $("#setupId").textContent = id;
  $("#setupSystem").textContent = safeText(game.system);
  $("#setupText").textContent =
    "El NFC y el emulador ya están listos. Solo falta indicar una fuente autorizada para este juego en games.js.";
  show($("#setupView"));
}

function fail(message) {
  $("#errorText").textContent = message;
  show($("#errorView"));
}

function prepareLoadingScreen(game) {
  $("#loadingTitle").textContent = "Abriendo " + safeText(game.title);
  $("#loadingSubtitle").textContent = "Cargando emulador y juego...";
  show($("#loadingView"));
}

function queueEmulatorStart(id, game) {
  prepareLoadingScreen(game);
  serviceWorkerReady.then(() => warmGameCache({ [id]: game }));
  Promise.race([serviceWorkerReady, delay(800)]).finally(() => startEmulator(id, game));
}

function startEmulator(id, game) {
  prepareLoadingScreen(game);

  window.EJS_player = "#game";
  window.EJS_core = game.core;
  window.EJS_gameUrl = game.romUrl;
  window.EJS_gameName = game.saveName || id;
  window.EJS_gameID = gameIdFor(id, game);
  window.EJS_pathtodata = EMULATOR_DATA_URL;
  window.EJS_startOnLoaded = true;
  window.EJS_browserMode = "mobile";
  window.EJS_language = "es-ES";
  window.EJS_volume = 0.8;
  window.EJS_askBeforeExit = false;
  window.EJS_cacheConfig = {
    enabled: true,
    cacheMaxSizeMB: 4096,
    cacheMaxAgeMins: 43200
  };
  window.EJS_fixedSaveInterval = SAVE_FLUSH_INTERVAL_MS;
  window.EJS_Buttons = {
    saveState: false,
    loadState: false,
    quickSave: false,
    quickLoad: false,
    saveSavFiles: false,
    loadSavFiles: false,
    cacheManager: false
  };

  const revealGame = () => show($("#gameView"));
  window.EJS_ready = revealGame;
  window.EJS_onGameStart = revealGame;
  window.EJS_onSaveUpdate = showSaveStatus;

  const loader = document.createElement("script");
  loader.src = EMULATOR_DATA_URL + "loader.js";
  loader.async = true;
  loader.crossOrigin = "anonymous";
  loader.onerror = () => fail("No se pudo cargar el emulador. Revisa tu conexión a Internet.");
  document.body.appendChild(loader);

  setTimeout(() => {
    if ($("#loadingView").hidden === false) {
      $("#loadingSubtitle").textContent =
        "Si tu navegador bloquea el inicio automático, toca una vez la pantalla.";
    }
  }, 4500);
}

$("#exitGame").addEventListener("click", () => {
  location.href = "./";
});

(() => {
  try {
    const games = window.NFC_GAMES || {};
    const id = new URLSearchParams(location.search).get("game");

    if (!id) {
      renderCatalog();
      return;
    }

    const game = games[id];
    if (!game) {
      fail("El NFC apunta a un juego que no existe en el catálogo: " + id);
      return;
    }

    if (!game.romUrl) {
      showSetup(id, game);
      return;
    }

    if (!/^https:\/\//i.test(game.romUrl) && !game.romUrl.startsWith("./") && !game.romUrl.startsWith("/")) {
      fail("La fuente del juego en games.js no es válida.");
      return;
    }

    queueEmulatorStart(id, game);
  } catch (error) {
    console.error(error);
    fail("Ocurrió un error al preparar el juego.");
  }
})();

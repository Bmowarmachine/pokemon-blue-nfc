const $ = (selector) => document.querySelector(selector);
const EMULATOR_DATA_URL = "https://cdn.emulatorjs.org/stable/data/";
const SAVE_FLUSH_INTERVAL_SECONDS = 5;
const SAVE_FLUSH_INTERVAL_MS = SAVE_FLUSH_INTERVAL_SECONDS * 1000;
const SAVE_FLUSH_RETRY_LIMIT = 40;
const DEFAULT_ROM_EXTENSION = "gb";
const SUPABASE_URL = "https://icwazkciwquxxzghjhur.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qd3NyB8SzL12y_LPnmosQg_mjixBtT_";
const SUPABASE_SAVE_BUCKET = "game-saves";

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
let saveFlushTimer = 0;
let saveSyncQueue = Promise.resolve();
let pageSaveHandlersInstalled = false;

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

function gameUrl(id) {
  const url = new URL(location.href);
  url.search = "";
  url.searchParams.set("game", id);
  return url.toString();
}

function hashToPositive(value) {
  let hash = 0;
  for (const char of value) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) || 1;
}

function currentTag() {
  const params = new URLSearchParams(location.search);
  const rawTag = params.get("tag") || params.get("profile") || params.get("slot");
  if (!rawTag) return "";

  return rawTag
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function romExtension(romUrl) {
  try {
    const path = new URL(romUrl, location.href).pathname;
    const extension = path.split(".").pop();
    return extension && extension.length <= 5 ? extension.toLowerCase() : DEFAULT_ROM_EXTENSION;
  } catch (error) {
    return DEFAULT_ROM_EXTENSION;
  }
}

function saveNameFor(id, game, tag) {
  const baseName = safeText(game.saveName || id)
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || id;

  if (!tag) return game.saveName || id;
  return `${baseName}--${tag}.${romExtension(game.romUrl)}`;
}

function gameIdFor(id, game, tag) {
  const configuredId = Number(game.gameId);
  if (!tag && Number.isInteger(configuredId) && configuredId > 0) {
    return configuredId;
  }

  const baseId = Number.isInteger(configuredId) && configuredId > 0 ? configuredId : id;
  return hashToPositive(`${baseId}:${id}:${tag || "default"}`);
}

async function romUrlForTag(game, tag) {
  if (!tag) return game.romUrl;

  const response = await fetch(game.romUrl, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error("No se pudo preparar la ROM para este tag NFC.");
  }

  return URL.createObjectURL(await response.blob());
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

function showSaveStatus(message = "Partida guardada") {
  const status = $("#saveStatus");
  status.textContent = message;
  status.hidden = false;
  clearTimeout(saveStatusTimer);
  saveStatusTimer = setTimeout(() => {
    status.hidden = true;
  }, 2400);
}

function cloudSavePath(id, tag) {
  return `${tag}/${id}.srm`;
}

function cloudObjectUrl(id, tag) {
  const path = cloudSavePath(id, tag)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${SUPABASE_URL}/storage/v1/object/authenticated/${SUPABASE_SAVE_BUCKET}/${path}`;
}

async function downloadCloudSave(id, tag) {
  if (!tag) return null;

  const response = await fetch(cloudObjectUrl(id, tag), {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    cache: "no-store"
  });

  if (response.status === 400 || response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Supabase no pudo descargar la partida (${response.status}).`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function uploadCloudSave(id, tag, save) {
  if (!tag || !save || !save.byteLength) return;

  const response = await fetch(cloudObjectUrl(id, tag), {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/octet-stream",
      "x-upsert": "true"
    },
    body: save
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase no pudo subir la partida (${response.status}): ${detail}`);
  }
}

function syncSaveDatabase(manager, save, id, tag) {
  const saveCopy = save ? new Uint8Array(save) : null;
  saveSyncQueue = saveSyncQueue
    .catch(() => {})
    .then(() => new Promise((resolve, reject) => {
      manager.FS.syncfs(false, error => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    }))
    .then(() => uploadCloudSave(id, tag, saveCopy))
    .then(() => showSaveStatus(tag ? "Partida guardada en la nube" : "Partida guardada"))
    .catch(error => {
      console.warn("No se pudo escribir la partida en el navegador.", error);
      showSaveStatus("Guardado local; nube pendiente");
    });

  return saveSyncQueue;
}

function flushGameSave() {
  try {
    const manager = window.EJS_emulator && window.EJS_emulator.gameManager;
    if (manager && manager.FS && typeof manager.saveSaveFiles === "function") {
      manager.saveSaveFiles();
    }
  } catch (error) {
    console.warn("No se pudo guardar la partida en este momento.", error);
  }
}

async function restoreCloudSave(manager, cloudSave) {
  if (!cloudSave || !cloudSave.byteLength || manager.__nfcCloudSaveLoaded) return;

  const savePath = manager.getSaveFilePath();
  if (!savePath) return;

  manager.__nfcCloudSaveLoaded = true;
  manager.FS.writeFile(savePath, cloudSave);
  await new Promise((resolve, reject) => {
    manager.FS.syncfs(false, error => error ? reject(error) : resolve());
  });
  manager.loadSaveFiles();
  showSaveStatus("Partida cargada desde la nube");
}

function configureAutoSaveFlush(id, tag, cloudSave, attempt = 0) {
  const emulator = window.EJS_emulator;

  if (!emulator || !emulator.gameManager || typeof emulator.menuOptionChanged !== "function") {
    if (attempt < SAVE_FLUSH_RETRY_LIMIT) {
      setTimeout(() => configureAutoSaveFlush(id, tag, cloudSave, attempt + 1), 250);
    }
    return;
  }

  if (!emulator.__nfcSaveHooksInstalled && typeof emulator.on === "function") {
    emulator.__nfcSaveHooksInstalled = true;
    emulator.on("saveSaveFiles", save => {
      if (save && save.byteLength > 0) {
        syncSaveDatabase(emulator.gameManager, save, id, tag);
      }
    });
  }

  restoreCloudSave(emulator.gameManager, cloudSave).catch(error => {
    console.warn("No se pudo restaurar la partida de Supabase.", error);
  });

  emulator.menuOptionChanged("save-save-interval", "0");
  clearInterval(saveFlushTimer);
  saveFlushTimer = setInterval(flushGameSave, SAVE_FLUSH_INTERVAL_MS);
}

function installPageSaveFlushHandlers() {
  if (pageSaveHandlersInstalled) return;
  pageSaveHandlersInstalled = true;

  window.addEventListener("pagehide", flushGameSave);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushGameSave();
    }
  });
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

async function queueEmulatorStart(id, game) {
  const tag = currentTag();
  prepareLoadingScreen(game);
  serviceWorkerReady.then(() => warmGameCache({ [id]: game }));

  try {
    const [romUrl, cloudSave] = await Promise.all([
      romUrlForTag(game, tag),
      downloadCloudSave(id, tag).catch(error => {
        console.warn(error);
        return null;
      })
    ]);
    startEmulator(id, game, tag, romUrl, cloudSave);
  } catch (error) {
    console.error(error);
    fail("No se pudo preparar la partida para este tag NFC.");
  }
}

function startEmulator(id, game, tag, romUrl, cloudSave) {
  prepareLoadingScreen(game);
  installPageSaveFlushHandlers();

  window.EJS_player = "#game";
  window.EJS_core = game.core;
  window.EJS_gameUrl = romUrl;
  window.EJS_gameName = saveNameFor(id, game, tag);
  window.EJS_gameID = gameIdFor(id, game, tag);
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
  window.EJS_defaultOptions = {
    "save-save-interval": "0"
  };
  window.EJS_Buttons = {
    saveState: false,
    loadState: false,
    quickSave: false,
    quickLoad: false,
    saveSavFiles: false,
    loadSavFiles: false,
    cacheManager: false,
    exitEmulation: false
  };

  const revealGame = () => {
    show($("#gameView"));
    configureAutoSaveFlush(id, tag, cloudSave);
  };
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

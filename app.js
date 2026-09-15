const DB_NAME = "pokemon-blue-nfc";
const DB_VERSION = 1;
const STORE = "roms";
const ROM_KEY = "pokemon-blue";

const setup = document.querySelector("#setup");
const loading = document.querySelector("#loading");
const errorPanel = document.querySelector("#error");
const errorText = document.querySelector("#errorText");
const game = document.querySelector("#game");
const romInput = document.querySelector("#romInput");
const status = document.querySelector("#status");
const resetButton = document.querySelector("#resetButton");

function showOnly(element) {
  [setup, loading, errorPanel, game].forEach((el) => {
    el.hidden = el !== element;
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredRom() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(ROM_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function saveRom(arrayBuffer) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(arrayBuffer, ROM_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteRom() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(ROM_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

function fail(message) {
  errorText.textContent = message;
  showOnly(errorPanel);
}

function startEmulator(arrayBuffer) {
  showOnly(loading);

  const romBlob = new Blob([arrayBuffer], { type: "application/octet-stream" });
  const romUrl = URL.createObjectURL(romBlob);

  window.EJS_player = "#game";
  window.EJS_core = "gb";
  window.EJS_gameUrl = romUrl;
  window.EJS_gameName = "Pokemon Blue";
  window.EJS_gameID = 1996;
  window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
  window.EJS_startOnLoaded = true;
  window.EJS_language = "es-ES";
  window.EJS_volume = 0.7;
  window.EJS_fixedSaveInterval = 7000;
  window.EJS_askBeforeExit = false;

  window.EJS_ready = () => showOnly(game);
  window.EJS_onGameStart = () => showOnly(game);

  const script = document.createElement("script");
  script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
  script.async = true;
  script.onerror = () => fail("No se pudo cargar el emulador. Revisa tu conexión a Internet.");
  document.body.appendChild(script);
}

romInput.addEventListener("change", async () => {
  const file = romInput.files?.[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".gb")) {
    status.textContent = "Selecciona un archivo .gb.";
    romInput.value = "";
    return;
  }

  try {
    status.textContent = "Guardando ROM en este navegador…";
    const buffer = await file.arrayBuffer();
    await saveRom(buffer);
    status.textContent = "Listo. Iniciando…";
    startEmulator(buffer);
  } catch (err) {
    console.error(err);
    fail("No se pudo guardar la ROM en el navegador.");
  }
});

resetButton.addEventListener("click", async () => {
  try {
    await deleteRom();
    location.href = location.pathname;
  } catch (err) {
    console.error(err);
    fail("No se pudo borrar la configuración local.");
  }
});

(async () => {
  try {
    const forceSetup = new URLSearchParams(location.search).has("setup");
    if (forceSetup) {
      showOnly(setup);
      return;
    }

    const storedRom = await getStoredRom();
    if (storedRom) startEmulator(storedRom);
    else showOnly(setup);
  } catch (err) {
    console.error(err);
    fail("Este navegador no permitió acceder al almacenamiento local.");
  }
})();

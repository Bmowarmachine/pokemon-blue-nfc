const $ = (selector) => document.querySelector(selector);

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

function safeText(value) {
  return String(value ?? "");
}

function gameUrl(id) {
  const url = new URL(location.href);
  url.search = "";
  url.searchParams.set("game", id);
  return url.toString();
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

function startEmulator(id, game) {
  show($("#loadingView"));
  $("#loadingTitle").textContent = "Abriendo " + safeText(game.title);
  $("#loadingSubtitle").textContent = "Cargando emulador y juego…";

  window.EJS_player = "#game";
  window.EJS_core = game.core;
  window.EJS_gameUrl = game.romUrl;
  window.EJS_gameName = game.title;
  window.EJS_gameID = id;
  window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
  window.EJS_startOnLoaded = true;
  window.EJS_language = "es-ES";
  window.EJS_volume = 0.8;
  window.EJS_askBeforeExit = false;

  const revealGame = () => show($("#gameView"));
  window.EJS_ready = revealGame;
  window.EJS_onGameStart = revealGame;

  const loader = document.createElement("script");
  loader.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
  loader.async = true;
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

    startEmulator(id, game);
  } catch (error) {
    console.error(error);
    fail("Ocurrió un error al preparar el juego.");
  }
})();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

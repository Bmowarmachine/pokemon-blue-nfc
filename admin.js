const REPO_OWNER = "Bmowarmachine";
const REPO_NAME = "pokemon-blue-nfc";
const REPO_BRANCH = "main";
const GITHUB_API = "https://api.github.com";
const SUPABASE_URL = "https://icwazkciwquxxzghjhur.supabase.co";
const SUPABASE_KEY = "sb_publishable_qd3NyB8SzL12y_LPnmosQg_mjixBtT_";
const SAVE_BUCKET = "game-saves";

const $ = selector => document.querySelector(selector);
let githubToken = "";
let games = {};
let tags = [];

function slugify(value) {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function encodeBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function encodeText(value) {
  return encodeBase64(new TextEncoder().encode(value));
}

function decodeText(value) {
  const binary = atob(value.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function github(path, options = {}) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers
    }
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.message || `GitHub respondió ${response.status}.`);
  }
  return response.status === 204 ? null : response.json();
}

function parseGames(source) {
  const match = source.match(/window\.NFC_GAMES\s*=\s*([\s\S]*);\s*$/);
  if (!match) throw new Error("No se pudo leer games.js.");
  return JSON.parse(match[1]);
}

function serializeGames(value) {
  return `window.NFC_GAMES = ${JSON.stringify(value, null, 2)};\n`;
}

async function readRepoFile(path) {
  return github(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${REPO_BRANCH}`);
}

async function loadRepositoryData() {
  const [gamesFile, tagsTree] = await Promise.all([
    readRepoFile("games.js"),
    github(`/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${REPO_BRANCH}?recursive=1`)
  ]);
  games = parseGames(decodeText(gamesFile.content));

  const tagFiles = tagsTree.tree.filter(item => /^tags\/[^/]+\/tag\.json$/.test(item.path));
  tags = (await Promise.all(tagFiles.map(async item => {
    try {
      const file = await readRepoFile(item.path);
      return JSON.parse(decodeText(file.content));
    } catch (error) {
      return null;
    }
  }))).filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function commitFiles(files, message) {
  const refPath = `/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${REPO_BRANCH}`;
  const ref = await github(refPath);
  const baseCommit = await github(`/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${ref.object.sha}`);
  const blobs = await Promise.all(files.map(file => github(`/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content: file.content, encoding: "base64" })
  })));
  const tree = await github(`/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: files.map((file, index) => ({ path: file.path, mode: "100644", type: "blob", sha: blobs[index].sha }))
    })
  });
  const commit = await github(`/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] })
  });
  await github(refPath, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
  return commit;
}

function showBusy(message) {
  $("#busyText").textContent = message;
  $("#busyOverlay").hidden = false;
}

function hideBusy() {
  $("#busyOverlay").hidden = true;
}

function showResult(title, text, url = "") {
  $("#resultTitle").textContent = title;
  $("#resultText").textContent = text;
  $("#resultUrl").value = url;
  $("#resultUrlRow").hidden = !url;
  $("#resultPanel").hidden = false;
}

function renderGames() {
  const list = $("#gamesList");
  list.innerHTML = "";
  Object.entries(games).forEach(([id, game]) => {
    const row = document.createElement("div");
    row.className = "data-row";
    const details = document.createElement("div");
    details.innerHTML = `<div class="data-title"></div><div class="data-meta"></div>`;
    details.querySelector(".data-title").textContent = `${game.icon || "🎮"} ${game.title}`;
    details.querySelector(".data-meta").textContent = game.romUrl || "ROM pendiente";
    const state = document.createElement("span");
    state.className = "tag-label";
    state.textContent = game.romUrl ? "Publicado" : "Pendiente";
    row.append(details, state);
    list.append(row);
  });

  const select = $("#tagGame");
  select.innerHTML = "";
  Object.entries(games).filter(([, game]) => game.romUrl).forEach(([id, game]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = game.title;
    select.append(option);
  });
}

function renderTags() {
  const list = $("#tagsList");
  list.innerHTML = "";
  if (!tags.length) {
    list.innerHTML = '<div class="empty">Todavía no hay tags creados desde el panel.</div>';
    return;
  }
  tags.forEach(tag => {
    const row = document.createElement("div");
    row.className = "data-row";
    const details = document.createElement("div");
    details.innerHTML = `<div class="data-title"></div><div class="data-meta"></div>`;
    details.querySelector(".data-title").textContent = tag.label;
    details.querySelector(".data-meta").textContent = tag.url;
    const action = document.createElement("button");
    action.className = "secondary";
    action.type = "button";
    action.textContent = "Copiar";
    action.addEventListener("click", () => navigator.clipboard.writeText(tag.url));
    row.append(details, action);
    list.append(row);
  });
}

async function reserveCloudFolder(tag) {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${SAVE_BUCKET}/${encodeURIComponent(tag)}/.keep`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/octet-stream", "x-upsert": "true" },
    body: new Uint8Array()
  });
  if (!response.ok) throw new Error(`No se pudo reservar la carpeta en Supabase (${response.status}).`);
}

$("#connectButton").addEventListener("click", async () => {
  const error = $("#loginError");
  error.hidden = true;
  githubToken = $("#githubToken").value.trim();
  if (!githubToken) {
    error.textContent = "Escribe el token de GitHub.";
    error.hidden = false;
    return;
  }

  showBusy("Conectando con GitHub…");
  try {
    await github(`/repos/${REPO_OWNER}/${REPO_NAME}`);
    await loadRepositoryData();
    renderGames();
    renderTags();
    $("#githubToken").value = "";
    $("#loginPanel").hidden = true;
    $("#adminPanel").hidden = false;
    $("#connectionBadge").textContent = "GitHub conectado";
    $("#connectionBadge").classList.add("connected");
  } catch (cause) {
    githubToken = "";
    error.textContent = cause.message;
    error.hidden = false;
  } finally {
    hideBusy();
  }
});

document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab === button));
  document.querySelectorAll(".tool-panel").forEach(panel => panel.hidden = panel.id !== button.dataset.tab);
}));

$("#showGameForm").addEventListener("click", () => $("#gameForm").hidden = false);
$("#showTagForm").addEventListener("click", () => $("#tagForm").hidden = false);
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => {
  $("#" + button.dataset.close).hidden = true;
}));

$("#gameForm").addEventListener("submit", async event => {
  event.preventDefault();
  const title = $("#gameTitle").value.trim();
  const id = slugify(title);
  const rom = $("#gameRom").files[0];
  const extension = rom && rom.name.split(".").pop().toLowerCase();
  if (!id || !rom || !["gb", "gbc"].includes(extension)) {
    showResult("No se pudo agregar", "Selecciona una ROM válida .gb o .gbc.");
    return;
  }
  if (games[id] && games[id].romUrl) {
    showResult("Ese juego ya existe", "Usa un nombre diferente para evitar reemplazar una ROM publicada.");
    return;
  }

  showBusy("Publicando ROM y catálogo…");
  try {
    const gameId = Math.max(0, ...Object.values(games).map(game => Number(game.gameId) || 0)) + 1;
    const romName = `${id}.${extension}`;
    games[id] = {
      title,
      system: extension === "gbc" ? "Game Boy Color" : "Game Boy",
      core: "gb",
      gameId,
      icon: $("#gameIcon").value.trim() || "🎮",
      description: $("#gameDescription").value.trim() || `Llavero NFC de ${title}.`,
      romUrl: `./roms/${id}/${romName}`
    };
    await commitFiles([
      { path: `roms/${id}/${romName}`, content: encodeBase64(new Uint8Array(await rom.arrayBuffer())) },
      { path: "games.js", content: encodeText(serializeGames(games)) }
    ], `Add ${title}`);
    renderGames();
    event.target.reset();
    event.target.hidden = true;
    showResult("Juego publicado", `${title} fue agregado a GitHub. GitHub Pages puede tardar alrededor de un minuto en actualizarse.`);
  } catch (cause) {
    showResult("No se pudo publicar", cause.message);
    await loadRepositoryData().then(renderGames).catch(() => {});
  } finally {
    hideBusy();
  }
});

$("#tagForm").addEventListener("submit", async event => {
  event.preventDefault();
  const gameId = $("#tagGame").value;
  const label = $("#tagLabel").value.trim();
  const tag = `tag-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const url = new URL("./", location.href);
  url.searchParams.set("game", gameId);
  url.searchParams.set("tag", tag);
  const record = { tag, label, game: gameId, url: url.toString(), createdAt: new Date().toISOString() };

  showBusy("Creando ruta del tag…");
  try {
    await reserveCloudFolder(tag);
    await commitFiles([
      { path: `tags/${tag}/tag.json`, content: encodeText(JSON.stringify(record, null, 2) + "\n") }
    ], `Create NFC tag ${label}`);
    tags.unshift(record);
    renderTags();
    event.target.reset();
    event.target.hidden = true;
    showResult("Tag listo", "La ruta fue creada en GitHub y Supabase. Graba esta URL en el NFC.", record.url);
  } catch (cause) {
    showResult("No se pudo crear el tag", cause.message);
  } finally {
    hideBusy();
  }
});

$("#copyUrl").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("#resultUrl").value);
  $("#copyUrl").textContent = "Copiada";
  setTimeout(() => $("#copyUrl").textContent = "Copiar URL", 1400);
});

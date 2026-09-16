# NFC Games

Sistema universal de llaveros NFC para abrir juegos en el navegador.

## Cómo funciona

Cada NFC guarda solamente una URL.

Ejemplos:

- Pokémon Blue  
  `https://bmowarmachine.github.io/pokemon-blue-nfc/?game=pokemon-blue`

- Zelda  
  `https://bmowarmachine.github.io/pokemon-blue-nfc/?game=zelda`

- Mario  
  `https://bmowarmachine.github.io/pokemon-blue-nfc/?game=mario`

La web lee el parámetro `game`, busca el juego en `games.js` y abre el emulador correspondiente.

## Archivos

- `index.html` — interfaz principal
- `styles.css` — diseño
- `games.js` — catálogo de juegos y fuentes
- `app.js` — lógica NFC + emulador
- `manifest.webmanifest` — metadatos web app
- `sw.js` — caché de la interfaz
- `NFC_URLS.txt` — URLs listas para grabar en cada tag

## Agregar una fuente autorizada

Edita `games.js`:

```js
"mi-juego": {
  title: "Mi juego",
  system: "Game Boy",
  core: "gb",
  gameId: 4,
  icon: "🎮",
  description: "Mi llavero",
  romUrl: "https://ejemplo.com/mi-juego.gb"
}
```

También puedes usar una ruta del propio sitio:

```js
romUrl: "./roms/mi-juego.gb"
```

Usa solamente archivos de juego que tengas derecho a distribuir.

Usa un `gameId` distinto para cada juego. Ese número separa la caché y las partidas guardadas de cada tag NFC.

## Guardar partida

Guarda desde el menú interno del juego. La web fuerza a EmulatorJS a volcar el archivo `.sav` cada pocos segundos y oculta los botones de save-state del emulador para evitar confusiones.

En el primer arranque el navegador todavía debe descargar el emulador y la ROM. Después, el service worker y la caché de EmulatorJS reutilizan esos archivos para que los siguientes arranques sean más rápidos.

## Agregar un nuevo NFC

1. Agrega el juego a `games.js`.
2. Crea una URL con su ID:
   `https://bmowarmachine.github.io/pokemon-blue-nfc/?game=ID`
3. En una app para escribir NFC, crea un registro URL/URI.
4. Graba esa URL en el tag.
5. Al acercar el tag, el teléfono abrirá directamente ese juego.

## Compatibilidad

La web usa EmulatorJS. Algunos navegadores pueden pedir un toque en pantalla para habilitar audio o iniciar contenido interactivo.

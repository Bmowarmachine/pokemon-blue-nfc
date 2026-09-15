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

## Agregar un nuevo NFC

1. Agrega el juego a `games.js`.
2. Crea una URL con su ID:
   `https://bmowarmachine.github.io/pokemon-blue-nfc/?game=ID`
3. En una app para escribir NFC, crea un registro URL/URI.
4. Graba esa URL en el tag.
5. Al acercar el tag, el teléfono abrirá directamente ese juego.

## Compatibilidad

La web usa EmulatorJS. Algunos navegadores pueden pedir un toque en pantalla para habilitar audio o iniciar contenido interactivo.

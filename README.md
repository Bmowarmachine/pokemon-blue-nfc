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

Usa un `gameId` distinto para cada juego. Ese número separa la caché y las partidas guardadas de juegos diferentes.

## Varios tags para el mismo juego

Agrega `&tag=ID-DEL-TAG` a la URL para crear una partida independiente para cada tag NFC:

- Tag 001: `https://bmowarmachine.github.io/pokemon-blue-nfc/?game=pokemon-blue&tag=tag-001`
- Tag 002: `https://bmowarmachine.github.io/pokemon-blue-nfc/?game=pokemon-blue&tag=tag-002`
- Tag 003: `https://bmowarmachine.github.io/pokemon-blue-nfc/?game=pokemon-blue&tag=tag-003`

Cada ID funciona como una carpeta logica de guardado. Usa siempre una ID diferente y conserva exactamente la misma URL al volver a grabar o reemplazar un tag.

La partida se almacena en el navegador del celular, no dentro del chip NFC. Por eso, el mismo tag conserva su partida al abrirse de nuevo en el mismo celular y navegador. En otro celular comenzara con el almacenamiento propio de ese dispositivo; para compartir partidas entre celulares se necesita un servicio de sincronizacion en la nube.

## Guardar partida

Guarda desde el menú interno del juego. La web activa el intervalo interno de guardado de EmulatorJS para volcar el archivo `.sav` cada pocos segundos, intenta guardar al cerrar/ocultar la página y oculta los botones de save-state del emulador para evitar confusiones.

En el primer arranque el navegador todavía debe descargar el emulador y la ROM. Después, el service worker y la caché de EmulatorJS reutilizan esos archivos para que los siguientes arranques sean más rápidos.

## Agregar un nuevo NFC

1. Agrega el juego a `games.js`.
2. Crea una URL con su ID:
   `https://bmowarmachine.github.io/pokemon-blue-nfc/?game=ID`
3. En una app para escribir NFC, crea un registro URL/URI.
4. Graba esa URL en el tag.
5. Al acercar el tag, el teléfono abrirá directamente ese juego.

Para varios tags del mismo juego, no repitas la URL exacta: cambia solamente el valor de `tag` en cada uno.

## Compatibilidad

La web usa EmulatorJS. Algunos navegadores pueden pedir un toque en pantalla para habilitar audio o iniciar contenido interactivo.

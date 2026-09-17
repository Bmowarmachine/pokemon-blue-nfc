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

La partida se almacena en el navegador y se sincroniza con Supabase. El mismo tag puede continuar su partida desde otro celular cuando el bucket `game-saves` y sus politicas se hayan creado con `SUPABASE_SETUP.sql`.

El valor de `tag` funciona como la llave de la partida. Para tags reales usa un identificador largo y aleatorio, por ejemplo `tag=8f31c7a2e94b4d69a7c21f05`, porque cualquier persona que conozca la URL completa puede abrir esa partida.

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

## Panel de administracion

Abre `https://bmowarmachine.github.io/pokemon-blue-nfc/admin.html` para administrar juegos y tags NFC.

El panel necesita un fine-grained personal access token de GitHub con acceso unicamente al repositorio `pokemon-blue-nfc` y el permiso **Contents: Read and write**. El token se conserva solo en memoria mientras la pestana esta abierta; no se almacena en GitHub, Supabase ni el navegador.

- **Agregar juego** crea `roms/ID-DEL-JUEGO/`, sube la ROM y actualiza `games.js` en un solo commit.
- **Nuevo tag** genera una ID aleatoria, crea `tags/ID-DEL-TAG/tag.json`, reserva la carpeta en Supabase y muestra la URL que debe grabarse en el NFC.

Usa solamente ROMs que tengas derecho a almacenar y distribuir.

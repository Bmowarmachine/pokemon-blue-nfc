/*
  CATÁLOGO DE JUEGOS NFC

  romUrl:
    - Debe ser una URL HTTPS accesible por el navegador.
    - Puede ser una ruta relativa, por ejemplo: "./roms/mi-juego.gb"
    - Úsalo solo para ROMs que tengas derecho a distribuir.

  core:
    "gb"   = Game Boy / Game Boy Color
    "gba"  = Game Boy Advance
    "nes"  = Nintendo Entertainment System
    "snes" = Super Nintendo
*/

window.NFC_GAMES = {
  "pokemon-blue": {
    title: "Pokémon Blue",
    system: "Game Boy",
    core: "gb",
    icon: "🔵",
    description: "Llavero NFC de Pokémon Blue.",
    romUrl: ""
  },

  "zelda": {
    title: "The Legend of Zelda",
    system: "Game Boy",
    core: "gb",
    icon: "🗡️",
    description: "Llavero NFC de Zelda.",
    romUrl: ""
  },

  "mario": {
    title: "Super Mario",
    system: "Game Boy",
    core: "gb",
    icon: "🍄",
    description: "Llavero NFC de Mario.",
    romUrl: ""
  }
};

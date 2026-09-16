/*
  CATÁLOGO DE JUEGOS NFC

  romUrl:
    - Debe ser una URL HTTPS accesible por el navegador.
    - Puede ser una ruta relativa, por ejemplo: "./roms/mi-juego.gb"
    - Úsalo solo para ROMs que tengas derecho a distribuir.

  gameId:
    - Número único por juego. EmulatorJS lo usa para separar partidas guardadas,
      save states y caché entre distintos tags NFC.

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
    gameId: 1,
    icon: "🔵",
    description: "Llavero NFC de Pokémon Blue.",
    romUrl: "./roms/Pokemon-Blue.gb"
  },

  "zelda": {
    title: "The Legend of Zelda",
    system: "Game Boy",
    core: "gb",
    gameId: 2,
    icon: "🗡️",
    description: "Llavero NFC de Zelda.",
    romUrl: ""
  },

  "mario": {
    title: "Super Mario",
    system: "Game Boy",
    core: "gb",
    gameId: 3,
    icon: "🍄",
    description: "Llavero NFC de Mario.",
    romUrl: ""
  }
};

// src/lib/storage.js
const KEY_PLAYERS = "kat_players";
const KEY_CYCLES = "kat_cycles";
const KEY_SETTINGS = "kat_settings";
const VERSION = 1;

const safeParse = (v, def) => {
  try {
    const o = JSON.parse(v);
    return o?.version === VERSION ? o.data : def;
  } catch {
    return def;
  }
};

// טוען מה-LS (אם יש), אחרת יחזור ל-seed מה-players.json דרך ה-store
export const loadPlayers = () => safeParse(localStorage.getItem(KEY_PLAYERS), null);
export const savePlayers = (players) =>
  localStorage.setItem(KEY_PLAYERS, JSON.stringify({ version: VERSION, data: players }));

export const loadCycles = () => safeParse(localStorage.getItem(KEY_CYCLES), []);
export const saveCycles = (cycles) =>
  localStorage.setItem(KEY_CYCLES, JSON.stringify({ version: VERSION, data: cycles }));

export const loadSettings = () => safeParse(localStorage.getItem(KEY_SETTINGS), { bonus: true });
export const saveSettings = (settings) =>
  localStorage.setItem(KEY_SETTINGS, JSON.stringify({ version: VERSION, data: settings }));

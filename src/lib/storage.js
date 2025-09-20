// src/lib/storage.js
// עטיפת LocalStorage + כל הפונקציות שהמסכים מייבאים,
// עם named exports וגם default export כדי למנוע בעיות זיהוי.

// --- Keys ---
export const STORAGE_KEYS = {
  PLAYERS: "players_v2",
  TEAM_COUNT: "team_count_v2",
  LAST_TEAMS: "katregel_last_teams_v2",
  ROUNDS: "rounds_v2",
};

// --- LS helpers ---
function hasLS() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadJSON(key, fallback = null) {
  if (!hasLS()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  if (!hasLS()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// --- Players ---
export function getPlayers() {
  return loadJSON(STORAGE_KEYS.PLAYERS, []);
}

export function setPlayers(players) {
  saveJSON(STORAGE_KEYS.PLAYERS, Array.isArray(players) ? players : []);
}

// תמיכה בשדות שונים ל"משחק?"
function isPlaying(p) {
  if (!p || typeof p !== "object") return false;
  if ("plays" in p) return !!p.plays;
  if ("play" in p) return !!p.play;
  if ("isPlaying" in p) return !!p.isPlaying;
  if (p["משחק"] !== undefined) return !!p["משחק"];
  return true; // ברירת מחדל היסטורית
}

export function countActive(players = null) {
  const list = players ?? getPlayers();
  return (list || []).filter(isPlaying).length;
}

// --- Team count ---
export function getTeamCount() {
  return loadJSON(STORAGE_KEYS.TEAM_COUNT, 4);
}

export function setTeamCount(n) {
  const safe = Number.isFinite(+n) && +n > 0 ? +n : 4;
  saveJSON(STORAGE_KEYS.TEAM_COUNT, safe);
}

// --- snapshot teams (למסך מנהל/תוצאות) ---
export function saveTeamsSnapshot(groups) {
  const snapshot = {
    savedAt: Date.now(),
    groups: (Array.isArray(groups) ? groups : []).map(g =>
      (Array.isArray(g) ? g : []).map(p => (p && p.id !== undefined ? p.id : p))
    ),
  };
  saveJSON(STORAGE_KEYS.LAST_TEAMS, snapshot);
}

export function getLastTeams() {
  return loadJSON(STORAGE_KEYS.LAST_TEAMS, null);
}

// --- rounds (למסך מנהל) ---
export function getRounds() {
  return loadJSON(STORAGE_KEYS.ROUNDS, []);
}

export function setRounds(rounds) {
  saveJSON(STORAGE_KEYS.ROUNDS, Array.isArray(rounds) ? rounds : []);
}

// --- Re-export מפורש כדי ש-Rollup יראה הכל ---
export {
  // utils
  hasLS as __hasLS_internal__ // (לא בשימוש חיצוני; רק כדי "לגעת" בו אם צריך)
};

// default export (לא חובה, אבל מונע באגים של זיהוי מודולים)
const storageAPI = {
  STORAGE_KEYS,
  loadJSON,
  saveJSON,
  getPlayers,
  setPlayers,
  countActive,
  getTeamCount,
  setTeamCount,
  saveTeamsSnapshot,
  getLastTeams,
  getRounds,
  setRounds,
};
export default storageAPI;

// שורת re-export מפורשת נוספת (כפילות לא מזיקה, רק עוזרת לזיהוי ע"י הבילדר)
export {
  getPlayers, setPlayers, countActive,
  getTeamCount, setTeamCount,
  saveTeamsSnapshot, getLastTeams,
  getRounds, setRounds
};

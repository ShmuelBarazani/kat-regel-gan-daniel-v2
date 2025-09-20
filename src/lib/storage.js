// src/lib/storage.js
// עטיפת LocalStorage עם שמירת/קריאת JSON + פונקציות אחידות לכל המסכים

// --- מפתחות שמורים ---
export const STORAGE_KEYS = {
  PLAYERS: "players_v2",
  TEAM_COUNT: "team_count_v2",
  LAST_TEAMS: "katregel_last_teams_v2",
  ROUNDS: "rounds_v2",
};

// --- Utilities: קריאה/שמירה ל-LS בבטחה ---
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
    // ignore quota/serialize errors
  }
}

// --- Players ---
export function getPlayers() {
  return loadJSON(STORAGE_KEYS.PLAYERS, []);
}

export function setPlayers(players) {
  saveJSON(STORAGE_KEYS.PLAYERS, Array.isArray(players) ? players : []);
}

// נטרול שונות בין שמות שדות ל"משחק?"
function isPlaying(p) {
  if (!p || typeof p !== "object") return false;
  if ("plays" in p) return !!p.plays;
  if ("play" in p) return !!p.play;
  if ("isPlaying" in p) return !!p.isPlaying;
  if (p["משחק"] !== undefined) return !!p["משחק"];
  // ברירת מחדל היסטורית: אם לא קיים שדה – נחשב כמשחק
  return true;
}

export function countActive(players = null) {
  const list = players ?? getPlayers();
  return (list || []).filter(isPlaying).length;
}

// --- Team count (מספר קבוצות) ---
export function getTeamCount() {
  // ברירת מחדל: 4 קבוצות
  return loadJSON(STORAGE_KEYS.TEAM_COUNT, 4);
}

export function setTeamCount(n) {
  const safe = Number.isFinite(+n) && +n > 0 ? +n : 4;
  saveJSON(STORAGE_KEYS.TEAM_COUNT, safe);
}

// --- שמירת פירוט הכוחות האחרון (לשימוש במסך מנהל/תוצאות) ---
export function saveTeamsSnapshot(groups) {
  // groups: מערך קבוצות; כל קבוצה היא מערך שחקנים (אובייקטים מלאים או ids)
  // נשמור בצורה קלה לשחזור/תצוגה
  const snapshot = {
    savedAt: Date.now(),
    groups: (Array.isArray(groups) ? groups : []).map(g =>
      (Array.isArray(g) ? g : []).map(p => (p && p.id !== undefined ? p.id : p))
    ),
  };
  saveJSON(STORAGE_KEYS.LAST_TEAMS, snapshot);
}

export function getLastTeams() {
  // מחזיר {savedAt, groups: number[][]} או null
  return loadJSON(STORAGE_KEYS.LAST_TEAMS, null);
}

// --- מחזורים שמורים (למסך מנהל) ---
export function getRounds() {
  // מערך של אובייקטים שמורים לפי המבנה שלך; ברירת מחדל []
  return loadJSON(STORAGE_KEYS.ROUNDS, []);
}

export function setRounds(rounds) {
  saveJSON(STORAGE_KEYS.ROUNDS, Array.isArray(rounds) ? rounds : []);
}

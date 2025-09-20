// src/lib/storage.js

// ===== Storage helpers =====
const STORAGE_KEYS = {
  players: "katregal:players",
  teams: "katregal:teams",
  teamsHistory: "katregal:teams:snapshots",
  teamCount: "katregal:teamCount",
};

// LocalStorage-safe (גם ב-SSR/Build)
function ls() {
  if (typeof window === "undefined") {
    // נפעל כסוג של no-op בזמן build/SSR
    const mem = new Map();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
  }
  return window.localStorage;
}

function readJSON(key, fallback) {
  try {
    const raw = ls().getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    ls().setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/permission errors
  }
}

// ===== Players API =====

/**
 * מחזיר מערך שחקנים מהאחסון.
 * מבנה מומלץ לשחקן: { name, pos, rating, active }
 */
export function getPlayers() {
  return readJSON(STORAGE_KEYS.players, []);
}

/**
 * שומר מערך שחקנים לאחסון.
 */
export function setPlayers(list) {
  writeJSON(STORAGE_KEYS.players, Array.isArray(list) ? list : []);
}

/**
 * מחזיר את מספר השחקנים הפעילים.
 * אם לא נשלח מערך שחקנים, ייקרא מהאחסון.
 */
export function countActive(players) {
  const arr = Array.isArray(players) ? players : getPlayers();
  return arr.filter((p) => p && p.active !== false).length;
}

// ===== Teams count (מספר קבוצות) =====

/**
 * מחזיר את מספר הקבוצות המוגדר (ברירת מחדל 4).
 */
export function getTeamCount() {
  const n = readJSON(STORAGE_KEYS.teamCount, 4);
  const num = Number(n);
  return Number.isFinite(num) && num > 0 ? num : 4;
}

/**
 * מעדכן את מספר הקבוצות.
 */
export function setTeamCount(n) {
  const num = Number(n);
  writeJSON(STORAGE_KEYS.teamCount, Number.isFinite(num) && num > 0 ? num : 4);
}

// ===== Teams snapshots/history =====

/**
 * שמירת צילום מצב של הקבוצות (לוג נתונים להיסטוריה).
 * @param {{teams:any, meta?:any}} snapshot
 *  דוגמה: { teams:[...], meta:{ createdBy:"...", round: 3 } }
 */
export function saveTeamsSnapshot(snapshot) {
  const history = readJSON(STORAGE_KEYS.teamsHistory, []);
  const entry = {
    ...snapshot,
    _ts: Date.now(),
  };
  history.push(entry);
  // שומרים רק את ה-50 האחרונים כדי לא לנפח אחסון
  const trimmed = history.slice(-50);
  writeJSON(STORAGE_KEYS.teamsHistory, trimmed);
  // שומרים גם "מצב אחרון" נוח לשליפה מהירה
  writeJSON(STORAGE_KEYS.teams, snapshot?.teams ?? null);
}

/**
 * מחזיר את מצב הקבוצות האחרון שנשמר (לא ההיסטוריה כולה).
 * אם אין שמור, מחזיר null.
 */
export function getLastTeams() {
  return readJSON(STORAGE_KEYS.teams, null);
}

/**
 * מחזיר את כל ההיסטוריה של הקבוצות (אופציונלי לשימוש במסך ניהול).
 */
export function getTeamsHistory() {
  return readJSON(STORAGE_KEYS.teamsHistory, []);
}

/**
 * מנקה את כל הנתונים השמורים (זהירות!).
 */
export function clearAllStorage() {
  try {
    ls().removeItem(STORAGE_KEYS.players);
    ls().removeItem(STORAGE_KEYS.teamCount);
    ls().removeItem(STORAGE_KEYS.teams);
    ls().removeItem(STORAGE_KEYS.teamsHistory);
  } catch {
    // ignore
  }
}

// src/lib/storage.js
// ------------------------------------------------------
// Utilities שמרכזים גישה ל-localStorage + מפתחות קבועים
// וכל הפונקציות שהקומפוננטות (Teams/Players/Admin) מייבאות.
// ------------------------------------------------------

// --- helpers ---
const hasLS = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export function loadJSON(key, fallback = null) {
  try {
    if (hasLS()) {
      const s = window.localStorage.getItem(key);
      if (s !== null) return JSON.parse(s);
    }
  } catch (_) {}
  return fallback;
}

export function saveJSON(key, value) {
  try {
    if (hasLS()) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (_) {}
}

// --- keys ---
export const STORAGE_KEYS = {
  TEAM_COUNT: "katregel_team_count",
  LAST_TEAMS: "katregel_last_teams_v2",
  PLAYERS: "players",            // שם ברירת מחדל לשמירת רשימת השחקנים
  ROUNDS: "katregel_rounds_v2",  // ארכיון מחזורים (למסך מנהל)
};

// ------------------------------------------------------
// Players list
// ------------------------------------------------------
export function getPlayers() {
  // סינכרוני: מחזיר מ-localStorage אם קיים; אחרת מחזיר מערך ריק.
  // (הטענות אסינכרוניות מקובץ/שרת אם יש — יתבצעו בקוד אחר.)
  const ls = loadJSON(STORAGE_KEYS.PLAYERS, null);
  if (Array.isArray(ls)) return ls;

  // תמיכה ב-Fallback אופציונלי (אם הוגדר גלובלית איפשהו):
  if (Array.isArray(window?.__INITIAL_PLAYERS__)) {
    return window.__INITIAL_PLAYERS__;
  }

  return [];
}

export function setPlayers(list) {
  // list חייב להיות מערך של שחקנים
  if (Array.isArray(list)) {
    saveJSON(STORAGE_KEYS.PLAYERS, list);
  }
}

// ------------------------------------------------------
// Team count (מספר קבוצות במסך הכוחות)
// ------------------------------------------------------
export function getTeamCount() {
  return Number(loadJSON(STORAGE_KEYS.TEAM_COUNT, 4));
}
export function setTeamCount(n) {
  saveJSON(STORAGE_KEYS.TEAM_COUNT, Number(n));
}

// ------------------------------------------------------
// Last teams snapshot (שמירת צילום הכוחות האחרון למסך הכוחות)
// ------------------------------------------------------
export function saveTeamsSnapshot(snapshot) {
  // snapshot יכול להיות { teamCount, groups, meta } וכו'
  saveJSON(STORAGE_KEYS.LAST_TEAMS, snapshot);
}

export function getLastTeams() {
  return loadJSON(STORAGE_KEYS.LAST_TEAMS, null);
}

// ------------------------------------------------------
// Count active players (כמה מסומנים "משחק")
// ------------------------------------------------------
export function countActive(players = []) {
  return players.reduce((acc, p) => {
    // תמיכה בשמות שדה שונים: plays / isPlaying / active / משחק
    const flag = p?.plays ?? p?.isPlaying ?? p?.active ?? p?.משחק ?? false;
    return acc + (flag ? 1 : 0);
  }, 0);
}

// ------------------------------------------------------
// Rounds archive (למסך מנהל – אם נדרש getRounds/setRounds וכד')
// ------------------------------------------------------
export function getRounds() {
  return loadJSON(STORAGE_KEYS.ROUNDS, []);
}

export function setRounds(rounds) {
  // rounds = מערך של מחזורים שנשמרו (כל מבנה שנוח לכם)
  if (Array.isArray(rounds)) {
    saveJSON(STORAGE_KEYS.ROUNDS, rounds);
  }
}

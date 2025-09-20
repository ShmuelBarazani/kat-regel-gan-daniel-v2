// src/lib/storage.js

// ===== LocalStorage helpers =====
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

// ===== Keys =====
export const STORAGE_KEYS = {
  TEAM_COUNT: "katregel_team_count",
  LAST_TEAMS: "katregel_last_teams_v2",
  PLAYERS: "players", // אם יש לכם מפתח אחר – אפשר לעדכן כאן
};

// ===== API שמרכיבים משתמשים בהם =====

// מספר הקבוצות
export function getTeamCount() {
  return Number(loadJSON(STORAGE_KEYS.TEAM_COUNT, 4));
}
export function setTeamCount(n) {
  saveJSON(STORAGE_KEYS.TEAM_COUNT, Number(n));
}

// צילום/טעינה של הכוחות האחרונים
export function saveTeamsSnapshot(snapshot) {
  // snapshot יכול להיות כל אובייקט שאתם שולחים מ-Teams.jsx
  // לדוגמה: { teamCount, groups, meta }
  saveJSON(STORAGE_KEYS.LAST_TEAMS, snapshot);
}
export function getLastTeams() {
  return loadJSON(STORAGE_KEYS.LAST_TEAMS, null);
}

// ספירת שחקנים פעילים (תומך בכמה שמות שדה אפשריים)
export function countActive(players = []) {
  return players.reduce((acc, p) => {
    const flag =
      p?.plays ?? p?.isPlaying ?? p?.active ?? p?.משחק ?? false;
    return acc + (flag ? 1 : 0);
  }, 0);
}

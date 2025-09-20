// src/lib/storage.js
// ----------------------------------------------------
// Safe localStorage helpers + common app storage API.
// מכסה את כל ה־exports שהרכיבים אצלך מצפים להם.
// ----------------------------------------------------

import { useEffect, useState, useCallback } from "react";

// מפתחות מרוכזים
export const STORAGE_KEYS = {
  players: "katregel_players_v2",
  rounds: "katregel_rounds_v2",        // ארכיון מחזורים (למסך מנהל)
  teamCount: "katregel_team_count_v2", // מספר קבוצות נבחר
  lastTeams: "katregel_last_teams_v2", // חלוקת קבוצות אחרונה (לשחזור מסך)
};

// זיכרון־ביניים כשאין window (בבילד/SSR) וגם לשימוש כללי
const memory = new Map();

function hasLS() {
  try {
    if (typeof window === "undefined") return false;
    const t = "__ls_test__";
    window.localStorage.setItem(t, "1");
    window.localStorage.removeItem(t);
    return true;
  } catch {
    return false;
  }
}

function readLS(key, fallback = null) {
  if (hasLS()) {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  // fallback לזיכרון־ביניים בבילד
  return memory.has(key) ? memory.get(key) : fallback;
}

function writeLS(key, value) {
  const raw = JSON.stringify(value);
  if (hasLS()) {
    window.localStorage.setItem(key, raw);
  } else {
    memory.set(key, value);
  }
  return value;
}

// כלי עזר גנריים כפי שהקוד משתמש
export const loadJSON  = (key, fallback = null) => readLS(key, fallback);
export const saveJSON  = (key, value) => writeLS(key, value);

// ----------------------------------------------------
// Players
// ----------------------------------------------------
export function getPlayers() {
  return readLS(STORAGE_KEYS.players, []);
}

export function setPlayers(players) {
  return writeLS(STORAGE_KEYS.players, players ?? []);
}

// כמה מסומנים כמשחקים (תומך גם ב־playing וגם selected)
export function countActive(players = null) {
  const list = players ?? getPlayers();
  return (list || []).filter(p =>
    (typeof p.playing === "boolean" ? p.playing : Boolean(p.selected))
  ).length;
}

// ----------------------------------------------------
// Team count (מספר קבוצות למסך הכוחות)
// ----------------------------------------------------
export function getTeamCount() {
  const n = readLS(STORAGE_KEYS.teamCount, 4);
  return Number.isFinite(n) && n > 0 ? n : 4;
}

export function setTeamCount(n) {
  return writeLS(STORAGE_KEYS.teamCount, Number(n) || 4);
}

// ----------------------------------------------------
// Last teams (מצב אחרון של חלוקת כוחות – לשחזור מהיר)
// ----------------------------------------------------
export function getLastTeams() {
  // מבנה צפוי: { teamCount, groups: number[][] }
  return readLS(STORAGE_KEYS.lastTeams, { teamCount: getTeamCount(), groups: [] });
}

export function setLastTeams(payload) {
  return writeLS(STORAGE_KEYS.lastTeams, payload);
}

// ----------------------------------------------------
// Rounds archive (למסך המנהל – מחזורים שנשמרו)
// ----------------------------------------------------
export function getRounds() {
  // מערך של אובייקטים: { id, createdAt, teamCount, groups, meta }
  return readLS(STORAGE_KEYS.rounds, []);
}

export function setRounds(rounds) {
  return writeLS(STORAGE_KEYS.rounds, rounds ?? []);
}

// שמירת צילום מצב של הקבוצות + עדכון "אחרון"
export function saveTeamSnapshot(groups, meta = {}) {
  // groups: number[][]  (מזהי שחקנים/אינדקסים/אובייקטים – לא משנה לספרייה)
  const teamCount = Array.isArray(groups) ? groups.length : getTeamCount();

  // 1) עדכון "אחרון"
  setLastTeams({ teamCount, groups });

  // 2) הוספה לארכיון המחזורים (מינימלי – מסך מנהל יכול להרחיב)
  const rounds = getRounds();
  const stamp = Date.now();
  const id = `r_${stamp}`;

  const entry = {
    id,
    createdAt: stamp,
    teamCount,
    groups,
    meta, // מקום לציונים מצטברים/שם יוצר/וכו'
  };

  rounds.unshift(entry);
  setRounds(rounds);

  return entry;
}

// ALIAS כדי לעצור את שגיאת הבילד – יש קוד שמייבא בשם הזה
export const saveTeamsSnapshot = (...args) => saveTeamSnapshot(...args);

// ----------------------------------------------------
// useStorage – הוק כללי שמסנכרן state עם localStorage
// ----------------------------------------------------
export function useStorage(key, initialValue) {
  const read = useCallback(() => readLS(key, initialValue), [key, initialValue]);
  const [value, setValue] = useState(read);

  useEffect(() => {
    setValue(read());
    // האזנה לשינויים מחלון אחר
    const handler = (e) => {
      if (e.key === key) setValue(read());
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    }
  }, [key, read]);

  const write = useCallback((next) => {
    const v = typeof next === "function" ? next(read()) : next;
    writeLS(key, v);
    setValue(v);
    return v;
  }, [key, read]);

  return [value, write];
}

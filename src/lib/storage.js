// src/lib/storage.js
import { useEffect, useState } from "react";

export const STORAGE_KEYS = {
  PLAYERS: "katregel_players_v2",        // רשימת שחקנים
  LAST_TEAMS: "katregel_last_teams_v2",  // המחזור האחרון שנוצר (לא "שמירה רשמית")
  ROUNDS: "katregel_rounds_v2",          // רשימת מחזורים שנשמרו
};

// ---------- כלי JSON כללים ----------
export const loadJSON = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const saveJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

// Hook לשמירה/טעינה אוטומטית
export const useStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => loadJSON(key, initialValue));
  useEffect(() => { saveJSON(key, value); }, [key, value]);
  return [value, setValue];
};

// ---------- שחקנים (תאימות לקוד הישן) ----------
export async function getPlayers() {
  const cached = loadJSON(STORAGE_KEYS.PLAYERS, null);
  if (cached && Array.isArray(cached) && cached.length) return cached;

  const res = await fetch("/players.json?ts=" + Date.now());
  const data = await res.json();

  const list = (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    pos: p.pos,                   // "GK" | "DF" | "MF" | "FW"
    r: Number(p.r),
    selected: p.selected ?? true, // ברירת מחדל: משחק
    prefer: Array.isArray(p.prefer) ? p.prefer : [],
    avoid: Array.isArray(p.avoid) ? p.avoid : [],
  }));

  saveJSON(STORAGE_KEYS.PLAYERS, list);
  return list;
}

export function setPlayers(list) {
  saveJSON(STORAGE_KEYS.PLAYERS, list);
}

export function countActive(list) {
  return Array.isArray(list)
    ? list.reduce((acc, p) => acc + (p && p.selected ? 1 : 0), 0)
    : 0;
}

// ---------- מחזורים (Rounds) ----------
// תאימות ל-Admin.jsx: getRounds / setRounds

export function getRounds() {
  return loadJSON(STORAGE_KEYS.ROUNDS, []);
}

export function setRounds(list) {
  saveJSON(STORAGE_KEYS.ROUNDS, Array.isArray(list) ? list : []);
}

// עזרים שימושיים (לא חובה לייבא, אבל נוח ל-Admin):
export function genId() {
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8)
  );
}

// שמירת מחזור בודד (הוספה/עדכון)
export function saveRound(round) {
  const list = getRounds();
  const withId = {
    id: round?.id || genId(),
    createdAt: round?.createdAt || new Date().toISOString(),
    ...round,
  };
  const i = list.findIndex((r) => r.id === withId.id);
  if (i >= 0) list[i] = withId;
  else list.push(withId);
  setRounds(list);
  return list;
}

// מחיקת מחזורים לפי מזהים
export function deleteRounds(ids = []) {
  const set = new Set(ids);
  const list = getRounds().filter((r) => !set.has(r.id));
  setRounds(list);
  return list;
}

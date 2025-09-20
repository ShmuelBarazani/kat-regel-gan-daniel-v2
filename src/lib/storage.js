// src/lib/storage.js
import { useEffect, useState } from "react";

export const STORAGE_KEYS = {
  LAST_TEAMS: "katregel_last_teams_v2",   // מחזור אחרון שנשמר
  PLAYERS: "katregel_players_v2",         // רשימת שחקנים ערוכה
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

// Hook נוח לשמירה/טעינה אוטומטית
export const useStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => loadJSON(key, initialValue));
  useEffect(() => { saveJSON(key, value); }, [key, value]);
  return [value, setValue];
};

// ---------- תאימות לקוד הישן (Players.jsx) ----------
// getPlayers / setPlayers / countActive

// טוען שחקנים מה-LS; אם אין – מ- /public/players.json ושומר ל-LS
export async function getPlayers() {
  const cached = loadJSON(STORAGE_KEYS.PLAYERS, null);
  if (cached && Array.isArray(cached) && cached.length) return cached;

  const res = await fetch("/players.json?ts=" + Date.now());
  const data = await res.json();

  // נרמול
  const list = (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    pos: p.pos,                      // "GK" | "DF" | "MF" | "FW"
    r: Number(p.r),
    selected: p.selected ?? true,    // ברירת מחדל: משחק
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

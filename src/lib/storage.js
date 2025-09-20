// src/lib/storage.js
import { useEffect, useState } from "react";

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

// hook נפוץ לשמירה/טעינה אוטומטית
export const useStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => loadJSON(key, initialValue));
  useEffect(() => { saveJSON(key, value); }, [key, value]);
  return [value, setValue];
};

export const STORAGE_KEYS = {
  LAST_TEAMS: "katregel_last_teams_v2",   // מחזור אחרון שנשמר
  PLAYERS: "katregel_players_v2",         // אם תרצה לשמור רשימת שחקנים ערוכה
};

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

// ה־hook שביקשת: useStorage – יצוא בשם הזה כדי ש-Teams.jsx יוכל לייבא אותו
export const useStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => loadJSON(key, initialValue));
  useEffect(() => { saveJSON(key, value); }, [key, value]);
  return [value, setValue];
};

// מפתחות שימושיים (לא חובה, רק לנוחות)
export const STORAGE_KEYS = {
  LAST_TEAMS: "katregel_last_teams_v2",
  PLAYERS: "katregel_players_v2",
};

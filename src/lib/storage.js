/* ---------------------------------------------------------
   src/lib/storage.js
   שכבת אחסון/טעינה אחודה ל־localStorage + fetch לקבצי JSON.
   בטוח ל-SSR/Build (אין גישה ל-window מחוץ לפונקציות).
--------------------------------------------------------- */

/** מפתחות LS אחידים */
export const STORAGE_KEYS = {
  PLAYERS: "katregel_players_v2",
  LAST_TEAMS: "katregel_last_teams_v2", // { teamCount:number, groups: string[][] | number[][] }
  ROUNDS: "katregel_rounds_v1",
};

/* ========= Helpers ========= */

function hasLS() {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function readLS(key, fallback = null) {
  if (!hasLS()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  if (!hasLS()) return value;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/private mode */
  }
  return value;
}

function isUrlLike(ref) {
  return typeof ref === "string" && ref.startsWith("/");
}

/* ========= Hook: useStorage ========= */

import { useEffect, useState, useCallback } from "react";

/**
 * useStorage(key, initialValue)
 * מחזיר [value, setValue, clear]
 */
export function useStorage(key, initialValue) {
  const getInitial = () => readLS(key, initialValue);
  const [value, setValue] = useState(getInitial);

  useEffect(() => {
    writeLS(key, value);
  }, [key, value]);

  const clear = useCallback(() => {
    if (hasLS()) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
    setValue(initialValue);
  }, [key, initialValue]);

  return [value, setValue, clear];
}

/* ========= Generic JSON IO ========= */

/**
 * loadJSON(ref, fallback)
 *  - אם ref מתחיל ב־'/' → fetch JSON מהשרת
 *  - אחרת → localStorage
 */
export async function loadJSON(ref, fallback = null) {
  if (isUrlLike(ref)) {
    try {
      const res = await fetch(ref, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch {
      return fallback;
    }
  }
  return readLS(ref, fallback);
}

/**
 * saveJSON(ref, data)
 *  - אם ref מתחיל ב־'/' → ניסיון לשמור דרך /api/save (אם קיים)
 *  - אחרת → localStorage
 */
export async function saveJSON(ref, data) {
  if (isUrlLike(ref)) {
    try {
      await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: ref, data }),
      });
    } catch {
      /* אין API – לא מפילים את הלקוח */
    }
    return data;
  }
  return writeLS(ref, data);
}

/* ========= Players ========= */

export async function getPlayers() {
  const local = readLS(STORAGE_KEYS.PLAYERS, null);
  if (local && Array.isArray(local)) return local;

  try {
    const res = await fetch("/players.json", { cache: "no-store" });
    if (res.ok) {
      const players = await res.json();
      writeLS(STORAGE_KEYS.PLAYERS, players);
      return players;
    }
  } catch {}
  return [];
}

export function setPlayers(players) {
  return writeLS(STORAGE_KEYS.PLAYERS, Array.isArray(players) ? players : []);
}

export function countActive(players) {
  if (!Array.isArray(players)) return 0;
  return players.reduce((acc, p) => acc + (p?.selected ? 1 : 0), 0);
}

/* ========= Teams snapshot (מסך "כוחות") ========= */
/**
 * התצורה הנשמרת תחת STORAGE_KEYS.LAST_TEAMS:
 * { teamCount: number, groups: any[][] }
 */

/** מחזיר את עצם ה־snapshot האחרון (או ברירת מחדל) */
export function getLastTeams(defaultCount = 4) {
  const obj = readLS(STORAGE_KEYS.LAST_TEAMS, null);
  if (obj && typeof obj.teamCount === "number" && Array.isArray(obj.groups)) {
    return obj;
  }
  return { teamCount: defaultCount, groups: [] };
}

/** כמה קבוצות לשמור/להציג כרגע (לברירת מחדל 4) */
export function getTeamCount(defaultCount = 4) {
  const obj = readLS(STORAGE_KEYS.LAST_TEAMS, null);
  if (obj && typeof obj.teamCount === "number") return obj.teamCount;
  return defaultCount;
}

/**
 * מעדכן את מספר הקבוצות ושומר snapshot עקבי
 * (אם אין groups או שלא מתאים לאורך – נאתחל מערך groups ריק לפי האורך החדש)
 */
export function setTeamCount(n) {
  const safe = typeof n === "number" && n > 0 ? n : 4;
  const prev = readLS(STORAGE_KEYS.LAST_TEAMS, null);
  let groups = Array.isArray(prev?.groups) ? prev.groups : [];
  if (!Array.isArray(groups) || groups.length !== safe) {
    groups = Array.from({ length: safe }, () => []);
  }
  return writeLS(STORAGE_KEYS.LAST_TEAMS, { teamCount: safe, groups });
}

/** שמירת תצלום מצב הקבוצות האחרון */
export function saveTeamSnapshot(groups, teamCount) {
  const count =
    typeof teamCount === "number"
      ? teamCount
      : Array.isArray(groups)
      ? groups.length
      : getTeamCount(4);
  const payload = {
    teamCount: count,
    groups: Array.isArray(groups) ? groups : [],
  };
  return writeLS(STORAGE_KEYS.LAST_TEAMS, payload);
}

/* ========= Rounds (Cycles) ========= */

export async function getRounds() {
  const cached = readLS(STORAGE_KEYS.ROUNDS, null);
  if (cached && Array.isArray(cached)) return cached;

  try {
    const res = await fetch("/data/cycles.json", { cache: "no-store" });
    if (res.ok) {
      const rounds = await res.json();
      writeLS(STORAGE_KEYS.ROUNDS, rounds);
      return rounds;
    }
  } catch {}
  return [];
}

export function setRounds(rounds) {
  const safe = Array.isArray(rounds) ? rounds : [];
  return writeLS(STORAGE_KEYS.ROUNDS, safe);
}

/* ---------------------------------------------------------
   src/lib/storage.js
   שכבת אחסון/טעינה אחודה ל־localStorage + קבצים בצד לקוח.
--------------------------------------------------------- */

/** מפתחות אחידים לשימוש באפליקציה */
export const STORAGE_KEYS = {
  PLAYERS: "katregel_players_v2",
  LAST_TEAMS: "katregel_last_teams_v2",
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
    /* ignore quota or private mode */
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
 *  - קורא/שומר ב־localStorage תחת המפתח שניתן.
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
 *  - אם ref מתחיל ב־'/' → יבצע fetch ויחזיר JSON
 *  - אחרת → יקרא מ־localStorage (key)
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
 *  - אם ref מתחיל ב־'/' → ינסה לשמור דרך /api/save (אם קיים),
 *    ואם לא – יחזיר את הנתונים בלי לשבור.
 *  - אחרת → ישמור ב־localStorage תחת key=ref.
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
      /* אין API / שמירה נכשלה — לא מפילים את הלקוח */
    }
    return data;
  }
  return writeLS(ref, data);
}

/* ========= Players ========= */

/** קורא את רשימת השחקנים (LS → ואם ריק אז /players.json) */
export async function getPlayers() {
  const local = readLS(STORAGE_KEYS.PLAYERS, null);
  if (local && Array.isArray(local)) return local;

  // קובץ ברירת מחדל מה-public
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

/** שומר רשימת שחקנים ב־LS */
export function setPlayers(players) {
  return writeLS(STORAGE_KEYS.PLAYERS, Array.isArray(players) ? players : []);
}

/** סופר כמה שחקנים מסומנים "משחק?" */
export function countActive(players) {
  if (!Array.isArray(players)) return 0;
  return players.reduce((acc, p) => acc + (p?.selected ? 1 : 0), 0);
}

/* ========= Rounds (Cycles) ========= */

/**
 * מחזיר מערך מחזורים (rounds).
 * קודם מנסה מה-localStorage; אם ריק – טוען מ-/data/cycles.json ושומר מקומית.
 */
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

/** שומר מערך מחזורים ב־LS ומחזיר אותו */
export function setRounds(rounds) {
  const safe = Array.isArray(rounds) ? rounds : [];
  return writeLS(STORAGE_KEYS.ROUNDS, safe);
}

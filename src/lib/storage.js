// src/lib/storage.js
import { useEffect, useState } from "react";

// *** מקור אמת לציונים: קובץ JSON בשורש הפרויקט ***
import DATA_PLAYERS from "../../data/players.json";

// גרסת מפתחות חדשה כדי לעקוף נתונים ישנים שננעלו על 6.5
const LS = {
  players: "katregel_players_v4",   // <-- שונה ל-v4
  cycles:  "katregel_cycles_v3",
  ui:      "katregel_ui_v3",
};

export const POS = ["GK", "DF", "MF", "FW"];

export function useStorage() {
  const [players, setPlayers] = useState([]);
  const [cycles, setCycles]   = useState([]);
  const [ui, setUi] = useState({
    hiddenRatings: false,
    bonusWeek: false,
    bonusMonth: false,
  });

  // טעינה ראשונית: תמיד מה- /data/players.json (ציונים אמיתיים),
  // ואז מיזוג העדפות מה- localStorage הישן אם קיימות.
  useEffect(() => {
    // 1) מקור אמת
    const base = mapPlayers(DATA_PLAYERS);

    // 2) מיזוג העדפות (אם יש בגרסאות קודמות)
    const oldLS =
      safeParse(localStorage.getItem("katregel_players_v3")) ||
      safeParse(localStorage.getItem("katregel_players_v2")) ||
      [];
    const merged = mergePrefs(base, oldLS);

    setPlayers(merged);

    // מחזורים/הגדרות קיימות (לא נוגעים)
    const cLS = safeParse(localStorage.getItem(LS.cycles)) || [];
    if (Array.isArray(cLS)) setCycles(cLS);

    const uLS = safeParse(localStorage.getItem(LS.ui));
    if (uLS) setUi(uLS);
  }, []);

  // שמירות
  useEffect(() => {
    localStorage.setItem(LS.players, JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem(LS.cycles, JSON.stringify(cycles));
  }, [cycles]);

  useEffect(() => {
    localStorage.setItem(LS.ui, JSON.stringify(ui));
  }, [ui]);

  return {
    players, setPlayers,
    cycles, setCycles,
    hiddenRatings: ui.hiddenRatings,
    setHiddenRatings: (v) => setUi((s) => ({ ...s, hiddenRatings: v })),
    bonusWeek: ui.bonusWeek,
    bonusMonth: ui.bonusMonth,
    setBonusWeek: (v) => setUi((s) => ({ ...s, bonusWeek: v })),
    setBonusMonth: (v) => setUi((s) => ({ ...s, bonusMonth: v })),

    // כפתור חירום אם תרצה בעתיד – לטעון מחדש מה-data ולמחוק נתוני שחקנים זמניים:
    reloadFromData: () => {
      const base = mapPlayers(DATA_PLAYERS);
      setPlayers(base);
      localStorage.setItem(LS.players, JSON.stringify(base));
    },
  };
}

/* ---------- עזרים ---------- */

function mapPlayers(arr) {
  return (Array.isArray(arr) ? arr : []).map(toPlayer);
}

function toPlayer(p = {}) {
  const rating = coerceRating(
    p.rating ?? p.rate ?? p.score ?? p["ציון"] ?? p["rating"]
  );

  const name =
    (typeof p.name === "string" && p.name.trim()) ||
    p["שם"] || p["player"] || "";

  const posRaw =
    (typeof p.pos === "string" && p.pos.trim()) || p["עמדה"] || "MF";
  const pos = POS.includes(posRaw.toUpperCase()) ? posRaw.toUpperCase() : "MF";

  return {
    id: p.id || crypto.randomUUID(),
    name,
    pos,
    rating: isFinite(rating) ? clamp(rating, 1, 10) : 6.5,
    active: typeof p.active === "boolean" ? p.active : false, // אם לא צוין—לא משחק
    mustWith: Array.isArray(p.mustWith) ? p.mustWith : [],
    avoidWith: Array.isArray(p.avoidWith) ? p.avoidWith : [],
    goals: Number(p.goals || 0),
    wins: Number(p.wins || 0),
  };
}

// מיזוג העדפות (משחק?/חייב/לא עם) לפי שם שחקן
function mergePrefs(basePlayers, oldPlayers) {
  if (!Array.isArray(oldPlayers) || !oldPlayers.length) return basePlayers;
  const byName = new Map(
    oldPlayers
      .filter(x => x && typeof x.name === "string")
      .map(x => [x.name.trim(), x])
  );
  return basePlayers.map(p => {
    const old = byName.get(p.name.trim());
    if (!old) return p;
    return {
      ...p,
      active: typeof old.active === "boolean" ? old.active : p.active,
      mustWith: Array.isArray(old.mustWith) ? old.mustWith : p.mustWith,
      avoidWith: Array.isArray(old.avoidWith) ? old.avoidWith : p.avoidWith,
    };
  });
}

function coerceRating(v) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v.replace(",", ".").trim();
    const n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }
  return NaN;
}

function clamp(x, min, max) { return Math.max(min, Math.min(max, x)); }
function safeParse(txt) { try { return JSON.parse(txt); } catch { return null; } }

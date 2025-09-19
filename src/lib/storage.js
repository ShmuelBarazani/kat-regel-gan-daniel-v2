// src/lib/storage.js
import { useEffect, useState } from "react";
// נפילה חכמה: אם public/players.json בעייתי – נטען את קובץ המקור שבתוך src/data
import DATA_PLAYERS from "../data/players.json";

const LS = {
  players: "katregel_players_v3",
  cycles: "katregel_cycles_v3",
  ui: "katregel_ui_v3",
};

const PUBLIC_JSON = "/players.json"; // שים קובץ גם ב-public

export function useStorage() {
  const [players, setPlayers] = useState([]);
  const [cycles, setCycles] = useState([]); // מחזורים שמורים
  const [ui, setUi] = useState({
    hiddenRatings: false,
    bonusWeek: false,
    bonusMonth: false,
  });

  // טעינה ראשונית
  useEffect(() => {
    (async () => {
      try {
        // 1) ננסה מה-localStorage אם יש
        const pLS = safeParse(localStorage.getItem(LS.players));
        const cLS = safeParse(localStorage.getItem(LS.cycles)) || [];
        const uLS = safeParse(localStorage.getItem(LS.ui));

        if (Array.isArray(pLS) && pLS.length) {
          setPlayers(pLS.map(toPlayer));
        } else {
          // 2) נטען חכם מה-public ואם לא טוב – מה-src/data
          const smart = await fetchPlayersSmart();
          setPlayers(smart);
        }

        if (Array.isArray(cLS)) setCycles(cLS);
        if (uLS) setUi(uLS);
      } catch {
        // במקרה של תקלה – נטען מ-src/data
        setPlayers(mapPlayers(DATA_PLAYERS));
      }
    })();
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
    players,
    setPlayers,
    cycles,
    setCycles,
    hiddenRatings: ui.hiddenRatings,
    setHiddenRatings: (v) => setUi((s) => ({ ...s, hiddenRatings: v })),
    bonusWeek: ui.bonusWeek,
    bonusMonth: ui.bonusMonth,
    setBonusWeek: (v) => setUi((s) => ({ ...s, bonusWeek: v })),
    setBonusMonth: (v) => setUi((s) => ({ ...s, bonusMonth: v })),
  };
}

/* ---------------------- טעינה חכמה ---------------------- */

async function fetchPlayersSmart() {
  // ננסה קודם את public/players.json
  try {
    const r = await fetch(PUBLIC_JSON, { cache: "no-store" });
    if (r.ok) {
      const raw = await r.json();
      const mapped = mapPlayers(raw);
      if (hasDiverseRatings(mapped)) return mapped;
      // אם כל הציונים אותו דבר/ריקים – נעבור לנפילה
    }
  } catch {
    // נמשיך לנפילה
  }
  // נפילה ל-src/data/players.json (נכנס בבילד)
  return mapPlayers(DATA_PLAYERS);
}

/* ---------------------- מיפוי ועזרים ---------------------- */

export const POS = ["GK", "DF", "MF", "FW"];

function mapPlayers(arr) {
  return (Array.isArray(arr) ? arr : []).map(toPlayer);
}

function toPlayer(p = {}) {
  const rating = coerceRating(
    p.rating ?? p.rate ?? p.score ?? p["ציון"] ?? p["rating"]
  );

  const name =
    (typeof p.name === "string" && p.name.trim()) ||
    p["שם"] ||
    p["player"] ||
    "";

  const pos =
    (typeof p.pos === "string" && p.pos.toUpperCase()) ||
    p["עמדה"] ||
    "MF";

  return {
    id: p.id || crypto.randomUUID(),
    name,
    pos: POS.includes(pos) ? pos : "MF",
    rating: isFinite(rating) ? clamp(rating, 1, 10) : 6.5,
    active:
      typeof p.active === "boolean"
        ? p.active
        : false, // ברירת מחדל: לא משחק
    mustWith: Array.isArray(p.mustWith) ? p.mustWith : [],
    avoidWith: Array.isArray(p.avoidWith) ? p.avoidWith : [],
    // שדות אפשריים לחישובים עתידיים:
    goals: Number(p.goals || 0),
    wins: Number(p.wins || 0),
  };
}

function coerceRating(v) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    // תומך גם בפורמט "9,5"
    const s = v.replace(",", ".").trim();
    const n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }
  return NaN;
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

function hasDiverseRatings(players) {
  // נחשב מספר ערכים שונים של rating; אם יש לפחות 3 שונים – נחשב "אמיתי"
  const set = new Set(players.map((p) => Number(p.rating || 0).toFixed(1)));
  return set.size >= 3;
}

function safeParse(txt) {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

/* עזרי חישוב כלליים (אם צריך במקומות אחרים) */
export function sum(arr, sel = (x) => x) {
  return arr.reduce((a, x) => a + (sel(x) || 0), 0);
}
export function avg(arr, sel = (x) => x) {
  if (!arr?.length) return 0;
  return sum(arr, sel) / arr.length;
}

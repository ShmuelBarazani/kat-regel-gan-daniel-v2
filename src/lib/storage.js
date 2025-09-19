// src/lib/storage.js
import { useEffect, useState } from "react";

// JSON עם הציונים האמיתיים – יושב בשורש הפרויקט: /data/players.json
// הקובץ הזה נכנס לבאנדל, אז אפשר לייבא אותו ישירות.
import DATA_PLAYERS from "../../data/players.json";

const LS = {
  players: "katregel_players_v3",
  cycles:  "katregel_cycles_v3",
  ui:      "katregel_ui_v3",
};

const PUBLIC_JSON = "/players.json"; // אם קיים ב-public נטען קודם

export function useStorage() {
  const [players, setPlayers] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [ui, setUi] = useState({
    hiddenRatings: false,
    bonusWeek: false,
    bonusMonth: false,
  });

  // טעינה ראשונית
  useEffect(() => {
    (async () => {
      try {
        const pLS = safeParse(localStorage.getItem(LS.players));
        const cLS = safeParse(localStorage.getItem(LS.cycles)) || [];
        const uLS = safeParse(localStorage.getItem(LS.ui));

        if (Array.isArray(cLS)) setCycles(cLS);
        if (uLS) setUi(uLS);

        // 1) אם יש players ב-LS אבל הציונים לא “אמיתיים” → נדלג וניטען מחדש
        if (Array.isArray(pLS) && pLS.length) {
          const mapped = pLS.map(toPlayer);
          if (hasDiverseRatings(mapped)) {
            setPlayers(mapped);
            return;
          }
        }

        // 2) טעינה חכמה: public → ואם לא טוב/אין ציונים אמיתיים → data/players.json
        const smart = await fetchPlayersSmart();
        setPlayers(smart);
      } catch {
        // נפילה אחרונה: data/players.json
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
    players, setPlayers,
    cycles, setCycles,
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
  try {
    const r = await fetch(PUBLIC_JSON, { cache: "no-store" });
    if (r.ok) {
      const raw = await r.json();
      const mapped = mapPlayers(raw);
      if (hasDiverseRatings(mapped)) return mapped;
    }
  } catch { /* נמשיך לנפילה */ }

  // נפילה ל-/data/players.json (יובא למעלה)
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
    p["שם"] || p["player"] || "";

  const pos =
    (typeof p.pos === "string" && p.pos.toUpperCase()) ||
    p["עמדה"] || "MF";

  return {
    id: p.id || crypto.randomUUID(),
    name,
    pos: ["GK","DF","MF","FW"].includes(pos) ? pos : "MF",
    rating: isFinite(rating) ? clamp(rating, 1, 10) : 6.5,
    active: typeof p.active === "boolean" ? p.active : false, // ברירת מחדל: לא משחק
    mustWith: Array.isArray(p.mustWith) ? p.mustWith : [],
    avoidWith: Array.isArray(p.avoidWith) ? p.avoidWith : [],
    goals: Number(p.goals || 0),
    wins: Number(p.wins || 0),
  };
}

function coerceRating(v) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v.replace(",", ".").trim(); // תומך גם "9,5"
    const n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }
  return NaN;
}

function clamp(x, min, max) { return Math.max(min, Math.min(max, x)); }

function hasDiverseRatings(players) {
  // נחשב כמה ערכי ציון שונים יש; אם לפחות 3 שונים → נחשב “אמיתי”
  const set = new Set(players.map(p => Number(p.rating || 0).toFixed(1)));
  return set.size >= 3;
}

function safeParse(txt) { try { return JSON.parse(txt); } catch { return null; } }

// src/lib/storage.js
import { useEffect, useState } from "react";

const LS = {
  players: "katregel_players_v7", // bump כדי לא לקרוא LS ישן
  cycles:  "katregel_cycles_v3",
  ui:      "katregel_ui_v3",
};

export const POS = ["GK","DF","MF","FW"];
const PUBLIC_JSON = "/players.json"; // מקור אמת: public/players.json

export function useStorage() {
  const [players, setPlayers] = useState([]);
  const [cycles, setCycles]   = useState([]);
  const [ui, setUi] = useState({
    hiddenRatings: false,
    bonusWeek: false,
    bonusMonth: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(PUBLIC_JSON + "?ts=" + Date.now(), { cache: "no-store" });
        if (!r.ok) throw new Error("לא נמצא public/players.json");
        const raw = await r.json();
        const mapped = mapPlayers(raw);
        setPlayers(mapped);

        const cLS = safeParse(localStorage.getItem(LS.cycles)) || [];
        if (Array.isArray(cLS)) setCycles(cLS);

        const uLS = safeParse(localStorage.getItem(LS.ui));
        if (uLS) setUi(uLS);

        // כלי דיבאג: בקונסול -> debugPlayers()
        window.debugPlayers = () =>
          console.table(mapped.map(p => ({ name:p.name, pos:p.pos, rating:p.rating, active:p.active })));
      } catch (e) {
        console.error("טעינת שחקנים נכשלה:", e);
        setPlayers([]);
      }
    })();
  }, []);

  useEffect(() => { localStorage.setItem(LS.players, JSON.stringify(players)); }, [players]);
  useEffect(() => { localStorage.setItem(LS.cycles,  JSON.stringify(cycles));  }, [cycles]);
  useEffect(() => { localStorage.setItem(LS.ui,      JSON.stringify(ui));      }, [ui]);

  return {
    players, setPlayers,
    cycles, setCycles,
    hiddenRatings: ui.hiddenRatings,
    setHiddenRatings: (v) => setUi(s => ({ ...s, hiddenRatings: v })),
    bonusWeek: ui.bonusWeek,
    bonusMonth: ui.bonusMonth,
    setBonusWeek:  (v) => setUi(s => ({ ...s, bonusWeek: v })),
    setBonusMonth: (v) => setUi(s => ({ ...s, bonusMonth: v })),
  };
}

/* -------- מיפוי קובץ ה-JSON שלך -------- */
function mapPlayers(arr) {
  return (Array.isArray(arr) ? arr : []).map(toPlayer);
}

function toPlayer(p = {}) {
  // ⚠️ כאן ההתאמות לשמות השדות אצלך:
  // r = הציון, selected = משחק?, prefer/avoid = חייב/לא עם
  const rating = coerceRating(
    p.r ?? p.rating ?? p.rate ?? p.score ?? p["ציון"]
  );

  const name = (typeof p.name === "string" && p.name.trim())
            || p["שם"] || p["player"] || "";

  const posRaw = (typeof p.pos === "string" && p.pos.trim())
              || p["עמדה"] || "MF";
  const pos = POS.includes(posRaw.toUpperCase()) ? posRaw.toUpperCase() : "MF";

  const mustWith  = Array.isArray(p.prefer)    ? p.prefer    :
                    Array.isArray(p.mustWith)  ? p.mustWith  : [];
  const avoidWith = Array.isArray(p.avoid)     ? p.avoid     :
                    Array.isArray(p.avoidWith) ? p.avoidWith : [];

  return {
    id: String(p.id || crypto.randomUUID()),
    name,
    pos,
    rating: isFinite(rating) ? clamp(rating, 1, 10) : 6.5,
    active: typeof p.selected === "boolean" ? p.selected
          : typeof p.active   === "boolean" ? p.active : false,
    mustWith,
    avoidWith,
    goals: Number(p.goals || 0),
    wins:  Number(p.wins  || 0),
  };
}

/* -------- עזרים -------- */
function coerceRating(v){
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", ".").trim());
    return isFinite(n) ? n : NaN;
  }
  return NaN;
}
function clamp(x,min,max){ return Math.max(min, Math.min(max, x)); }
function safeParse(t){ try { return JSON.parse(t); } catch { return null; } }

// src/lib/storage.js
import { useEffect, useMemo, useState } from "react";

const LS = {
  players: "katregel_players_v3",
  cycles: "katregel_cycles_v3",
  ui: "katregel_ui_v3",
};

const PUBLIC_JSON = "/players.json"; // שים ב-public

export function useStorage() {
  const [players, setPlayers] = useState([]);
  const [cycles, setCycles] = useState([]); // מחזורים שמורים
  const [ui, setUi] = useState({ hiddenRatings: false, bonusWeek: false, bonusMonth: false });

  // טעינה
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS.players) || "null");
      const c = JSON.parse(localStorage.getItem(LS.cycles) || "[]");
      const u = JSON.parse(localStorage.getItem(LS.ui) || "null");
      if (Array.isArray(p) && p.length) setPlayers(p);
      else fetchPublicPlayers().then(setPlayers).catch(() => setPlayers([]));
      if (Array.isArray(c)) setCycles(c);
      if (u) setUi(u);
    } catch {
      fetchPublicPlayers().then(setPlayers).catch(() => setPlayers([]));
    }
  }, []);

  // שמירה
  useEffect(() => {
    localStorage.setItem(LS.players, JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem(LS.cycles, JSON.stringify(cycles));
  }, [cycles]);

  useEffect(() => {
    localStorage.setItem(LS.ui, JSON.stringify(ui));
  }, [ui]);

  const hiddenRatings = ui.hiddenRatings;
  const setHiddenRatings = (v) => setUi(s => ({ ...s, hiddenRatings: v }));
  const bonusWeek = ui.bonusWeek;
  const bonusMonth = ui.bonusMonth;
  const setBonusWeek = (v) => setUi(s => ({ ...s, bonusWeek: v }));
  const setBonusMonth = (v) => setUi(s => ({ ...s, bonusMonth: v }));

  return {
    players, setPlayers,
    cycles, setCycles,
    hiddenRatings, setHiddenRatings,
    bonusWeek, bonusMonth, setBonusWeek, setBonusMonth,
  };
}

async function fetchPublicPlayers() {
  const r = await fetch(PUBLIC_JSON);
  if (!r.ok) return [];
  const raw = await r.json();
  return (raw || []).map(p => ({
    id: p.id || crypto.randomUUID(),
    name: p.name || "",
    pos: p.pos || "MF",
    rating: typeof p.rating === "number" ? p.rating : 6.5,
    active: typeof p.active === "boolean" ? p.active : false, // ברירת-מחדל: לא משחק אם לא צוין
    mustWith: Array.isArray(p.mustWith) ? p.mustWith : [],
    avoidWith: Array.isArray(p.avoidWith) ? p.avoidWith : [],
  }));
}

// עזרי חישוב
export const POS = ["GK", "DF", "MF", "FW"];
export function sum(arr, sel = (x) => x) { return arr.reduce((a, x) => a + (sel(x) || 0), 0); }
export function avg(arr, sel = (x) => x) {
  if (!arr.length) return 0;
  const s = sum(arr, sel);
  return s / arr.length;
}

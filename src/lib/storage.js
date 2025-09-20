// src/lib/storage.js
import { useEffect, useState } from "react";

export const POS = ["GK", "DF", "MF", "FW"];

const K_PLAYERS = "katregel_players_v2";
const K_CYCLES  = "katregel_cycles_v2";
const K_LAST    = "katregel_last_teams_v2";

export function useStorage() {
  const [players, setPlayersState] = useState([]);

  // טעינת שחקנים ראשונית (מה-localStorage, ואם אין – מ/public/players.json)
  useEffect(() => {
    const saved = localStorage.getItem(K_PLAYERS);
    if (saved) {
      setPlayersState(JSON.parse(saved));
    } else {
      fetch("/players.json")
        .then(r => r.json())
        .then(list => {
          const norm = list.map(x => ({
            id: String(x.id ?? crypto.randomUUID()),
            name: x.name,
            pos: x.pos,
            rating: Number(x.r ?? x.rating ?? 6.5),
            active: !!x.selected,
            mustWith: x.prefer ?? [],
            avoidWith: x.avoid ?? [],
          }));
          setPlayersState(norm);
          localStorage.setItem(K_PLAYERS, JSON.stringify(norm));
        })
        .catch(() => setPlayersState([]));
    }
  }, []);

  const setPlayers = (updater) =>
    setPlayersState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem(K_PLAYERS, JSON.stringify(next));
      return next;
    });

  // מחזורים (Saved cycles)
  const getCycles = () => JSON.parse(localStorage.getItem(K_CYCLES) || "[]");
  const setCycles = (arr) => localStorage.setItem(K_CYCLES, JSON.stringify(arr));
  const addCycle  = (cycle) => { const a = getCycles(); a.unshift(cycle); setCycles(a); };
  const removeCycles = (ids) => {
    setCycles(getCycles().filter(c => !ids.includes(c.id)));
  };

  // קבוצות אחרונות (מצב עמוד "עשה כוחות")
  const getLastTeams = () => JSON.parse(localStorage.getItem(K_LAST) || "null");
  const setLastTeams = (obj) => localStorage.setItem(K_LAST, JSON.stringify(obj));

  return { players, setPlayers, getCycles, setCycles, addCycle, removeCycles, getLastTeams, setLastTeams };
}

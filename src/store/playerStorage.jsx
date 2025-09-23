// src/store/playerStorage.jsx
import React, { createContext, useContext, useMemo, useReducer } from "react";
import { loadPlayers, savePlayers, loadCycles, saveCycles, loadSettings, saveSettings } from "../lib/storage";
import seed from "../data/players.json";

// מיפוי דו-כיווני בין הסכמה שלך לסכמה פנימית
const toInternal = (p) => ({
  id: p.id,
  name: p.name,
  rating: p.r,
  pos: p.pos,
  active: !!p.selected,
  mustWith: Array.isArray(p.prefer) ? p.prefer : [],
  avoidWith: Array.isArray(p.avoid) ? p.avoid : [],
});
const toExternal = (p) => ({
  id: p.id,
  name: p.name,
  r: p.rating,
  pos: p.pos,
  selected: !!p.active,
  prefer: Array.isArray(p.mustWith) ? p.mustWith : [],
  avoid: Array.isArray(p.avoidWith) ? p.avoidWith : [],
});

const AppCtx = createContext(null);

const initial = () => {
  const lsPlayers = loadPlayers(); // אם יש LS, הוא בסכמה החיצונית שלך
  const base = lsPlayers && Array.isArray(lsPlayers) ? lsPlayers : seed;
  return {
    // שומרים פנימית כמבנה נוח לעבודה — אך נשמרים חזרה בסכמה שלך
    players: base.map(toInternal),
    cycles: loadCycles(),          // [{id,ts,teams:[{id,name,players,sum,avg}],goals:[{playerId,goals}], ...}]
    settings: loadSettings(),      // { bonus: true|false }
  };
};

function reducer(state, action) {
  switch (action.type) {
    case "players/set": {
      const players = action.players;
      savePlayers(players.map(toExternal));
      return { ...state, players };
    }
    case "players/add": {
      const players = [...state.players, action.player];
      savePlayers(players.map(toExternal));
      return { ...state, players };
    }
    case "players/update": {
      const players = state.players.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p));
      savePlayers(players.map(toExternal));
      return { ...state, players };
    }
    case "players/delete": {
      const players = state.players.filter((p) => p.id !== action.id);
      savePlayers(players.map(toExternal));
      return { ...state, players };
    }
    case "cycles/set": {
      const cycles = action.cycles;
      saveCycles(cycles);
      return { ...state, cycles };
    }
    case "cycles/add": {
      const cycles = [...state.cycles, action.cycle];
      saveCycles(cycles);
      return { ...state, cycles };
    }
    case "settings/set": {
      const settings = { ...state.settings, ...action.patch };
      saveSettings(settings);
      return { ...state, settings };
    }
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);

  const api = useMemo(
    () => ({
      state,
      setPlayers: (players) => dispatch({ type: "players/set", players }),
      addPlayer: (player) => dispatch({ type: "players/add", player }),
      updatePlayer: (id, patch) => dispatch({ type: "players/update", id, patch }),
      deletePlayer: (id) => dispatch({ type: "players/delete", id }),
      addCycle: (cycle) => dispatch({ type: "cycles/add", cycle }),
      setCycles: (cycles) => dispatch({ type: "cycles/set", cycles }),
      setSettings: (patch) => dispatch({ type: "settings/set", patch }),
    }),
    [state]
  );

  return <AppCtx.Provider value={api}>{children}</AppCtx.Provider>;
}

export const useApp = () => useContext(AppCtx);

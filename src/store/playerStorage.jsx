// src/store/playerStorage.jsx
import React, { createContext, useContext, useMemo, useReducer } from "react";
import {
  loadPlayers,
  savePlayers,
  loadCycles,
  saveCycles,
  loadSettings,
  saveSettings,
} from "../lib/storage";
import seed from "../data/players.json";

/* ---------- מיפוי וסניטציה ---------- */

// סניטציה לפורמט החיצוני (הקיים אצלך ב-players.json וב-LS)
const sanitizeExternal = (p) => ({
  id: p?.id ?? Date.now(),
  name: String(p?.name ?? ""),
  r: Number.isFinite(+p?.r) ? +p.r : 0,
  pos: ["GK", "DF", "MF", "FW"].includes(p?.pos) ? p.pos : "MF",
  selected: !!p?.selected,
  prefer: Array.isArray(p?.prefer) ? p.prefer.filter(Number.isFinite) : [],
  avoid: Array.isArray(p?.avoid) ? p.avoid.filter(Number.isFinite) : [],
});

// המרה לפורמט פנימי נוח לעבודה
const toInternal = (p) => ({
  id: p.id,
  name: p.name,
  rating: p.r,
  pos: p.pos,
  active: !!p.selected,
  mustWith: Array.isArray(p.prefer) ? p.prefer : [],
  avoidWith: Array.isArray(p.avoid) ? p.avoid : [],
});

// המרה חזרה לפורמט שלך (לשמירה ב-LS)
const toExternal = (p) => ({
  id: p.id,
  name: p.name,
  r: p.rating,
  pos: p.pos,
  selected: !!p.active,
  prefer: Array.isArray(p.mustWith) ? p.mustWith : [],
  avoid: Array.isArray(p.avoidWith) ? p.avoidWith : [],
});

const safeArray = (arr) => (Array.isArray(arr) ? arr : []);

/* ---------- Settings/UI ברירת-מחדל ---------- */

const DEFAULT_SETTINGS = {
  bonus: true,
  sortBy: "name",
  sortDir: "asc",
};

const DEFAULT_UI = {
  sortBy: "name",
  sortDir: "asc",
};

/* ---------- Context + Fallback ---------- */

const AppCtx = createContext(null);

// Fallback מלא במקרה שמישהו קורא לקרס לפני ה-Provider
const NOOP = () => {};
const FALLBACK = {
  state: {
    players: [],
    cycles: [],
    settings: { ...DEFAULT_SETTINGS },
    ui: { ...DEFAULT_UI },
  },
  setPlayers: NOOP,
  addPlayer: NOOP,
  updatePlayer: NOOP,
  deletePlayer: NOOP,
  addCycle: NOOP,
  setCycles: NOOP,
  setSettings: NOOP,
  setUI: NOOP,
};

/* ---------- Initial State ---------- */

const initial = () => {
  try {
    const lsPlayers = loadPlayers(); // אם יש ב-LS – בפורמט החיצוני שלך
    const baseRaw = lsPlayers && Array.isArray(lsPlayers) ? lsPlayers : seed;
    const base = baseRaw.map(sanitizeExternal);

    const loadedSettings = loadSettings() ?? {};
    const settings = { ...DEFAULT_SETTINGS, ...(loadedSettings || {}) };

    return {
      players: base.map(toInternal),
      cycles: safeArray(loadCycles()),
      settings,
      ui: { ...DEFAULT_UI, sortBy: settings.sortBy, sortDir: settings.sortDir },
    };
  } catch (e) {
    console.error("[initial state] fallback to seed", e);
    const base = safeArray(seed).map(sanitizeExternal);
    return {
      players: base.map(toInternal),
      cycles: [],
      settings: { ...DEFAULT_SETTINGS },
      ui: { ...DEFAULT_UI },
    };
  }
};

/* ---------- Reducer ---------- */

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
      const players = state.players.map((p) =>
        p.id === action.id ? { ...p, ...action.patch } : p
      );
      savePlayers(players.map(toExternal));
      return { ...state, players };
    }

    case "players/delete": {
      const players = state.players.filter((p) => p.id !== action.id);
      savePlayers(players.map(toExternal));
      return { ...state, players };
    }

    case "cycles/set": {
      const cycles = safeArray(action.cycles);
      saveCycles(cycles);
      return { ...state, cycles };
    }

    case "cycles/add": {
      const cycles = [...state.cycles, action.cycle];
      saveCycles(cycles);
      return { ...state, cycles };
    }

    // הגדרות — נשמר גם ב-LS וגם מסתנכרן ל-ui
    case "settings/set": {
      const nextSettings = { ...state.settings, ...action.patch };
      saveSettings(nextSettings);
      const nextUI = {
        ...state.ui,
        sortBy:
          "sortBy" in action.patch
            ? action.patch.sortBy
            : state.ui.sortBy ?? DEFAULT_UI.sortBy,
        sortDir:
          "sortDir" in action.patch
            ? action.patch.sortDir
            : state.ui.sortDir ?? DEFAULT_UI.sortDir,
      };
      return { ...state, settings: nextSettings, ui: nextUI };
    }

    // במידה ורכיב ישן מעדכן UI ישירות
    case "ui/set": {
      const ui = { ...state.ui, ...action.patch };
      const settings = {
        ...state.settings,
        sortBy: ui.sortBy ?? state.settings.sortBy ?? DEFAULT_SETTINGS.sortBy,
        sortDir: ui.sortDir ?? state.settings.sortDir ?? DEFAULT_SETTINGS.sortDir,
      };
      saveSettings(settings);
      return { ...state, ui, settings };
    }

    default:
      return state;
  }
}

/* ---------- Provider + API ---------- */

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);

  const api = useMemo(
    () => ({
      state,
      // players
      setPlayers: (players) => dispatch({ type: "players/set", players }),
      addPlayer: (player) => dispatch({ type: "players/add", player }),
      updatePlayer: (id, patch) =>
        dispatch({ type: "players/update", id, patch }),
      deletePlayer: (id) => dispatch({ type: "players/delete", id }),

      // cycles
      addCycle: (cycle) => dispatch({ type: "cycles/add", cycle }),
      setCycles: (cycles) => dispatch({ type: "cycles/set", cycles }),

      // settings/ui
      setSettings: (patch) => dispatch({ type: "settings/set", patch }),
      setUI: (patch) => dispatch({ type: "ui/set", patch }),
    }),
    [state]
  );

  return <AppCtx.Provider value={api}>{children}</AppCtx.Provider>;
}

/* ---------- Hooks ---------- */

export const useApp = () => {
  const ctx = useContext(AppCtx);
  // אם בטעות נקרא מחוץ ל-Provider – מחזיר Fallback כדי לא לקרוס
  return ctx ?? FALLBACK;
};

// Alias לשם הישן כדי למנוע שבירה בקבצים קיימים
export const useAppStore = useApp;

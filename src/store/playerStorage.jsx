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
  // כדי לכסות רכיבים ישנים שצורכים settings.sortBy/sortDir:
  sortBy: "name",
  sortDir: "asc",
};

const DEFAULT_UI = {
  // כדי לכסות רכיבים אחרים שצורכים ui.sortBy/ui.sortDir:
  sortBy: "name",
  sortDir: "asc",
};

/* ---------- Context ---------- */

const AppCtx = createContext(null);

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
      const cycles = [...stat]()

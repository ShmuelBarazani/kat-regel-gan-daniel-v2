// src/store/playerStorage.jsx
import React, { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import {
  getPlayers, savePlayers,
  getCurrentState, saveCurrentState,
  getCycles, saveCycles,
  saveCycleSnapshot, loadCycleSnapshot, deleteCycle as deleteCycleStorage,
  exportAll as exportAllStorage, importAll as importAllStorage
} from "@/lib/storage";
import { computeTeamStats, isBalanced, movePlayerBalanced } from "@/logic/balance";

const AppCtx = createContext(null);

function initState() {
  return {
    players: getPlayers(),
    current: getCurrentState(),
    cycles: getCycles(),
    ui: { sortBy: "name", sortDir: "asc" }
  };
}

function reducer(state, action) {
  switch (action.type) {
    // ----- Players -----
    case "players/set": {
      const players = savePlayers(action.players);
      return { ...state, players };
    }
    case "players/add": {
      const players = savePlayers([...state.players, action.player]);
      return { ...state, players };
    }
    case "players/update": {
      const players = savePlayers(
        state.players.map(p => p.id === action.player.id ? { ...p, ...action.player } : p)
      );
      return { ...state, players };
    }
    case "players/delete": {
      const players = savePlayers(state.players.filter(p => p.id !== action.id));
      const newTeams = state.current.teams.map(t => ({ ...t, playerIds: t.playerIds.filter(pid => pid !== action.id) }));
      const current = saveCurrentState({ ...state.current, teams: newTeams });
      return { ...state, players, current };
    }

    // ----- Current: Teams / Fixtures / Scorers -----
    case "current/set": {
      const current = saveCurrentState(action.current);
      return { ...state, current };
    }
    case "teams/set": {
      const current = saveCurrentState({ ...state.current, teams: action.teams });
      return { ...state, current };
    }
    case "teams/toggleShowRatings": {
      const teams = state.current.teams.map(t => t.id === action.teamId ? { ...t, showRatings: !t.showRatings } : t);
      const current = saveCurrentState({ ...state.current, teams });
      return { ...state, current };
    }
    case "teams/movePlayer": {
      const teams = movePlayerBalanced(state.current.teams, action.playerId, action.fromTeamId, action.toTeamId);
      if (teams === state.current.teams) return state;
      const current = saveCurrentState({ ...state.current, teams });
      return { ...state, current };
    }
    case "fixtures/set": {
      const current = saveCurrentState({ ...state.current, fixtures: action.fixtures });
      return { ...state, current };
    }
    case "fixtures/patchOne": {
      const fixtures = state.current.fixtures.map(f => f.id === action.id ? { ...f, ...action.patch } : f);
      const current = saveCurrentState({ ...state.current, fixtures });
      return { ...state, current };
    }
    case "scorers/setOne": {
      const scorers = { ...state.current.scorers, [action.playerId]: action.goals };
      const current = saveCurrentState({ ...state.current, scorers });
      return { ...state, current };
    }
    case "current/resetAll": {
      const empty = saveCurrentState({ teams: defaultTeams(4), fixtures: [], scorers: {} });
      return { ...state, current: empty };
    }

    // ----- Cycles -----
    case "cycles/set": {
      const cycles = saveCycles(action.cycles);
      return { ...state, cycles };
    }
    case "cycles/saveSnapshot": {
      const entry = saveCycleSnapshot(action.name, action.payload);
      const cycles = [entry, ...state.cycles];
      return { ...state, cycles };
    }
    case "cycles/delete": {
      const cycles = deleteCycleStorage(action.id);
      return { ...state, cycles };
    }

    // ----- UI -----
    case "ui/sort": {
      const { sortBy } = action;
      let sortDir = state.ui.sortDir;
      if (sortBy === state.ui.sortBy) {
        sortDir = state.ui.sortDir === "asc" ? "desc" : "asc";
      } else {
        sortDir = "asc";
      }
      return { ...state, ui: { sortBy, sortDir } };
    }

    default:
      return state;
  }
}

function defaultTeams(n = 4) {
  return Array.from({ length: n }).map((_, i) => ({
    id: crypto.randomUUID(),
    name: `קבוצה ${i + 1}`,
    playerIds: [],
    showRatings: true
  }));
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  const sortedPlayers = useMemo(() => {
    const { sortBy, sortDir } = state.ui;
    const factor = sortDir === "asc" ? 1 : -1;
    const arr = [...state.players];
    arr.sort((a, b) => {
      const A = sortKey(a, sortBy);
      const B = sortKey(b, sortBy);
      if (A < B) return -1 * factor;
      if (A > B) return 1 * factor;
      return 0;
    });
    return arr;
  }, [state.players, state.ui]);

  const teamStats = useMemo(() => computeTeamStats(state.current.teams, state.players), [state.current.teams, state.players]);
  const teamsBalanced = useMemo(() => isBalanced(state.current.teams), [state.current.teams]);

  const addPlayer = useCallback((player) => dispatch({ type: "players/add", player }), []);
  const updatePlayer = useCallback((player) => dispatch({ type: "players/update", player }), []);
  const deletePlayer = useCallback((id) => dispatch({ type: "players/delete", id }), []);
  const setPlayers = useCallback((players) => dispatch({ type: "players/set", players }), []);

  const togglePlayerPlays = useCallback((id, plays) => {
    const p = state.players.find(x => x.id === id);
    if (!p) return;
    dispatch({ type: "players/update", player: { ...p, plays: Boolean(plays) } });
  }, [state.players]);

  const setTeams = useCallback((teams) => dispatch({ type: "teams/set", teams }), []);
  const toggleShowRatings = useCallback((teamId) => dispatch({ type: "teams/toggleShowRatings", teamId }), []);
  const movePlayer = useCallback((playerId, fromTeamId, toTeamId) => {
    dispatch({ type: "teams/movePlayer", playerId, fromTeamId, toTeamId });
  }, []);
  const resetCurrent = useCallback(() => dispatch({ type: "current/resetAll" }), []);

  const setFixtureScore = useCallback((fixtureId, patch) => {
    dispatch({ type: "fixtures/patchOne", id: fixtureId, patch });
  }, []);
  const setScorer = useCallback((playerId, goals) => {
    dispatch({ type: "scorers/setOne", playerId, goals: Number(goals) || 0 });
  }, []);

  const createFixturesFromTeams = useCallback(() => {
    const teams = state.current.teams;
    if (teams.length < 2) {
      dispatch({ type: "fixtures/set", fixtures: [] });
      return;
    }
    const fixtures = [];
    for (let i = 0; i < teams.length; i += 2) {
      const a = teams[i];
      const b = teams[i + 1];
      if (a && b) {
        fixtures.push({
          id: crypto.randomUUID(),
          homeId: a.id,
          awayId: b.id,
          scoreHome: 0,
          scoreAway: 0
        });
      }
    }
    dispatch({ type: "fixtures/set", fixtures });
  }, [state.current.teams]);

  const saveSnapshot = useCallback((name) => {
    const payload = state.current;
    dispatch({ type: "cycles/saveSnapshot", name, payload });
  }, [state.current]);

  const openSnapshot = useCallback((id) => {
    const data = loadCycleSnapshot(id);
    if (!data) return false;
    dispatch({ type: "current/set", current: data });
    return true;
  }, []);

  const deleteCycle = useCallback((id) => {
    dispatch({ type: "cycles/delete", id });
  }, []);

  const exportAll = useCallback(() => exportAllStorage(), []);
  const importAll = useCallback((jsonString) => {
    importAllStorage(jsonString);
    const players = getPlayers();
    const current = getCurrentState();
    const cycles = getCycles();
    dispatch({ type: "players/set", players });
    dispatch({ type: "current/set", current });
    dispatch({ type: "cycles/set", cycles });
  }, []);

  const sortBy = useCallback((field) => dispatch({ type: "ui/sort", sortBy: field }), []);

  const value = useMemo(() => ({
    players: state.players,
    sortedPlayers,
    current: state.current,
    teamStats,
    teamsBalanced,
    cycles: state.cycles,
    ui: state.ui,

    addPlayer, updatePlayer, deletePlayer, setPlayers, togglePlayerPlays,
    setTeams, toggleShowRatings, movePlayer, resetCurrent,
    setFixtureScore, setScorer, createFixturesFromTeams,
    saveSnapshot, openSnapshot, deleteCycle,
    exportAll, importAll,
    sortBy,
  }), [
    state, sortedPlayers, teamStats, teamsBalanced,
    addPlayer, updatePlayer, deletePlayer, setPlayers, togglePlayerPlays,
    setTeams, toggleShowRatings, movePlayer, resetCurrent,
    setFixtureScore, setScorer, createFixturesFromTeams,
    saveSnapshot, openSnapshot, deleteCycle,
    exportAll, importAll, sortBy
  ]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useAppStore must be used within <AppProvider>");
  return ctx;
}

function sortKey(p, by) {
  switch (by) {
    case "plays": return p.plays ? 1 : 0;
    case "pos": return p.pos || "";
    case "rating": return Number(p.rating) || 0;
    case "must": return (p.mustWith?.length || 0);      // מיון לפי כמות “חייב עם”
    case "avoid": return (p.avoidWith?.length || 0);     // מיון לפי כמות “לא עם”
    case "name":
    default:
      return (p.name || "").toString();
  }
}

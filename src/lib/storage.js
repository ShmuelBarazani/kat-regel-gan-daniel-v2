// src/lib/storage.js

// ===== Keys =====
const STORAGE_KEYS = {
  players: "katregal:players",
  teamCount: "katregal:teamCount",
  teams: "katregal:teams",
  teamsHistory: "katregal:teams:snapshots",
  rounds: "katregal:rounds" // NEW
};

// LocalStorage-safe (עובד גם בזמן build/SSR)
function ls() {
  if (typeof window === "undefined") {
    const mem = new Map();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
  }
  return window.localStorage;
}

function readJSON(key, fallback) {
  try {
    const raw = ls().getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    ls().setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/permission errors
  }
}

// ===== Players API =====
export function getPlayers() {
  return readJSON(STORAGE_KEYS.players, []);
}

export function setPlayers(list) {
  writeJSON(STORAGE_KEYS.players, Array.isArray(list) ? list : []);
}

export function countActive(players) {
  const arr = Array.isArray(players) ? players : getPlayers();
  return arr.filter((p) => p && p.active !== false).length;
}

// ===== Teams count =====
export function getTeamCount() {
  const n = readJSON(STORAGE_KEYS.teamCount, 4);
  const num = Number(n);
  return Number.isFinite(num) && num > 0 ? num : 4;
}

export function setTeamCount(n) {
  const num = Number(n);
  writeJSON(STORAGE_KEYS.teamCount, Number.isFinite(num) && num > 0 ? num : 4);
}

// ===== Rounds (NEW) =====
// מבנה מומלץ: [{id:1, name:"מחזור 1", date:"2025-09-01"}, ...]
export function getRounds() {
  return readJSON(STORAGE_KEYS.rounds, []);
}

export function setRounds(rounds) {
  writeJSON(STORAGE_KEYS.rounds, Array.isArray(rounds) ? rounds : []);
}

// ===== Teams snapshots/history =====
export function saveTeamsSnapshot(snapshot) {
  const history = readJSON(STORAGE_KEYS.teamsHistory, []);
  const entry = { ...snapshot, _ts: Date.now() };
  history.push(entry);
  const trimmed = history.slice(-50);
  writeJSON(STORAGE_KEYS.teamsHistory, trimmed);
  writeJSON(STORAGE_KEYS.teams, snapshot?.teams ?? null);
}

export function getLastTeams() {
  return readJSON(STORAGE_KEYS.teams, null);
}

export function getTeamsHistory() {
  return readJSON(STORAGE_KEYS.teamsHistory, []);
}

// ===== Maintenance =====
export function clearAllStorage() {
  try {
    ls().removeItem(STORAGE_KEYS.players);
    ls().removeItem(STORAGE_KEYS.teamCount);
    ls().removeItem(STORAGE_KEYS.teams);
    ls().removeItem(STORAGE_KEYS.teamsHistory);
    ls().removeItem(STORAGE_KEYS.rounds);
  } catch {}
}

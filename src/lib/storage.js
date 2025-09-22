// src/lib/storage.js
import playersSeed from "@/data/players.json";

export const STORAGE_KEYS = {
  players: "katregel.players.v2",
  cycles: "katregel.cycles.v2",          // רשימת מחזורים שמורים (metadata)
  current: "katregel.current.v2",        // מצב נוכחי (קבוצות, שיבוצים, משחקים, כובשים)
};

// --- Utilities ---
function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function load(key, fallback) {
  const raw = localStorage.getItem(key);
  return safeParse(raw, fallback);
}
function ensureId(obj) {
  if (!obj.id) obj.id = crypto.randomUUID();
  return obj;
}

// --- Players ---
export function getPlayers() {
  let players = load(STORAGE_KEYS.players, null);
  if (!players) {
    // first run: seed from file
    players = playersSeed.map((p) =>
      ensureId({
        name: p.name,
        pos: p.pos ?? "MF",
        rating: typeof p.rating === "number" ? p.rating : 5,
        plays: p.plays ?? true,
        mustWith: Array.isArray(p.mustWith) ? p.mustWith : [],
        avoidWith: Array.isArray(p.avoidWith) ? p.avoidWith : [],
      })
    );
    savePlayers(players);
  }
  return players;
}

export function savePlayers(players) {
  const normalized = players.map((p) =>
    ensureId({
      id: p.id,
      name: String(p.name ?? "").trim(),
      pos: p.pos ?? "MF",
      rating: Number.isFinite(p.rating) ? p.rating : 5,
      plays: Boolean(p.plays),
      mustWith: Array.isArray(p.mustWith) ? p.mustWith : [],
      avoidWith: Array.isArray(p.avoidWith) ? p.avoidWith : [],
    })
  );
  save(STORAGE_KEYS.players, normalized);
  return normalized;
}

// --- Current session (teams/fixtures/scorers UI state) ---
export function getCurrentState() {
  // shape:
  // {
  //   teams: [{id, name, playerIds:[], showRatings:boolean}],
  //   fixtures: [{id, homeId, awayId, scoreHome, scoreAway}],
  //   scorers: { [playerId]: goalsNumber },
  // }
  return load(STORAGE_KEYS.current, {
    teams: defaultTeams(),
    fixtures: [],
    scorers: {},
  });
}

export function saveCurrentState(state) {
  const sane = {
    teams: Array.isArray(state?.teams) ? state.teams.map(sanitizeTeam) : defaultTeams(),
    fixtures: Array.isArray(state?.fixtures) ? state.fixtures.map(sanitizeFixture) : [],
    scorers: typeof state?.scorers === "object" && state?.scorers ? state.scorers : {},
  };
  save(STORAGE_KEYS.current, sane);
  return sane;
}

function defaultTeams(n = 4) {
  return Array.from({ length: n }).map((_, i) => ({
    id: crypto.randomUUID(),
    name: `קבוצה ${i + 1}`,
    playerIds: [],
    showRatings: true,
  }));
}

function sanitizeTeam(t) {
  return {
    id: t.id ?? crypto.randomUUID(),
    name: String(t.name ?? "קבוצה"),
    playerIds: Array.isArray(t.playerIds) ? t.playerIds : [],
    showRatings: Boolean(t.showRatings),
  };
}
function sanitizeFixture(f) {
  return {
    id: f.id ?? crypto.randomUUID(),
    homeId: f.homeId ?? null,
    awayId: f.awayId ?? null,
    scoreHome: Number.isFinite(f.scoreHome) ? f.scoreHome : 0,
    scoreAway: Number.isFinite(f.scoreAway) ? f.scoreAway : 0,
  };
}

// --- Cycles list (saved snapshots) ---
export function getCycles() {
  // each cycle meta: { id, name, dateISO }
  return load(STORAGE_KEYS.cycles, []);
}

export function saveCycles(list) {
  const sane = (Array.isArray(list) ? list : []).map((c) => ({
    id: c.id ?? crypto.randomUUID(),
    name: String(c.name ?? "מחזור ללא שם"),
    dateISO: c.dateISO ?? new Date().toISOString(),
  }));
  save(STORAGE_KEYS.cycles, sane);
  return sane;
}

// create a snapshot entry in cycles, and persist currentState payload under an additional key
export function saveCycleSnapshot(name, payload) {
  const id = crypto.randomUUID();
  const cycles = getCycles();
  const entry = { id, name: name?.trim() || nameFromNow(), dateISO: new Date().toISOString() };
  const updated = [entry, ...cycles];
  saveCycles(updated);
  // payload under dedicated key:
  localStorage.setItem(cycleDataKey(id), JSON.stringify(payload ?? getCurrentState()));
  return entry;
}

export function loadCycleSnapshot(id) {
  const raw = localStorage.getItem(cycleDataKey(id));
  return safeParse(raw, null);
}

export function deleteCycle(id) {
  const list = getCycles().filter((c) => c.id !== id);
  saveCycles(list);
  localStorage.removeItem(cycleDataKey(id));
  return list;
}

function cycleDataKey(id) {
  return `katregel.cycle.${id}`;
}
function nameFromNow() {
  return new Date().toLocaleString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- Export/Import ALL data (for מעבר בין מחשבים) ---
export function exportAll() {
  const blob = {
    players: getPlayers(),
    current: getCurrentState(),
    cycles: getCycles(),
    snapshots: getCycles().map((c) => ({ id: c.id, data: loadCycleSnapshot(c.id) })),
    version: 2,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(blob, null, 2);
}

export function importAll(jsonString) {
  const data = safeParse(jsonString, null);
  if (!data) throw new Error("קובץ JSON לא תקין.");
  if (!Array.isArray(data.players)) throw new Error("שדה players חסר או לא תקין.");

  savePlayers(data.players);
  if (data.current) saveCurrentState(data.current);

  if (Array.isArray(data.cycles)) {
    saveCycles(data.cycles);
    if (Array.isArray(data.snapshots)) {
      data.snapshots.forEach((s) => {
        if (s?.id && s?.data) {
          localStorage.setItem(cycleDataKey(s.id), JSON.stringify(s.data));
        }
      });
    }
  }
}

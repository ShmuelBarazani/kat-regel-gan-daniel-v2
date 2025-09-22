// src/lib/storage.js
import playersSeed from "@/data/players.json";

export const STORAGE_KEYS = {
  players: "katregel.players.v2",
  cycles: "katregel.cycles.v2",
  current: "katregel.current.v2",
};

// ---------- Utils ----------
function safeParse(json, fallback) {
  try { return JSON.parse(json) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function load(key, fallback) {
  return safeParse(localStorage.getItem(key), fallback);
}
function ensureIdStr(x) {
  // ממיר מספרים/מחרוזות למחרוזת; יוצר GUID אם חסר
  if (!x) return crypto.randomUUID();
  return String(x);
}

// ---------- Players ----------
/**
 * מנרמל שחקן מ-seed בכל אחת מהסכימות:
 * 1) הסכימה החדשה (שלך): {id, name, r, pos, selected, prefer[id], avoid[id]}
 * 2) הישנה: {id?, name, pos, rating, plays, mustWith[names], avoidWith[names]}
 */
function normalizeSeedPlayers(seedArr) {
  const arr = Array.isArray(seedArr) ? seedArr : [];

  // מפה id->name עבור prefer/avoid לפי מזהים
  const idToName = new Map(arr.map((p) => [String(p.id ?? ""), String(p.name ?? "")]));

  return arr.map((p) => {
    const isNewSchema = "r" in p || "selected" in p || "prefer" in p || "avoid" in p;

    const id = ensureIdStr(p.id);
    const name = String(p.name ?? "").trim();
    const pos = p.pos ?? "MF";
    const rating = isNewSchema ? Number(p.r ?? 5) : Number(p.rating ?? 5);
    const plays = isNewSchema ? Boolean(p.selected ?? true) : Boolean(p.plays ?? true);

    let mustWith = [];
    let avoidWith = [];

    if (isNewSchema) {
      const preferIds = Array.isArray(p.prefer) ? p.prefer : [];
      const avoidIds = Array.isArray(p.avoid) ? p.avoid : [];
      mustWith = preferIds.map((pid) => idToName.get(String(pid))).filter(Boolean);
      avoidWith = avoidIds.map((pid) => idToName.get(String(pid))).filter(Boolean);
    } else {
      mustWith = Array.isArray(p.mustWith) ? p.mustWith : [];
      avoidWith = Array.isArray(p.avoidWith) ? p.avoidWith : [];
    }

    return { id, name, pos, rating, plays, mustWith, avoidWith };
  });
}

export function getPlayers() {
  let players = load(STORAGE_KEYS.players, null);
  if (!players) {
    // first run from seed file (תומך בשתי הסכימות)
    players = normalizeSeedPlayers(playersSeed);
    savePlayers(players);
  }
  return players;
}

export function savePlayers(players) {
  const normalized = (Array.isArray(players) ? players : []).map((p) => ({
    id: ensureIdStr(p.id),
    name: String(p.name ?? "").trim(),
    pos: p.pos ?? "MF",
    rating: Number.isFinite(p.rating) ? p.rating : Number(p.r ?? 5),
    plays: typeof p.plays === "boolean" ? p.plays : Boolean(p.selected ?? true),
    mustWith: Array.isArray(p.mustWith) ? p.mustWith : [],
    avoidWith: Array.isArray(p.avoidWith) ? p.avoidWith : [],
  }));
  save(STORAGE_KEYS.players, normalized);
  return normalized;
}

// ---------- Current session ----------
export function getCurrentState() {
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
    id: ensureIdStr(t.id),
    name: String(t.name ?? "קבוצה"),
    playerIds: Array.isArray(t.playerIds) ? t.playerIds.map(ensureIdStr) : [],
    showRatings: Boolean(t.showRatings),
  };
}
function sanitizeFixture(f) {
  return {
    id: ensureIdStr(f.id),
    homeId: f.homeId ? ensureIdStr(f.homeId) : null,
    awayId: f.awayId ? ensureIdStr(f.awayId) : null,
    scoreHome: Number.isFinite(f.scoreHome) ? f.scoreHome : 0,
    scoreAway: Number.isFinite(f.scoreAway) ? f.scoreAway : 0,
  };
}

// ---------- Cycles (snapshots) ----------
export function getCycles() {
  return load(STORAGE_KEYS.cycles, []);
}
export function saveCycles(list) {
  const sane = (Array.isArray(list) ? list : []).map((c) => ({
    id: ensureIdStr(c.id),
    name: String(c.name ?? "מחזור ללא שם"),
    dateISO: c.dateISO ?? new Date().toISOString(),
  }));
  save(STORAGE_KEYS.cycles, sane);
  return sane;
}
export function saveCycleSnapshot(name, payload) {
  const id = crypto.randomUUID();
  const entry = { id, name: name?.trim() || nameFromNow(), dateISO: new Date().toISOString() };
  const updated = [entry, ...getCycles()];
  saveCycles(updated);
  localStorage.setItem(cycleDataKey(id), JSON.stringify(payload ?? getCurrentState()));
  return entry;
}
export function loadCycleSnapshot(id) {
  return safeParse(localStorage.getItem(cycleDataKey(id)), null);
}
export function deleteCycle(id) {
  const list = getCycles().filter((c) => c.id !== id);
  saveCycles(list);
  localStorage.removeItem(cycleDataKey(id));
  return list;
}
function cycleDataKey(id) { return `katregel.cycle.${id}`; }
function nameFromNow() {
  return new Date().toLocaleString("he-IL", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// ---------- Export/Import ALL ----------
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

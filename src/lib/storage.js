// src/lib/storage.js
// Storage אחיד לכל המסכים + Bootstrap אוטומטי מ-public/players.json + תאימות שדות (r/rating, selected/active)

const STORAGE_KEYS = {
  players: "katregal:players",
  playersVer: "katregal:players:ver", // לבקרת Bootstrap
  teamCount: "katregal:teamCount",
  teams: "katregal:teams",
  teamsHistory: "katregal:teams:snapshots",
  rounds: "katregal:rounds",
};

const BOOTSTRAP_VERSION = "2025-09-20-v1";

// LocalStorage-safe (עובד גם ב-SSR/Build)
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
  } catch {}
}

function toNumberOr(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

// ---- נרמול שחקן: מיישר שמות שדות ותאימות למסכים קיימים ----
function normalizePlayer(raw, idToName) {
  if (!raw) return null;
  const name = raw.name || "";
  if (!name) return null;

  // map prefer/avoid -> שמות (אם ניתנו מזהים)
  const toNameList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val
        .map((x) => {
          if (idToName && (typeof x === "number" || (typeof x === "string" && idToName.has(String(x))))) {
            return idToName.get(String(x)) ?? String(x);
          }
          return String(x);
        })
        .filter(Boolean);
    }
    return String(val).split(",").map((s) => s.trim()).filter(Boolean);
  };

  const rating = toNumberOr(raw.r ?? raw.rating, 6);
  const active = (typeof raw.selected === "boolean") ? raw.selected : (raw.active !== false);

  const mustWith = Array.isArray(raw.mustWith) ? raw.mustWith : toNameList(raw.prefer);
  const avoidWith = Array.isArray(raw.avoidWith) ? raw.avoidWith : toNameList(raw.avoid);

  const pos = raw.pos || "MF";

  // מחזירים גם וגם (לתאימות מסכים קיימים)
  return {
    ...raw,
    name,
    pos,
    rating,         // לשדות החדשים
    r: rating,      // לתצוגות הישנות
    active,         // לשדות החדשים
    selected: active, // לתצוגות הישנות
    mustWith,
    avoidWith,
  };
}

// ---- נרמול מערך שחקנים ממקור ייבוא (public/players.json) ----
function normalizeImportedList(arr) {
  if (!Array.isArray(arr)) return [];
  const idToName = new Map();
  for (const p of arr) {
    if (p && p.name && (typeof p.id === "number" || typeof p.id === "string")) {
      idToName.set(String(p.id), p.name);
    }
  }
  return arr.map((p) => normalizePlayer(p, idToName)).filter(Boolean);
}

// ---- Bootstrap אוטומטי מ-/players.json (רק בדפדפן, פעם אחת לגרסה) ----
async function bootstrapFromPublicIfNeeded() {
  if (typeof window === "undefined") return; // לא בזמן build
  try {
    const currentVer = ls().getItem(STORAGE_KEYS.playersVer);
    const existing = readJSON(STORAGE_KEYS.players, []);
    const needsBootstrap =
      currentVer !== BOOTSTRAP_VERSION || !Array.isArray(existing) || existing.length < 20;

    if (!needsBootstrap) return;

    const res = await fetch("/players.json", { cache: "no-store" });
    if (!res.ok) {
      // אין קובץ public/players.json – לא נורא, נשארים עם מה שיש
      ls().setItem(STORAGE_KEYS.playersVer, BOOTSTRAP_VERSION);
      return;
    }
    const raw = await res.json();
    const normalized = normalizeImportedList(raw);
    if (normalized.length) {
      writeJSON(STORAGE_KEYS.players, normalized);
    }
    ls().setItem(STORAGE_KEYS.playersVer, BOOTSTRAP_VERSION);
  } catch {
    // מתעלמים – לא חוסם את האפליקציה
  }
}

// מריצים Bootstrap ברגע שהמודול נטען בדפדפן
if (typeof window !== "undefined") {
  bootstrapFromPublicIfNeeded();
}

// ===== Public API =====

// שחקנים
export function getPlayers() {
  // תמיד נחזיר מנורמל (גם אם זה נתון ישן ב-LS)
  const arr = readJSON(STORAGE_KEYS.players, []);
  return Array.isArray(arr) ? arr.map((p) => normalizePlayer(p)) : [];
}

export function setPlayers(list) {
  const arr = Array.isArray(list) ? list.map((p) => normalizePlayer(p)) : [];
  writeJSON(STORAGE_KEYS.players, arr);
}

// כמה פעילים
export function countActive(players) {
  const arr = Array.isArray(players) ? players : getPlayers();
  return arr.filter((p) => p && (p.active ?? p.selected) !== false).length;
}

// מספר קבוצות
export function getTeamCount() {
  const n = readJSON(STORAGE_KEYS.teamCount, 4);
  const num = Number(n);
  return Number.isFinite(num) && num > 0 ? num : 4;
}
export function setTeamCount(n) {
  const num = Number(n);
  writeJSON(STORAGE_KEYS.teamCount, Number.isFinite(num) && num > 0 ? num : 4);
}

// מחזורים
export function getRounds() {
  return readJSON(STORAGE_KEYS.rounds, []);
}
export function setRounds(rounds) {
  writeJSON(STORAGE_KEYS.rounds, Array.isArray(rounds) ? rounds : []);
}

// היסטוריית קבוצות
export function saveTeamsSnapshot(snapshot) {
  const history = readJSON(STORAGE_KEYS.teamsHistory, []);
  const entry = { ...snapshot, _ts: Date.now() };
  history.push(entry);
  writeJSON(STORAGE_KEYS.teamsHistory, history.slice(-50));
  writeJSON(STORAGE_KEYS.teams, snapshot?.teams ?? null);
}
export function getLastTeams() {
  return readJSON(STORAGE_KEYS.teams, null);
}
export function getTeamsHistory() {
  return readJSON(STORAGE_KEYS.teamsHistory, []);
}

// ניקוי כולל (זהירות!)
export function clearAllStorage() {
  try {
    ls().removeItem(STORAGE_KEYS.players);
    ls().removeItem(STORAGE_KEYS.playersVer);
    ls().removeItem(STORAGE_KEYS.teamCount);
    ls().removeItem(STORAGE_KEYS.teams);
    ls().removeItem(STORAGE_KEYS.teamsHistory);
    ls().removeItem(STORAGE_KEYS.rounds);
  } catch {}
}

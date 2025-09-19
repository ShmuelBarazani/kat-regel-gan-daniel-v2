// src/lib/storage.js
// שכבת אחסון: טעינה ושמירה של players/cycles מ-GitHub (דרך /api/read ו-/api/save)
// עם נפילה ל-localStorage אם ה-API לא זמין.

const LS_PLAYERS = "krgd_v2_players";
const LS_CYCLES  = "krgd_v2_cycles";

const REMOTE_PLAYERS_PATH = "data/players.json";
const REMOTE_CYCLES_PATH  = "data/cycles.json";

// debounce למניעת שמירות/קריאות תכופות
export function debounce(fn, ms = 800) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* -------------------- LOAD -------------------- */

export async function loadPlayers() {
  // 1) לטעון דרך ה-API מה-GitHub
  try {
    const r = await fetch(`/api/read?path=${encodeURIComponent(REMOTE_PLAYERS_PATH)}`, { cache: "no-store" });
    if (r.ok) {
      const json = await r.json();
      return (Array.isArray(json) ? json : []).map(p => ({
        ...p,
        rating: typeof p.rating === "number" ? p.rating : Number(p.r) || 0
      }));
    }
  } catch {}

  // 2) אם נכשל – נסה קובץ סטטי (רק אם במקרה נמצא גם ב-public)
  try {
    const r2 = await fetch(`/${REMOTE_PLAYERS_PATH}`, { cache: "no-store" });
    if (r2.ok) {
      const json = await r2.json();
      return Array.isArray(json) ? json : [];
    }
  } catch {}

  // 3) נפילה ל-localStorage
  try {
    const raw = localStorage.getItem(LS_PLAYERS);
    if (raw) return JSON.parse(raw);
  } catch {}

  return [];
}

export async function loadCycles() {
  try {
    const r = await fetch(`/api/read?path=${encodeURIComponent(REMOTE_CYCLES_PATH)}`, { cache: "no-store" });
    if (r.ok) {
      const json = await r.json();
      return Array.isArray(json) ? json : [];
    }
  } catch {}

  try {
    const r2 = await fetch(`/${REMOTE_CYCLES_PATH}`, { cache: "no-store" });
    if (r2.ok) {
      const json = await r2.json();
      return Array.isArray(json) ? json : [];
    }
  } catch {}

  try {
    const raw = localStorage.getItem(LS_CYCLES);
    if (raw) return JSON.parse(raw);
  } catch {}

  return [];
}

/* -------------------- SAVE -------------------- */

// ניסיון שמירה מרוחק ל-GitHub דרך פונקציית השרת /api/save
async function saveRemote(path, content, message) {
  try {
    const r = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content, message })
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return true;
  } catch (e) {
    console.warn("Remote save failed → fallback to localStorage", e);
    return false;
  }
}

export async function savePlayers(players, commitMessage = "update players.json") {
  const ok = await saveRemote(REMOTE_PLAYERS_PATH, players, commitMessage);
  if (!ok) {
    localStorage.setItem(LS_PLAYERS, JSON.stringify(players));
  }
}

export async function saveCycles(cycles, commitMessage = "update cycles.json") {
  const ok = await saveRemote(REMOTE_CYCLES_PATH, cycles, commitMessage);
  if (!ok) {
    localStorage.setItem(LS_CYCLES, JSON.stringify(cycles));
  }
}

// טעינת/שמירת שחקנים עם מיפוי תקין ל־players.json הפנימי (r, selected, prefer/avoid כ-IDs)
const KEY = "katregel.players.v1";

export function loadPlayers() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (_e) {
    return [];
  }
}

export function savePlayers(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list ?? []));
  } catch (_e) {}
}

/** טוען מ-/players.json אם אין נתונים, עם המרות מפתחות ושדות */
export async function seedIfEmpty() {
  const current = loadPlayers();
  if (current && current.length) return current;
  return await _loadFromFileAndNormalize();
}

/** רענון כפוי מהקובץ (דורס localStorage) */
export async function reloadFromFile() {
  localStorage.removeItem(KEY);
  return await _loadFromFileAndNormalize();
}

async function _loadFromFileAndNormalize() {
  try {
    const res = await fetch("/players.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // תמיכה במערך ישיר או באובייקט {players:[...]}
    const raw = Array.isArray(json) ? json : Array.isArray(json?.players) ? json.players : [];
    // מפת id -> name (נחוץ להמרת prefer/avoid ממזהים לשמות)
    const idToName = new Map(raw.map(p => [normId(p.id), (p.name ?? "").toString().trim()]));

    const arr = raw.map(p => {
      const id = p.id ?? cryptoId();
      const name = (p.name ?? "").toString().trim();
      const rating = resolveNumber(p.rating, p.r, 0);
      const active = resolveBool(p.active, p.selected, false);

      const preferIds = normalizeArray(p.prefer);
      const avoidIds  = normalizeArray(p.avoid);

      const mustWithNames  = preferIds.map(i => idToName.get(normId(i))).filter(Boolean);
      const avoidWithNames = avoidIds.map(i => idToName.get(normId(i))).filter(Boolean);

      return {
        id,
        name,
        pos: p.pos || "MF",
        rating,
        active,
        mustWith: mustWithNames,
        avoidWith: avoidWithNames,
      };
    });

    savePlayers(arr);
    return arr;
  } catch (e) {
    console.error("players seed load failed:", e);
    savePlayers([]);
    return [];
  }
}

// ---------- helpers ----------
function resolveNumber(...candidates) {
  for (const c of candidates) {
    if (typeof c === "number" && !Number.isNaN(c)) return c;
    const n = Number(c);
    if (!Number.isNaN(n) && c !== undefined && c !== null && c !== "") return n;
  }
  return 0;
}
function resolveBool(...candidates) {
  for (const c of candidates) {
    if (typeof c === "boolean") return c;
    if (c === 1 || c === "1" || c === "true") return true;
    if (c === 0 || c === "0" || c === "false") return false;
  }
  return false;
}
function normalizeArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v).split(",").map(s => s.trim()).filter(Boolean);
}
function normId(v) {
  // מזהים בקובץ שלך הם מספרים; מאחד ל-string להשוואה עקבית
  return String(v);
}
function cryptoId() {
  return window.crypto?.randomUUID?.() || "id_" + Math.random().toString(36).slice(2);
}

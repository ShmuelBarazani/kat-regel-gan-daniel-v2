// טענת/שמירת שחקנים + זריעה מקובץ public/players.json
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

/** זורע נתונים אם אין כלום ב־localStorage ע"י טעינה מ-/players.json. מחזיר את המערך. */
export async function seedIfEmpty() {
  const current = loadPlayers();
  if (current && current.length) return current;

  try {
    const res = await fetch("/players.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // תומך גם במבנה { players:[...] } וגם במערך ישיר
    let arr = Array.isArray(json) ? json : (Array.isArray(json?.players) ? json.players : []);
    arr = arr.map((p) => ({
      id: p.id || cryptoId(),
      // ברירת מחדל: לא מסומן כמשחק אם לא צוין אחרת
      active: p.active ?? false,
      name: (p.name ?? "").toString().trim(),
      pos: p.pos || "MF",
      rating: typeof p.rating === "number" ? p.rating : Number(p.rating) || 0,
      mustWith: Array.isArray(p.mustWith) ? p.mustWith : splitCsv(p.mustWith),
      avoidWith: Array.isArray(p.avoidWith) ? p.avoidWith : splitCsv(p.avoidWith),
    }));

    savePlayers(arr);
    return arr;
  } catch (e) {
    console.error("seedIfEmpty(): טעינת /players.json נכשלה", e);
    savePlayers([]);
    return [];
  }
}

export async function reloadFromFile() {
  localStorage.removeItem(KEY);
  return seedIfEmpty();
}

function splitCsv(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v).split(",").map((s) => s.trim()).filter(Boolean);
}

function cryptoId() {
  return window.crypto?.randomUUID?.() || "id_" + Math.random().toString(36).slice(2);
}

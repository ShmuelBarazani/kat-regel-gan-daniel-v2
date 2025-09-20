/* src/lib/storage.js
 * מקור יחיד לניהול נתונים בצד לקוח:
 * - טעינת players.json מ־/public
 * - שמירה/קריאה של שחקנים, הגדרות וכוחות ב-localStorage
 * - ארכיון מחזורים (למסך מנהל/דירוג)
 */

const isBrowser = typeof window !== "undefined";

// מפתחות שמורים
const KEYS = {
  players: "kr_players_v2",
  teamCount: "kr_team_count_v2",
  lastTeams: "katregel_last_teams_v2",
  rounds: "kr_rounds_v2",             // ארכיון מחזורים שמורים
  bonuses: "kr_bonus_flags_v1",       // אופציונלי (בונוסים בשקלול דירוג)
};

// עזר — קריאה/כתיבה ל-localStorage בבטיחות
function readLS(key, fallback = null) {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key, value) {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ----------------------------------------------------
//                 שחקנים (Players)
// ----------------------------------------------------

// טעינה ראשונית של players.json מה-public (אם אין LS)
async function loadPlayersFromPublic() {
  try {
    const res = await fetch("/players.json", { cache: "no-store" });
    if (!res.ok) throw new Error("players.json fetch failed");
    /** @type {Array<{id:number,name:string,r:number,pos:'GK'|'DF'|'MF'|'FW'}>} */
    const arr = await res.json();
    // נורמליזציה — מוסיף שדות חסרים (playing, must/avoid)
    return arr.map((p, idx) => ({
      id: p.id ?? idx + 1,
      name: p.name?.trim() ?? `שחקן ${idx + 1}`,
      r: Number(p.r ?? 6.5),
      pos: (p.pos ?? "MF").toUpperCase(),
      playing: !!p.playing,               // ברירת מחדל false
      prefer: Array.isArray(p.prefer) ? [...p.prefer] : [], // alias ישנים
      avoid: Array.isArray(p.avoid) ? [...p.avoid] : [],
      mustWith: Array.isArray(p.mustWith) ? [...p.mustWith] : [],
      avoidWith: Array.isArray(p.avoidWith) ? [...p.avoidWith] : [],
    }));
  } catch {
    return [];
  }
}

// מחזיר מערך שחקנים (קודם LS, אחרת public + שמירה)
export async function getPlayers() {
  let players = readLS(KEYS.players, null);
  if (players && Array.isArray(players)) return players;

  players = await loadPlayersFromPublic();
  // אם לא הגיע כלום — שומר מערך ריק כדי לא להפיל מסכים
  writeLS(KEYS.players, players);
  return players;
}

// שמירת המערך כולו
export function setPlayers(players) {
  writeLS(KEYS.players, Array.isArray(players) ? players : []);
}

// כמה פעילים (משחק?) — לשורת המונה
export function countActive(players) {
  const list = Array.isArray(players) ? players : [];
  return list.reduce((acc, p) => acc + (p.playing ? 1 : 0), 0);
}

// יצירה/עדכון/מחיקה של שחקן בודד
export function upsertPlayer(player) {
  const list = readLS(KEYS.players, []);
  const idx = list.findIndex((p) => p.id === player.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...player };
  else list.push({ ...player, id: player.id ?? genId(list) });
  writeLS(KEYS.players, list);
  return list;
}
export function deletePlayer(id) {
  const list = readLS(KEYS.players, []);
  const next = list.filter((p) => p.id !== id);
  writeLS(KEYS.players, next);
  return next;
}
function genId(list) {
  return list.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0) + 1;
}

// ----------------------------------------------------
//            הגדרות כלליות (מס’ קבוצות / בונוסים)
// ----------------------------------------------------

export function getTeamCount() {
  const n = Number(readLS(KEYS.teamCount, 4));
  return Number.isFinite(n) && n > 0 ? n : 4;
}
export function setTeamCount(n) {
  writeLS(KEYS.teamCount, Number(n));
}

export function getBonusFlags() {
  return readLS(KEYS.bonuses, { weekly: false, monthly: false });
}
export function setBonusFlags(flags) {
  writeLS(KEYS.bonuses, { weekly: !!flags.weekly, monthly: !!flags.monthly });
}

// ----------------------------------------------------
//                   כוחות אחרונים (Last Teams)
// ----------------------------------------------------

// שמירת צילום מצב אחרון (עבור “עשה כוחות”)
// groups: Array<Array<number>> של מזהי שחקנים בכל קבוצה
// players: מערך מלא (בשביל מטא/סיכומים)
export function saveTeamsSnapshot(groups, players) {
  const teamCount = groups.length;
  const totals = groups.map((ids) =>
    ids.reduce((s, id) => s + (players.find((p) => p.id === id)?.r ?? 0), 0)
  );
  const avgs = totals.map((sum, i) =>
    Number((sum / Math.max(groups[i].length || 1, 1)).toFixed(2))
  );

  const payload = {
    teamCount,
    groups,
    totals,
    avgs,
    activeCount: countActive(players),
    ts: Date.now(),
  };

  writeLS(KEYS.lastTeams, payload);

  // דוחפים אוטומטית לארכיון מחזורים (למסך מנהל)
  const rounds = readLS(KEYS.rounds, []);
  const id = createRoundId(payload.ts);
  const row = {
    id, ts: payload.ts, teamCount,
    groups,
    totals,
    avgs,
    activeCount: payload.activeCount,
    results: null, // ימולאו אח"כ במסך מנהל
  };
  writeLS(KEYS.rounds, [row, ...rounds]);

  return payload;
}

export function getLastTeams() {
  return readLS(KEYS.lastTeams, null);
}

// ----------------------------------------------------
//                   ארכיון מחזורים (Admin)
// ----------------------------------------------------

// מחזיר את כל המחזורים השמורים (חדש → ישן)
export function getRounds() {
  const arr = readLS(KEYS.rounds, []);
  return Array.isArray(arr) ? arr : [];
}

// עדכון תוצאות למחזור (שערים/ציונים/הערות)
export function setRoundResults(roundId, results) {
  const arr = getRounds();
  const ix = arr.findIndex((r) => r.id === roundId);
  if (ix === -1) return arr;
  arr[ix] = { ...arr[ix], results: { ...(arr[ix].results || {}), ...results } };
  writeLS(KEYS.rounds, arr);
  return arr[ix];
}

// מחיקה/שחזור
export function deleteRounds(ids) {
  const arr = getRounds().filter((r) => !ids.includes(r.id));
  writeLS(KEYS.rounds, arr);
  return arr;
}

// ----------------------------------------------------
//                 עזר לחישובי כוחות
// ----------------------------------------------------

// סכום/ממוצע לפי מערך מזהים
export function sumByIds(ids, players) {
  return ids.reduce((s, id) => s + (players.find((p) => p.id === id)?.r ?? 0), 0);
}
export function avgByIds(ids, players) {
  if (!ids.length) return 0;
  return Number((sumByIds(ids, players) / ids.length).toFixed(2));
}

// רשימות קשרים לשחקן
export function setMustAvoidFor(id, { mustWith = [], avoidWith = [] }) {
  const list = readLS(KEYS.players, []);
  const ix = list.findIndex((p) => p.id === id);
  if (ix === -1) return list;
  list[ix].mustWith = [...new Set(mustWith.map(Number))];
  list[ix].avoidWith = [...new Set(avoidWith.map(Number))];
  writeLS(KEYS.players, list);
  return list[ix];
}

// ----------------------------------------------------

function createRoundId(ts = Date.now()) {
  // id קריא: YYYYMMDD-HHMMSS
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export default {
  // שחקנים
  getPlayers,
  setPlayers,
  upsertPlayer,
  deletePlayer,
  countActive,
  setMustAvoidFor,
  // הגדרות
  getTeamCount,
  setTeamCount,
  getBonusFlags,
  setBonusFlags,
  // כוחות
  saveTeamsSnapshot,
  getLastTeams,
  sumByIds,
  avgByIds,
  // מחזורים (מנהל)
  getRounds,
  setRoundResults,
  deleteRounds,
};
// =============== ROUNDS (Cycles) =================

// key קבוע ל־localStorage
const ROUNDS_KEY = "katregel_rounds_v1";

// עוזרים בטוחים ל־SSR/Build (לא נוגעים ב-window בזמן build)
function hasLS() {
  return typeof window !== "undefined" && !!window.localStorage;
}
function readLS(key, fallback = null) {
  try {
    if (hasLS()) {
      const v = window.localStorage.getItem(key);
      if (v != null) return JSON.parse(v);
    }
  } catch (_) {}
  return fallback;
}
function writeLS(key, value) {
  try {
    if (hasLS()) window.localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

/**
 * מחזיר מערך מחזורים (rounds).
 * קודם כל מנסה מה־localStorage; אם ריק – מנסה לטעון מ־/data/cycles.json.
 */
export async function getRounds() {
  const fromLS = readLS(ROUNDS_KEY, null);
  if (fromLS) return fromLS;

  // נפילה שקטה אם אין קובץ/גישה (ריצה רק בדפדפן)
  try {
    const res = await fetch("/data/cycles.json", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      writeLS(ROUNDS_KEY, data);
      return data;
    }
  } catch (_) {}

  return []; // דיפולט
}

/**
 * שומר מערך מחזורים ל־localStorage ומחזיר אותו.
 */
export function setRounds(rounds) {
  const safe = Array.isArray(rounds) ? rounds : [];
  writeLS(ROUNDS_KEY, safe);
  return safe;
}

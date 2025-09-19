import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Kat Regel – TeamMaker.jsx (גרסת שחזור מלאה)
 * ---------------------------------------------------------
 * מה יש כאן:
 * 1) טבלת שחקנים מלאה עם מיון ע"י לחיצה על כותרת עמודה
 * 2) בחירת "משחק?" בכל שורה – toggle שנשמר ל-localStorage
 *    ברירת מחדל: לפי הקובץ; ואם אין – לא משחק
 * 3) שדות "חייב עם" / "לא עם" – עריכה מהירה (comma separated), נשמר ל-localStorage
 * 4) כפתור "עשה כוחות" עם חלוקה לקבוצות מאוזנות (ציון/עמדות), בהתחשבות בהעדפות
 * 5) ה‑UI ב-RTL עם ערכת הצבעים שנראית בתמונה (כהה‑ירוק)
 * 6) טעינת נתונים: קודם localStorage; אם אין – ינסה להביא "/players.json" (לשים ב/public)
 * 7) אין תלות ב-Tailwind או ספריות חיצוניות – קובץ יחיד להדבקה
 * ---------------------------------------------------------
 */

// נתיב ברירת מחדל לקובץ השחקנים כאשר מריצים דרך Vite/CRA – שים את players.json בתוך public/
const PLAYERS_JSON_URL = "/players.json";

// מפתחות אחסון מקומי
const LS_KEYS = {
  players: "katregel_players_v2",
  prefs: "katregel_prefs_v2", // כאן נשמרים משחק?/חייב/לא עם
};

// עמודות הטבלה
const COLUMNS = [
  { key: "active", label: "משחק?", width: 72, sortable: true },
  { key: "name", label: "שם", width: 220, sortable: true },
  { key: "pos", label: "עמדה", width: 96, sortable: true },
  { key: "rating", label: "ציון", width: 96, sortable: true },
  { key: "mustWith", label: "חייב עם", width: 220, sortable: true },
  { key: "avoidWith", label: "לא עם", width: 220, sortable: true },
];

// עזר: ניקוי שמות + פיצול מחרוזת לרשימה
function normalizeListInput(text) {
  if (!text) return [];
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// עזר: הצגת רשימת שמות כתגים קומפקטיים
function Chips({ items }) {
  if (!items?.length) return <span className="muted">—</span>;
  return (
    <span className="chips">
      {items.map((x) => (
        <span className="chip" key={x} title={x}>
          {x}
        </span>
      ))}
    </span>
  );
}

export default function TeamMaker() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState({ key: "name", dir: "asc" });

  // הגדרות חלוקה לקבוצות
  const [numTeams, setNumTeams] = useState(4);
  const [teams, setTeams] = useState([]);

  // טעינה ראשונית: קודם מה-localStorage, אחרת מ-players.json
  useEffect(() => {
    (async () => {
      try {
        const cachedPlayers = loadPlayersFromLocalStorage();
        if (cachedPlayers?.length) {
          setPlayers(cachedPlayers);
          setLoading(false);
          return;
        }
        const fromJson = await fetchPlayersFromJson();
        setPlayers(fromJson);
      } catch (e) {
        console.error("שגיאה בטעינת שחקנים:", e);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // שמירה אוטומטית של השחקנים (כולל ה-preferences) לכל שינוי
  useEffect(() => {
    if (!loading) savePlayersToLocalStorage(players);
  }, [players, loading]);

  // פונקציית מיון בעת לחיצה על כותרת
  function onHeaderClick(colKey) {
    if (!COLUMNS.find((c) => c.key === colKey)?.sortable) return;
    setSort((prev) => {
      const dir = prev.key === colKey && prev.dir === "asc" ? "desc" : "asc";
      return { key: colKey, dir };
    });
  }

  // players ממוין לתצוגה
  const sortedPlayers = useMemo(() => {
    const arr = [...players];
    const { key, dir } = sort;
    arr.sort((a, b) => {
      let va = a[key];
      let vb = b[key];
      // לטפל בעמודות מורכבות
      if (key === "mustWith" || key === "avoidWith") {
        va = (va || []).join(", ");
        vb = (vb || []).join(", ");
      }
      if (key === "active") {
        va = a.active ? 1 : 0;
        vb = b.active ? 1 : 0;
      }
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [players, sort]);

  // עדכוני שדה בשחקן
  function patchPlayer(id, patch) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function toggleActive(id) {
    const p = players.find((x) => x.id === id);
    if (!p) return;
    patchPlayer(id, { active: !p.active });
  }

  function editListField(id, field) {
    const p = players.find((x) => x.id === id);
    const current = (p?.[field] || []).join(", ");
    const next = window.prompt(
      field === "mustWith"
        ? "ערוך רשימת 'חייב עם' (שמות מופרדים בפסיק)"
        : "ערוך רשימת 'לא עם' (שמות מופרדים בפסיק)",
      current
    );
    if (next === null) return; // ביטול
    const list = normalizeListInput(next);
    patchPlayer(id, { [field]: list });
  }

  function addPlayer() {
    const name = window.prompt("שם שחקן חדש:");
    if (!name) return;
    const pos = (window.prompt("עמדה (GK/DF/MF/FW):", "MF") || "MF").toUpperCase();
    const rating = parseFloat(window.prompt("ציון (1–10, כולל חצאים):", "6.5") || "6.5") || 6.5;
    const id = crypto.randomUUID();
    const newP = {
      id,
      name: name.trim(),
      pos: ["GK", "DF", "MF", "FW"].includes(pos) ? pos : "MF",
      rating: Math.max(1, Math.min(10, rating)),
      active: false, // ברירת מחדל אם לא הוגדר בקובץ – לא משחק
      mustWith: [],
      avoidWith: [],
    };
    setPlayers((prev) => [...prev, newP]);
  }

  // חלוקה לקבוצות – אלגוריתם מאוזן עם העדפות
  function buildTeams() {
    const actives = players.filter((p) => p.active);
    if (actives.length === 0) {
      alert("אין שחקנים מסומנים כ'משחק?'");
      return;
    }

    const n = Math.max(2, Math.min(8, Number(numTeams) || 4));

    // מטרות לפי עמדות: כמה בערך לכל קבוצה
    const byPos = groupBy(actives, (p) => p.pos);
    const posTargets = {};
    ["GK", "DF", "MF", "FW"].forEach((pos) => {
      const count = byPos[pos]?.length || 0;
      posTargets[pos] = Math.ceil(count / n);
    });

    // יצירת קבוצות ריקות
    const buckets = new Array(n).fill(0).map((_, i) => ({
      name: `קבוצה ${i + 1}`,
      players: [],
      sum: 0,
      posCounts: { GK: 0, DF: 0, MF: 0, FW: 0 },
    }));

    // נעביר קודם את השוערים שיתפזרו
    const gks = actives.filter((p) => p.pos === "GK").sort((a, b) => b.rating - a.rating);
    gks.forEach((p, idx) => placePlayerWithHeuristics(p, buckets, posTargets, actives));

    // שאר השחקנים – לפי ציון יורד
    const rest = actives.filter((p) => p.pos !== "GK").sort((a, b) => b.rating - a.rating);
    rest.forEach((p) => placePlayerWithHeuristics(p, buckets, posTargets, actives));

    setTeams(buckets);
  }

  // עזר להצבת שחקן בקבוצה עם קנסות (איזון ציון, עמדות, העדפות)
  function placePlayerWithHeuristics(p, buckets, posTargets, allActives) {
    let bestIdx = 0;
    let bestScore = Infinity;

    const must = new Set((p.mustWith || []).filter(Boolean));
    const avoid = new Set((p.avoidWith || []).filter(Boolean));

    for (let i = 0; i < buckets.length; i++) {
      const t = buckets[i];

      // איסור קשה אם יש מי ש"לא עם" כבר בקבוצה
      const hasAvoid = t.players.some((x) => avoid.has(x.name));
      if (hasAvoid) continue; // אל תשים פה בכלל

      let cost = 0;

      // איזון ציון: העדף את הקבוצה עם סכום נמוך
      cost += t.sum * 1.0; // משקולת בסיס

      // יעד עמדות – אם אנחנו חורגים מהיעד, קנס
      const target = posTargets[p.pos] || 99;
      const nextCount = t.posCounts[p.pos] + 1;
      if (nextCount > target) cost += (nextCount - target) * 4; // קנס על חריגה

      // "חייב עם": אם בקבוצה יש לפחות אחד – בונוס; אם אין – קנס קל
      const hasMust = t.players.some((x) => must.has(x.name));
      cost += hasMust ? -3 : 3; // בונוס קטן אם מצאנו "חייב"

      // פיזור עמדות: תעדף קבוצה שחסרה בעמדה הזו
      if (t.posCounts[p.pos] === 0) cost -= 1.5;

      if (cost < bestScore) {
        bestScore = cost;
        bestIdx = i;
      }
    }

    const targetTeam = buckets[bestIdx];
    targetTeam.players.push(p);
    targetTeam.sum += Number(p.rating) || 0;
    targetTeam.posCounts[p.pos]++;
  }

  // עזרי תצוגה
  function headerArrow(col) {
    if (sort.key !== col.key) return null;
    return <span className="arrow">{sort.dir === "asc" ? "▲" : "▼"}</span>;
  }

  const totalActive = players.filter((p) => p.active).length;

  return (
    <div dir="rtl" className="page">
      <StyleTag />

      <div className="panel">
        <div className="panel-header">
          <h2>שחקנים</h2>
          <div className="actions">
            <button className="btn" onClick={addPlayer}>הוסף שחקן</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    style={{ width: c.width }}
                    className={c.sortable ? "sortable" : ""}
                    onClick={() => onHeaderClick(c.key)}
                    title={c.sortable ? "לחץ למיון" : ""}
                  >
                    <div className="th-flex">
                      <span>{c.label}</span>
                      {headerArrow(c)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="muted center">
                    טוען שחקנים…
                  </td>
                </tr>
              ) : sortedPlayers.length ? (
                sortedPlayers.map((p) => (
                  <tr key={p.id}>
                    {/* משחק? */}
                    <td className="center">
                      <input
                        type="checkbox"
                        checked={!!p.active}
                        onChange={() => toggleActive(p.id)}
                      />
                    </td>

                    {/* שם */}
                    <td>
                      <input
                        className="inp"
                        value={p.name}
                        onChange={(e) => patchPlayer(p.id, { name: e.target.value })}
                      />
                    </td>

                    {/* עמדה */}
                    <td>
                      <select
                        className="inp"
                        value={p.pos}
                        onChange={(e) => patchPlayer(p.id, { pos: e.target.value })}
                      >
                        <option>GK</option>
                        <option>DF</option>
                        <option>MF</option>
                        <option>FW</option>
                      </select>
                    </td>

                    {/* ציון */}
                    <td>
                      <input
                        className="inp"
                        type="number"
                        step={0.5}
                        min={1}
                        max={10}
                        value={p.rating}
                        onChange={(e) =>
                          patchPlayer(p.id, { rating: Number(e.target.value) })
                        }
                      />
                    </td>

                    {/* חייב עם */}
                    <td>
                      <div className="cell-tags">
                        <Chips items={p.mustWith} />
                        <button
                          className="pill"
                          onClick={() => editListField(p.id, "mustWith")}
                          title="ערוך רשימת 'חייב עם'"
                        >
                          ערוך
                        </button>
                      </div>
                    </td>

                    {/* לא עם */}
                    <td>
                      <div className="cell-tags">
                        <Chips items={p.avoidWith} />
                        <button
                          className="pill warn"
                          onClick={() => editListField(p.id, "avoidWith")}
                          title="ערוך רשימת 'לא עם'"
                        >
                          ערוך
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={COLUMNS.length} className="muted center">
                    אין שחקנים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* אזור חלוקה לקבוצות */}
      <div className="panel">
        <div className="panel-header">
          <h2>קבוצות למחזור</h2>
          <div className="actions">
            <span className="muted">מסומנים למשחק: {totalActive}</span>
            <label className="inline">
              <span>מס' קבוצות:</span>
              <select
                className="inp small"
                value={numTeams}
                onChange={(e) => setNumTeams(Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn accent" onClick={buildTeams}>עשה כוחות</button>
          </div>
        </div>

        {teams?.length ? (
          <div className="teams-grid">
            {teams.map((t) => (
              <div key={t.name} className="team-card">
                <div className="team-head">
                  <div className="team-title">{t.name}</div>
                  <div className="team-meta">
                    <span>
                      סה"כ: {t.sum.toFixed(2)} | ממוצע: {(
                        t.sum / Math.max(1, t.players.length)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="team-body">
                  {t.players.length ? (
                    <ul>
                      {t.players.map((p) => (
                        <li key={p.id}>
                          <span className="pos">{p.pos}</span>
                          <span className="nm">{p.name}</span>
                          <span className="rt">{Number(p.rating).toFixed(1)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="muted">אין שחקנים</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ padding: "8px 12px" }}>
            גרור שחקן מסומן אל קבוצה; לגרירה החוצה גרור לכאן (בקרוב). בינתיים – השתמש ב"עשה כוחות" לבניה אוטומטית.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- אחסון/טעינה ----------
async function fetchPlayersFromJson() {
  const res = await fetch(PLAYERS_JSON_URL);
  if (!res.ok) throw new Error("טעינת players.json נכשלה");
  const raw = await res.json();

  // תן ID לכל שחקן, active כברירת מחדל לפי הקובץ; ואם אין – false
  return (raw || []).map((p) => ({
    id: p.id || crypto.randomUUID(),
    name: p.name?.trim() || "",
    pos: p.pos || "MF",
    rating: Number(p.rating) || 6.5,
    active: typeof p.active === "boolean" ? p.active : false, // אם אין – לא משחק
    mustWith: Array.isArray(p.mustWith) ? p.mustWith : [],
    avoidWith: Array.isArray(p.avoidWith) ? p.avoidWith : [],
  }));
}

function loadPlayersFromLocalStorage() {
  try {
    const txt = localStorage.getItem(LS_KEYS.players);
    if (!txt) return null;
    const arr = JSON.parse(txt);
    return Array.isArray(arr) ? arr : null;
  } catch (_) {
    return null;
  }
}

function savePlayersToLocalStorage(players) {
  try {
    localStorage.setItem(LS_KEYS.players, JSON.stringify(players));
  } catch (e) {
    console.warn("לא הצלחתי לשמור ל-localStorage", e);
  }
}

// ---------- קומפוננטת CSS ב-inlined <style> ----------
function StyleTag() {
  return (
    <style>{`
:root{
  --bg:#0b1220; --card:#101a2c; --ink:#e8eefc; --muted:#9fb0cb;
  --edge:#223049; --accent:#1db954; --accent2:#2ea987; --warn:#ff5c7a;
}
*{box-sizing:border-box}
html,body,#root{height:100%}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Heebo,system-ui,-apple-system,Segoe UI,Roboto,Noto Sans Hebrew,Arial,sans-serif}
.page{max-width:1200px;margin:28px auto;padding:0 12px}

.panel{background:var(--card);border:1px solid var(--edge);border-radius:14px;margin:14px 0;box-shadow:0 2px 10px rgba(0,0,0,.25)}
.panel-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--edge)}
.panel-header h2{margin:0;font-size:20px}
.actions{display:flex;align-items:center;gap:10px}
.inline{display:inline-flex;align-items:center;gap:6px}

.btn{background:#0f2b1e;border:1px solid #174a33;color:#bff0d5;padding:8px 12px;border-radius:10px;cursor:pointer}
.btn:hover{filter:brightness(1.06)}
.btn.accent{background:#0f2a22;border-color:#2e8b72;color:#bff0d5}
.pill{background:#112333;border:1px solid #29445f;color:#d9e6ff;padding:4px 8px;border-radius:999px;cursor:pointer;font-size:12px}
.pill.warn{border-color:#704252;color:#ffd6de}

.table-wrap{max-height:440px;overflow:auto;margin:8px 12px 12px}
.tbl{width:100%;border-collapse:separate;border-spacing:0}
.tbl thead th{position:sticky;top:0;background:#173b2c;border-bottom:1px solid var(--edge);color:#d7ffe7;padding:10px;text-align:right}
.tbl thead th.sortable{cursor:pointer}
.th-flex{display:flex;align-items:center;justify-content:space-between;gap:8px}
.arrow{opacity:.8;font-size:12px}
.tbl tbody td{border-bottom:1px solid #132032;padding:8px 10px;vertical-align:middle}
.center{text-align:center}
.muted{color:var(--muted)}

.inp{width:100%;background:#0e1523;color:var(--ink);border:1px solid #28344c;border-radius:10px;padding:6px 8px}
.inp.small{width:auto}

.cell-tags{display:flex;align-items:center;gap:8px}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{background:#0e2137;border:1px solid #2b486b;color:#d9e6ff;border-radius:999px;padding:2px 8px;font-size:12px}

.teams-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:12px}
@media (max-width:1000px){.teams-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:560px){.teams-grid{grid-template-columns:1fr}}
.team-card{background:#0f1726;border:1px solid #20304a;border-radius:12px;overflow:hidden}
.team-head{display:flex;align-items:center;justify-content:space-between;background:#14253c;color:#cff; padding:8px 10px;border-bottom:1px solid #20304a}
.team-title{font-weight:700}
.team-body{padding:6px 10px}
.team-body ul{margin:0;padding:0;list-style:none}
.team-body li{display:grid;grid-template-columns:56px 1fr 56px;gap:8px;padding:6px 0;border-bottom:1px dashed #22334f}
.team-body li .pos{opacity:.85}
.team-body li .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.team-body li .rt{text-align:left}
`}</style>
  );
}

// ---------- Utilities ----------
function groupBy(arr, keyFn) {
  return arr.reduce((acc, x) => {
    const k = keyFn(x);
    (acc[k] ||= []).push(x);
    return acc;
  }, {});
}

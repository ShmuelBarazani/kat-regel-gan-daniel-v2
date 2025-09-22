// src/pages/DoForces.jsx
import React, { useEffect, useMemo, useState } from "react";
import playersDataFallback from "../../data/players.json";

/* =================== אחסון עזר =================== */
const LS_KEYS = {
  DRAFT: "teams_draft_v1",
  UI: "teams_ui_state_v1",
};

/* =================== טעינת שחקנים – תואם למסך "שחקנים" =================== */
async function tryLoadFromStore() {
  try {
    const mod = await import("../store/playerStorage.js");
    const m = mod.default || mod;
    if (m && typeof m.getState === "function") {
      const st = m.getState();
      if (st && Array.isArray(st.players) && st.players.length) return st.players;
    }
    if (typeof m.getActivePlayers === "function") {
      const arr = await m.getActivePlayers();
      if (Array.isArray(arr) && arr.length) return arr;
    }
    if (typeof m.getPlayers === "function") {
      const arr = await m.getPlayers();
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch {}
  return null;
}
function tryLoadFromLocalStorage() {
  const candidates = [];
  const read = (k) => {
    try {
      const raw = localStorage.getItem(k);
      const val = JSON.parse(raw || "null");
      return Array.isArray(val) ? val : null;
    } catch {
      return null;
    }
  };
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    const arr = read(k);
    if (arr?.length) candidates.push(arr);
  }
  if (!candidates.length) return null;
  const score = (arr) =>
    arr.filter(
      (p) =>
        p &&
        typeof p.name === "string" &&
        (typeof p.rating === "number" || !isNaN(parseFloat(p.rating)))
    ).length;
  candidates.sort((a, b) => score(b) - score(a));
  return candidates[0];
}
function loadFromDataFile() {
  return Array.isArray(playersDataFallback) ? playersDataFallback : [];
}
async function loadPlayersUnified() {
  let arr = await tryLoadFromStore();
  if (!arr || !arr.length) arr = tryLoadFromLocalStorage();
  if (!arr || !arr.length) arr = loadFromDataFile();
  return (arr || [])
    .map((p, idx) => ({
      id: p.id ?? `${p.name || "ללא שם"}-${idx}`,
      name: (p.name || "").trim(),
      pos: p.pos || "MF",
      rating: typeof p.rating === "number" ? p.rating : parseFloat(p.rating ?? 0) || 0,
      mustWith: Array.isArray(p.mustWith) ? p.mustWith : [],
      notWith: Array.isArray(p.notWith) ? p.notWith : [],
      active: p.active !== false && p.playing !== false && p.isActive !== false,
    }))
    .filter((p) => p.active);
}

/* =================== לוגיקה של כוחות =================== */
const byRatingDesc = (a, b) => (b.rating || 0) - (a.rating || 0);

function emptyTeams(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `קבוצה ${i + 1}`,
    players: [],
    sum: 0,
    count: 0,
  }));
}
function sizeTargets(playersCount, teamsCount) {
  const base = Math.floor(playersCount / teamsCount);
  const extra = playersCount % teamsCount;
  return Array.from({ length: teamsCount }, (_, i) => base + (i < extra ? 1 : 0));
}
function teamStats(team) {
  const sum = team.players.reduce((s, p) => s + (p.rating || 0), 0);
  const count = team.players.length;
  const avg = count ? Math.round((sum / count) * 10) / 10 : 0;
  return { sum, avg, count };
}
function violatesNotWith(teamPlayers, clusterNames) {
  const names = new Set(teamPlayers.map((p) => p.name));
  for (const n of clusterNames.notWith) {
    if (names.has(n)) return true;
  }
  return false;
}
function buildClusters(players) {
  // מאגד "חייב־עם" לקלסטרים (איחוד רכיבים)
  const nameToIdx = new Map(players.map((p, i) => [p.name, i]));
  const parent = players.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a, b) => {
    const ra = find(a),
      rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  players.forEach((p, i) => {
    (p.mustWith || []).forEach((mw) => {
      if (nameToIdx.has(mw)) union(i, nameToIdx.get(mw));
    });
  });
  const groups = new Map();
  players.forEach((p, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(p);
  });
  // הפקת קלסטרים עם רייטינג וסכימות no-with מאוחדות
  const clusters = [];
  for (const arr of groups.values()) {
    const members = arr.slice().sort(byRatingDesc);
    const ratingSum = members.reduce((s, m) => s + (m.rating || 0), 0);
    const notWith = Array.from(new Set(members.flatMap((m) => m.notWith || [])));
    clusters.push({
      members,
      ratingSum,
      size: members.length,
      notWith,
    });
  }
  // נסדר לפי "חזקים קודם" כדי לאזן טוב יותר
  clusters.sort((a, b) => b.ratingSum - a.ratingSum || b.size - a.size);
  return clusters;
}

function buildBalancedTeams(players, teamsCount) {
  const targets = sizeTargets(players.length, teamsCount);
  const teams = emptyTeams(teamsCount);
  const clusters = buildClusters(players);

  // גרידי: משבצים כל קלסטר לקבוצה עם סכום נמוך ביותר שיש בה מקום (לפי יעד גודל)
  for (const cl of clusters) {
    // נסה לפי סכום נמוך → גבוה
    const order = teams
      .map((t, i) => ({ i, t }))
      .sort((a, b) => a.t.sum - b.t.sum || a.t.count - b.t.count);

    let placed = false;
    for (const o of order) {
      const target = targets[o.i];
      const willCount = o.t.count + cl.size;
      if (willCount > target) continue;
      if (violatesNotWith(o.t.players, cl)) continue;

      o.t.players.push(...cl.members);
      o.t.sum += cl.ratingSum;
      o.t.count += cl.size;
      placed = true;
      break;
    }

    // אם לא הצלחנו לשבץ (נניח קונפליקטים) – נכניס לקבוצה עם הסכום הנמוך ביותר שיש לה הכי הרבה מקום.
    if (!placed) {
      const fallback = teams
        .map((t, i) => ({ i, t, free: targets[i] - t.count }))
        .filter((x) => x.free > 0)
        .sort((a, b) => a.t.sum - b.t.sum || b.free - a.free)[0];
      if (fallback) {
        fallback.t.players.push(...cl.members);
        fallback.t.sum += cl.ratingSum;
        fallback.t.count += cl.size;
      } else {
        // אם אין מקום לפי היעד — הכנס לקבוצה בעלת הסכום הנמוך ביותר (יעבור יעד אך ישמור איזון ממוצע)
        const any = teams.sort((a, b) => a.sum - b.sum)[0];
        any.players.push(...cl.members);
        any.sum += cl.ratingSum;
        any.count += cl.size;
      }
    }
  }

  // מיין שחקנים בכל קבוצה לפי ציון יורד
  teams.forEach((t) => (t.players = t.players.slice().sort(byRatingDesc)));
  // החזר מבנה קליל
  return teams.map((t, i) => ({
    id: `team-${i + 1}`,
    name: `קבוצה ${i + 1}`,
    players: t.players,
  }));
}

/* =================== קומפוננטה =================== */
export default function DoForces() {
  const [players, setPlayers] = useState([]);
  const [teamsCount, setTeamsCount] = useState(4);
  const [teams, setTeams] = useState(emptyTeams(4).map((t) => ({ ...t, players: [] })));
  const [hideRatingsInCards, setHideRatingsInCards] = useState(false);

  // תצוגת הערות: מציגים רק אם המשתמש גרר ושבר אילוצים.
  const [userDraggedOnce, setUserDraggedOnce] = useState(false);

  // טעינה ראשונית
  useEffect(() => {
    (async () => {
      const ui =
        JSON.parse(localStorage.getItem(LS_KEYS.UI) || "null") || {
          hideRatingsInCards: false,
          teamsCount: 4,
        };
      setHideRatingsInCards(!!ui.hideRatingsInCards);
      setTeamsCount(ui.teamsCount || 4);

      const actives = await loadPlayersUnified();
      setPlayers(actives);

      const draft = JSON.parse(localStorage.getItem(LS_KEYS.DRAFT) || "null");
      if (draft?.teamsCount && Array.isArray(draft.teams)) {
        // מיון לפי ציון גם לטעינה קיימת
        draft.teams.forEach((t) => (t.players = (t.players || []).slice().sort(byRatingDesc)));
        setTeams(draft.teams);
        setTeamsCount(draft.teamsCount);
      } else {
        setTeams(emptyTeams(ui.teamsCount || 4).map((t) => ({ ...t, players: [] })));
      }
    })();
    const onStorage = () => loadPlayersUnified().then(setPlayers);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // יעדי גודל (לצרכי אינדיקציה בלבד; גרירה יכולה לעקוף)
  const activeCount = players.length;
  const targets = useMemo(() => sizeTargets(activeCount, teamsCount), [activeCount, teamsCount]);

  // חישוב הערות רק אם המשתמש גרר (כדי שלא יוצג מיד אחרי יצירה)
  const mustWithAlerts = useMemo(() => {
    if (!userDraggedOnce) return [];
    const warnings = new Set();
    const nameToTeam = new Map();
    teams.forEach((t, ti) => t.players.forEach((p) => nameToTeam.set(p.name, ti)));
    teams.forEach((t) =>
      t.players.forEach((p) =>
        (p.mustWith || []).forEach((m) => {
          const t1 = nameToTeam.get(p.name);
          const t2 = nameToTeam.get(m);
          if (t2 !== undefined && t1 !== t2) warnings.add(`${p.name} חייב לשחק עם ${m} (כעת מופרדים)`);
        })
      )
    );
    // הערת "לא־עם" אם יש
    teams.forEach((t) => {
      const names = new Set(t.players.map((x) => x.name));
      t.players.forEach((p) =>
        (p.notWith || []).forEach((nw) => {
          if (names.has(nw)) warnings.add(`${p.name} מסומן "לא־עם" ${nw} (כעת יחד)`);
        })
      );
    });
    return [...warnings];
  }, [teams, userDraggedOnce]);

  /* פעולות עיקריות */
  function onMakeTeams() {
    const fresh = buildBalancedTeams(players, teamsCount); // איזון ממוצעים + גודל ±1 + התחשבות באילוצים
    setTeams(fresh);
    setUserDraggedOnce(false); // יצירה מחדש – אין הערות
  }
  function onSaveDraft() {
    localStorage.setItem(
      LS_KEYS.DRAFT,
      JSON.stringify({ savedAt: new Date().toISOString(), teamsCount, teams })
    );
    alert("הטיוטה נשמרה (localStorage).");
  }
  function onClear() {
    setTeams(emptyTeams(teamsCount).map((t) => ({ ...t, players: [] })));
    setUserDraggedOnce(false);
  }
  function onToggleHide() {
    const next = !hideRatingsInCards;
    setHideRatingsInCards(next);
    localStorage.setItem(LS_KEYS.UI, JSON.stringify({ hideRatingsInCards: next, teamsCount }));
  }
  function onChangeTeamsCount(n) {
    const num = Math.max(2, Math.min(8, Number(n) || 4));
    setTeamsCount(num);
    localStorage.setItem(LS_KEYS.UI, JSON.stringify({ hideRatingsInCards, teamsCount: num }));
    setTeams(emptyTeams(num).map((t) => ({ ...t, players: [] })));
    setUserDraggedOnce(false);
  }

  /* Drag & Drop – גרירה גוברת על אילוצים: אין חסימות; רק מציגים הערות */
  const [drag, setDrag] = useState(null);
  function dragFromTable(p) {
    setDrag({ from: "table", player: p });
  }
  function dragFromTeam(ti, pi) {
    setDrag({ from: "team", teamIdx: ti, pIdx: pi, player: teams[ti].players[pi] });
  }
  function endDrag() {
    setDrag(null);
  }
  function overTeam(e) {
    e.preventDefault();
  }
  function dropTeam(e, ti) {
    e.preventDefault();
    if (!drag) return;
    const next = teams.map((x) => ({ ...x, players: [...x.players] }));
    if (drag.from === "team") next[drag.teamIdx].players.splice(drag.pIdx, 1);
    next[ti].players.push(drag.player);
    // מיין לפי ציון יורד
    next[ti].players.sort(byRatingDesc);
    setTeams(next);
    setUserDraggedOnce(true); // מעכשיו מותר להראות הערות
    endDrag();
  }
  function overTable(e) {
    e.preventDefault();
  }
  function dropTable(e) {
    e.preventDefault();
    if (!drag || drag.from !== "team") return;
    const next = teams.map((x) => ({ ...x, players: [...x.players] }));
    next[drag.teamIdx].players.splice(drag.pIdx, 1);
    setTeams(next);
    setUserDraggedOnce(true);
    endDrag();
  }
  function removeFromTeam(ti, pi) {
    const next = teams.map((x) => ({ ...x, players: [...x.players] }));
    next[ti].players.splice(pi, 1);
    setTeams(next);
    setUserDraggedOnce(true);
  }

  return (
    <div className="page" style={{ padding: "16px 12px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>מס׳ קבוצות</span>
            <select
              value={teamsCount}
              onChange={(e) => onChangeTeamsCount(e.target.value)}
              className="pill"
              style={{ padding: "6px 10px", borderRadius: 999 }}
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" onClick={onMakeTeams}>עשה כוחות</button>
          <button className="btn ghost" onClick={onClear}>איפוס</button>
          <button className="btn" onClick={onSaveDraft}>שמור מחזור (טיוטה)</button>
          <label className="pill" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999 }}>
            <input type="checkbox" checked={hideRatingsInCards} onChange={onToggleHide} />
            <span>הסתר ציונים (בכרטיסים בלבד)</span>
          </label>
        </div>
      </header>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 8px 0", opacity: 0.9 }}>קבוצות למחזור</h2>

        {userDraggedOnce && mustWithAlerts.length > 0 && (
          <div className="warn" style={{ margin: "6px 0 10px", padding: "8px 12px", borderRadius: 8 }}>
            {mustWithAlerts.map((w, i) => (
              <div key={i}>⚠️ {w}</div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
          {teams.map((t, ti) => {
            const stats = teamStats(t);
            return (
              <div
                key={t.id}
                className="card team-card"
                onDragOver={overTeam}
                onDrop={(e) => dropTeam(e, ti)}
                style={{ border: "1px solid var(--edge,#24324a)", background: "var(--card,#0f1a2e)", borderRadius: 14, padding: 12, minHeight: 160 }}
              >
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 600 }}>{t.name}</div>
                  {/* הוסר מונה שחקנים; נשאר ממוצע וסכ״כ */}
                  <div style={{ fontSize: 12, opacity: 0.85 }}>ממוצע {stats.avg} | סכ״כ {stats.sum.toFixed(1)}</div>
                </div>

                <ul style={{ listStyle: "disc", paddingInlineStart: 20, margin: 0 }}>
                  {t.players.map((p, pi) => (
                    <li
                      key={p.id}
                      draggable
                      onDragStart={() => dragFromTeam(ti, pi)}
                      onDragEnd={endDrag}
                      title="גרור כדי להחזיר לטבלה או לקבוצה אחרת"
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px", borderRadius: 8, margin: "4px 0", background: "rgba(255,255,255,.03)" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ opacity: 0.9 }}>{p.name}</span>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>({p.pos})</span>
                        {!hideRatingsInCards && <span style={{ fontSize: 12, opacity: 0.9 }}>ציון {p.rating}</span>}
                      </div>
                      <button className="btn tiny ghost" onClick={() => removeFromTeam(ti, pi)}>הסר</button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 style={{ margin: "0 0 8px 0", opacity: 0.9 }}>רשימת השחקנים</h2>
          <small style={{ opacity: 0.8 }}>גרור שחקן מהטבלה לכרטיס קבוצה, או חזרה לכאן להסרה.</small>
        </div>

        <div onDragOver={overTable} onDrop={dropTable} style={{ overflow: "auto", maxHeight: 420, border: "1px solid var(--edge,#24324a)", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--card,#0f1a2e)", zIndex: 1 }}>
              <tr>
                <th style={th}>משחק?</th>
                <th style={th}>שם</th>
                <th style={th}>עמדה</th>
                <th style={th}>ציון</th>
                <th style={th}>חייב־עם</th>
                <th style={th}>לא־עם</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  {/* הצגה לפי "פעיל?" ולא לפי "נמצא בקבוצה" */}
                  <td style={tdCenter}><input type="checkbox" checked={!!p.active} readOnly /></td>
                  <td
                    style={{ ...td, cursor: "grab", userSelect: "none" }}
                    draggable
                    onDragStart={() => dragFromTable(p)}
                    onDragEnd={endDrag}
                    title="גרור לקבוצה"
                  >
                    {p.name}
                  </td>
                  <td style={td}>{p.pos}</td>
                  <td style={td}>{p.rating}</td>
                  <td style={tdSmall}>{p.mustWith?.length ? p.mustWith.join(", ") : "—"}</td>
                  <td style={tdSmall}>{p.notWith?.length ? p.notWith.join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* אינדיקציה רכה בלבד ליעדי גודל (לא מגביל גרירה) */}
        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
          יעדי גודל לקבוצות: {targets.join(" / ")} (גרירה יכולה לחרוג; יצירה מחדש מאזנת)
        </div>
      </section>
    </div>
  );
}

const th = { textAlign: "right", padding: "10px 12px", borderBottom: "1px solid var(--edge,#24324a)", whiteSpace: "nowrap" };
const td = { textAlign: "right", padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.06)" };
const tdSmall = { ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const tdCenter = { ...td, textAlign: "center" };

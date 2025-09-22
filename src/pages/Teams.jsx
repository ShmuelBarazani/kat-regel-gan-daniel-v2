// src/pages/Teams.jsx
import React, { useEffect, useMemo, useState } from "react";
import playersDataFallback from "../../data/players.json";

/* ============== Storage Keys ============== */
const LS = {
  DRAFT: "teams_draft_v1",
  UI: "teams_ui_state_v1",
  ROUNDS: "rounds_store_v1",
};

/* ============== Players Loader ============== */
async function tryLoadFromStore() {
  try {
    const mod = await import("../store/playerStorage.js");
    const m = mod.default || mod;
    if (m?.getState) {
      const st = m.getState();
      if (st && Array.isArray(st.players) && st.players.length) return st.players;
    }
    if (typeof m.getActivePlayers === "function") {
      const arr = await m.getActivePlayers();
      if (arr?.length) return arr;
    }
    if (typeof m.getPlayers === "function") {
      const arr = await m.getPlayers();
      if (arr?.length) return arr;
    }
  } catch {}
  return null;
}
function tryLoadFromLocalStorage() {
  const arrs = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    try {
      const val = JSON.parse(localStorage.getItem(k) || "null");
      if (Array.isArray(val)) arrs.push(val);
    } catch {}
  }
  if (!arrs.length) return null;
  const score = (arr) =>
    arr.filter(
      (p) =>
        p &&
        typeof p.name === "string" &&
        (typeof p.rating === "number" || !isNaN(parseFloat(p.rating)))
    ).length;
  arrs.sort((a, b) => score(b) - score(a));
  return arrs[0];
}
function loadFromDataFile() {
  return Array.isArray(playersDataFallback) ? playersDataFallback : [];
}
async function loadPlayersUnified() {
  let arr = await tryLoadFromStore();
  if (!arr?.length) arr = tryLoadFromLocalStorage();
  if (!arr?.length) arr = loadFromDataFile();
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

/* ============== Helpers ============== */
const byRatingDesc = (a, b) => (b.rating || 0) - (a.rating || 0);
const sumRating = (ps) => ps.reduce((s, p) => s + (p.rating || 0), 0);
const avg = (ps) => (ps.length ? sumRating(ps) / ps.length : 0);
const rnd = () => Math.random() - 0.5;

function emptyTeams(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `קבוצה ${i + 1}`,
    players: [],
  }));
}
function sizeTargets(playersCount, teamsCount) {
  const base = Math.floor(playersCount / teamsCount);
  const extra = playersCount % teamsCount;
  return Array.from({ length: teamsCount }, (_, i) => base + (i < extra ? 1 : 0));
}

/* ============== Clusters (must-with) ============== */
function buildClusters(players) {
  const map = new Map(players.map((p, i) => [p.name, i]));
  const parent = players.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  players.forEach((p, i) =>
    (p.mustWith || []).forEach((m) => map.has(m) && union(i, map.get(m)))
  );

  const groups = new Map();
  players.forEach((p, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(p);
  });

  const clusters = [];
  for (const g of groups.values()) {
    const members = g.slice().sort(byRatingDesc);
    clusters.push({
      members,
      names: new Set(members.map((m) => m.name)),
      notWith: Array.from(new Set(members.flatMap((m) => m.notWith || []))),
      size: members.length,
      ratingSum: sumRating(members),
    });
  }
  clusters.sort((a, b) => b.ratingSum - a.ratingSum || b.size - a.size || rnd());
  return clusters;
}
const violatesNotWith = (teamPlayers, cl) => {
  if (!cl.notWith?.length) return false;
  const names = new Set(teamPlayers.map((p) => p.name));
  return cl.notWith.some((x) => names.has(x));
};

/* ============== Balancer ============== */
// חלוקה ראשונית לפי יעדי גודל ולפי סכום נמוך
function initialAssign(players, teamsCount) {
  const targets = sizeTargets(players.length, teamsCount);
  const teams = emptyTeams(teamsCount);
  const clusters = buildClusters(players);

  for (const cl of clusters) {
    const order = teams
      .map((t, i) => ({ i, t }))
      .sort(
        (a, b) =>
          sumRating(a.t.players) - sumRating(b.t.players) ||
          a.t.players.length - b.t.players.length ||
          rnd()
      );
    let placed = false;
    for (const o of order) {
      const will = o.t.players.length + cl.size;
      if (will > targets[o.i]) continue;
      if (violatesNotWith(o.t.players, cl)) continue;
      o.t.players.push(...cl.members);
      placed = true;
      break;
    }
    if (!placed) {
      const fb = teams
        .map((t, i) => ({ i, t, free: targets[i] - t.players.length }))
        .filter((x) => x.free > 0)
        .sort(
          (a, b) =>
            sumRating(a.t.players) - sumRating(b.t.players) ||
            b.free - a.free ||
            rnd()
        )[0];
      (fb ? fb.t : teams.sort((a, b) => sumRating(a.players) - sumRating(b.players) || rnd())[0]).players.push(
        ...cl.members
      );
    }
  }
  teams.forEach((t) => t.players.sort(byRatingDesc));
  return { teams, targets };
}

// בניית "חבילות" בתוך קבוצה (כדי לא לשבור חייב־עם באיזון)
function teamBundles(team) {
  const res = [];
  const used = new Set();
  for (const p of team.players) {
    if (used.has(p)) continue;
    const g = team.players.filter(
      (q) => q === p || q.mustWith?.includes(p.name) || p.mustWith?.includes(q.name)
    );
    g.forEach((x) => used.add(x));
    res.push({
      members: g,
      size: g.length,
      ratingSum: sumRating(g),
      names: new Set(g.map((m) => m.name)),
      notWith: Array.from(new Set(g.flatMap((m) => m.notWith || []))),
    });
  }
  if (!res.length) team.players.forEach((p) =>
    res.push({ members: [p], size: 1, ratingSum: p.rating || 0, names: new Set([p.name]), notWith: p.notWith || [] })
  );
  return res;
}

// איזון קשיח של גדלים (הפרש ≤ 1) — מעביר "חבילות" שנכנסות, ומקטין פערי ממוצעים
function strictSizeRebalance(teams, targets) {
  const count = (t) => t.players.length;
  const mean = () => {
    const a = teams.map((t) => avg(t.players));
    return a.reduce((s, v) => s + v, 0) / a.length;
  };
  let guard = 300;

  while (guard-- > 0) {
    const maxIdx = teams.reduce((iBest, t, i) => (count(t) > count(teams[iBest]) ? i : iBest), 0);
    const minIdx = teams.reduce((iBest, t, i) => (count(t) < count(teams[iBest]) ? i : iBest), 0);
    if (count(teams[maxIdx]) - count(teams[minIdx]) <= 1) break;

    const from = teams[maxIdx];
    const to = teams[minIdx];
    const bundles = teamBundles(from).sort((a, b) => a.size - b.size || a.ratingSum - b.ratingSum);

    let moved = false;
    for (const bundle of bundles) {
      // חייב שהחבילה תיכנס בגודל (יעד המינימום של to הוא targets[minIdx], מותר ±1)
      const toAfter = to.players.length + bundle.size;
      if (toAfter > targets[minIdx] + 1) continue;

      // לא־עם ביעד
      if (violatesNotWith(to.players, bundle)) continue;

      // הערכת שיפור בממוצעים
      const beforeScore =
        Math.abs(avg(from.players) - mean()) + Math.abs(avg(to.players) - mean());
      const fromNew = from.players.filter((p) => !bundle.names.has(p.name));
      const toNew = [...to.players, ...bundle.members];
      const afterScore =
        Math.abs(avg(fromNew) - mean()) + Math.abs(avg(toNew) - mean());

      // מבצעים מעבר לחבילה "הכי טובה" שמקטינה סטייה (או הראשונה שנכנסת אם אין שיפור)
      if (afterScore <= beforeScore || bundles[bundles.length - 1] === bundle) {
        from.players = fromNew;
        to.players = toNew.sort(byRatingDesc);
        moved = true;
        break;
      }
    }
    if (!moved) break; // תקוע — יוצאים
  }
  return teams;
}

// ליטוש סטיות ממוצעים בהחלפות נקודתיות (ללא שינוי גדלים)
function varianceTighten(teams, rounds = 2) {
  const copy = (xs) => xs.map((t) => ({ ...t, players: t.players.slice() }));
  const score = (ts) => {
    const a = ts.map((t) => avg(t.players));
    const m = a.reduce((s, v) => s + v, 0) / a.length;
    const maxDev = Math.max(...a.map((v) => Math.abs(v - m)));
    const varDev = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
    return { maxDev, varDev };
  };
  let best = copy(teams);
  let bestS = score(best);

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < best.length; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const A = best[i], B = best[j];
        for (const a of A.players) {
          for (const b of B.players) {
            // לא לשבור "חייב־עם" — אם יש לו בן/בת־זוג בקבוצה שלו, לא מזיזים לבד
            const inA = new Set(A.players.map((p) => p.name));
            const inB = new Set(B.players.map((p) => p.name));
            if (a.mustWith?.some((m) => inA.has(m))) continue;
            if (b.mustWith?.some((m) => inB.has(m))) continue;
            // כיבוד "לא־עם" אחרי ההחלפה
            const aInBconf = B.players.some((q) => q.id !== b.id && (a.notWith?.includes(q.name) || q.notWith?.includes(a.name)));
            const bInAconf = A.players.some((q) => q.id !== a.id && (b.notWith?.includes(q.name) || q.notWith?.includes(b.name)));
            if (aInBconf || bInAconf) continue;

            const next = copy(best);
            next[i].players = [...A.players.filter((p) => p.id !== a.id), b].sort(byRatingDesc);
            next[j].players = [...B.players.filter((p) => p.id !== b.id), a].sort(byRatingDesc);
            const s = score(next);
            if (
              s.maxDev < bestS.maxDev - 1e-6 ||
              (Math.abs(s.maxDev - bestS.maxDev) < 1e-6 && s.varDev < bestS.varDev - 1e-6)
            ) {
              best = next; bestS = s;
            }
          }
        }
      }
    }
  }
  return best;
}

function buildBalancedTeams(players, teamsCount) {
  const { teams, targets } = initialAssign(players, teamsCount);
  strictSizeRebalance(teams, targets);          // הבטחת ±1
  const tightened = varianceTighten(teams, 2);  // ליטוש ממוצעים
  tightened.forEach((t) => t.players.sort(byRatingDesc));
  return tightened.map((t, i) => ({ id: `team-${i + 1}`, name: `קבוצה ${i + 1}`, players: t.players }));
}

/* ============== Rounds store (Admin) ============== */
function saveRoundToStore({ teams, teamsCount, playersCount }) {
  const entry = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    teamsCount,
    playersCount,
    teams,
    status: "draft",
    // שים לב: במסך מנהל ננהל games מרובים לכל קבוצה
    results: teams.map(() => ({ games: [] })), 
  };
  let store = [];
  try { store = JSON.parse(localStorage.getItem(LS.ROUNDS) || "[]"); } catch {}
  store.unshift(entry);
  localStorage.setItem(LS.ROUNDS, JSON.stringify(store));
  return entry.id;
}

/* ============== Teams Page ============== */
export default function TeamsPage() {
  const [players, setPlayers] = useState([]);
  const [teamsCount, setTeamsCount] = useState(4);
  const [teams, setTeams] = useState(emptyTeams(4));
  const [hideRatingsInCards, setHideRatingsInCards] = useState(false);
  const [userDraggedOnce, setUserDraggedOnce] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    (async () => {
      const ui = JSON.parse(localStorage.getItem(LS.UI) || "null") || {
        hideRatingsInCards: false,
        teamsCount: 4,
      };
      setHideRatingsInCards(!!ui.hideRatingsInCards);
      setTeamsCount(ui.teamsCount || 4);

      const actives = await loadPlayersUnified();
      setPlayers(actives);

      const draft = JSON.parse(localStorage.getItem(LS.DRAFT) || "null");
      if (draft?.teamsCount && Array.isArray(draft.teams)) {
        draft.teams.forEach((t) => (t.players = (t.players || []).slice().sort(byRatingDesc)));
        setTeams(draft.teams);
        setTeamsCount(draft.teamsCount);
      } else {
        setTeams(emptyTeams(ui.teamsCount || 4));
      }
    })();
    const onStorage = () => loadPlayersUnified().then(setPlayers);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const activeCount = players.length;
  const targets = useMemo(() => sizeTargets(activeCount, teamsCount), [activeCount, teamsCount]);

  // הערות מוצגות רק אחרי גרירה
  const warnings = useMemo(() => {
    if (!userDraggedOnce) return [];
    const alerts = new Set();
    const nameToTeam = new Map();
    teams.forEach((t, ti) => t.players.forEach((p) => nameToTeam.set(p.name, ti)));
    teams.forEach((t) => {
      const names = new Set(t.players.map((x) => x.name));
      t.players.forEach((p) => {
        (p.mustWith || []).forEach((m) => {
          const t1 = nameToTeam.get(p.name);
          const t2 = nameToTeam.get(m);
          if (t2 !== undefined && t1 !== t2) alerts.add(`${p.name} חייב לשחק עם ${m} (כעת מופרדים)`);
        });
        (p.notWith || []).forEach((nw) => { if (names.has(nw)) alerts.add(`${p.name} מסומן "לא־עם" ${nw} (כעת יחד)`); });
      });
    });
    return [...alerts];
  }, [teams, userDraggedOnce]);

  function makeTeams() {
    const fresh = buildBalancedTeams(players, teamsCount);
    setTeams(fresh);
    setUserDraggedOnce(false);
    localStorage.setItem(LS.DRAFT, JSON.stringify({ savedAt: new Date().toISOString(), teamsCount, teams: fresh }));
  }
  function saveRound() {
    localStorage.setItem(LS.DRAFT, JSON.stringify({ savedAt: new Date().toISOString(), teamsCount, teams }));
    saveRoundToStore({ teams, teamsCount, playersCount: players.length });
    alert("המחזור נשמר. עבור למסך 'מנהל' → 'פתח מחזור' כדי לעדכן תוצאות וכובשים (כולל כמה משחקים לכל קבוצה).");
  }
  function onToggleHide() {
    const next = !hideRatingsInCards;
    setHideRatingsInCards(next);
    localStorage.setItem(LS.UI, JSON.stringify({ hideRatingsInCards: next, teamsCount }));
  }
  function onChangeTeamsCount(n) {
    const num = Math.max(2, Math.min(8, Number(n) || 4));
    setTeamsCount(num);
    localStorage.setItem(LS.UI, JSON.stringify({ hideRatingsInCards, teamsCount: num }));
    const blank = emptyTeams(num);
    setTeams(blank);
    setUserDraggedOnce(false);
    localStorage.setItem(LS.DRAFT, JSON.stringify({ savedAt: new Date().toISOString(), teamsCount: num, teams: blank }));
  }

  // DnD – גרירה גוברת על אילוצים
  const [drag, setDrag] = useState(null);
  function dragFromTable(p) { setDrag({ from: "table", player: p }); }
  function dragFromTeam(ti, pi) { setDrag({ from: "team", teamIdx: ti, pIdx: pi, player: teams[ti].players[pi] }); }
  function endDrag() { setDrag(null); }
  function dropTeam(e, ti) {
    e.preventDefault();
    if (!drag) return;
    const next = teams.map((x) => ({ ...x, players: [...x.players] }));
    if (drag.from === "team") next[drag.teamIdx].players.splice(drag.pIdx, 1);
    next[ti].players.push(drag.player);
    next[ti].players.sort(byRatingDesc);
    setTeams(next);
    setUserDraggedOnce(true);
    endDrag();
    localStorage.setItem(LS.DRAFT, JSON.stringify({ savedAt: new Date().toISOString(), teamsCount, teams: next }));
  }
  function dropTable(e) {
    e.preventDefault();
    if (!drag || drag.from !== "team") return;
    const next = teams.map((x) => ({ ...x, players: [...x.players] }));
    next[drag.teamIdx].players.splice(drag.pIdx, 1);
    setTeams(next);
    setUserDraggedOnce(true);
    endDrag();
    localStorage.setItem(LS.DRAFT, JSON.stringify({ savedAt: new Date().toISOString(), teamsCount, teams: next }));
  }

  /* ====== PRINT PREVIEW ====== */
  function PrintModal({ teams, onClose }) {
    const dateStr = new Date().toISOString().slice(0, 10);
    return (
      <div className="print-backdrop">
        <div className="print-modal">
          <div className="print-modal-header">
            <button className="btn" onClick={() => window.print()}>הדפס</button>
            <button className="btn ghost" onClick={onClose}>סגור</button>
            <button className="btn" onClick={() => window.print()} style={{ marginInlineStart: "auto" }}>יצוא PDF</button>
          </div>

          {/* זה העץ היחיד שיודפס */}
          <div className="print-root">
            <div className="print-grid">
              {teams.slice(0, 4).map((t) => (
                <section key={t.id} className="pcard">
                  <header className="pcard-head">
                    <div className="pcard-title">{t.name}</div>
                    <div className="pcard-date">{dateStr}</div>
                  </header>

                  <table className="ptable">
                    <thead>
                      <tr>
                        <th className="col-name">שחקן</th>
                        <th className="col-goals">שערים</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.players.map((p, idx) => (
                        <tr key={idx}>
                          <td className="cell-name">{p.name}</td>
                          <td className="cell-goals">
                            {Array.from({ length: 12 }).map((_, i) => (
                              <span key={i} className="gbox" />
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="results-stack">
                    <div className="rline">
                      <span>ניצחון</span>
                      <div className="gline">
                        {Array.from({ length: 12 }).map((_, i) => <span key={i} className="gbox" />)}
                      </div>
                    </div>
                    <div className="rline">
                      <span>תיקו</span>
                      <div className="gline">
                        {Array.from({ length: 12 }).map((_, i) => <span key={i} className="gbox" />)}
                      </div>
                    </div>
                    <div className="rline">
                      <span>הפסד</span>
                      <div className="gline">
                        {Array.from({ length: 12 }).map((_, i) => <span key={i} className="gbox" />)}
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>

          <style>{`
            .print-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:1000}
            .print-modal{background:var(--card,#0f1a2e);border:1px solid var(--edge,#24324a);border-radius:12px;width:min(1120px,96vw);max-height:92vh;display:flex;flex-direction:column}
            .print-modal-header{padding:10px;border-bottom:1px solid var(--edge,#24324a);display:flex;gap:8;align-items:center;background:var(--card,#0f1a2e)}
            .print-root{padding:10px}
            .print-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
            .pcard{background:var(--card,#0f1a2e);border:2px solid var(--edge,#24324a);border-radius:10px;color:var(--fg,#e8eefc);padding:8px}
            .pcard-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
            .pcard-title{font-weight:700}
            .pcard-date{opacity:.8}
            .ptable{width:100%;border-collapse:separate;border-spacing:0}
            .ptable th,.ptable td{border:1.5px solid var(--edge,#24324a);padding:5px 6px}
            .col-name{width:52%}
            .cell-name{text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            .cell-goals{display:grid;grid-template-columns:repeat(12,14px);gap:5px;justify-content:end}
            .gbox{display:inline-block;width:12px;height:12px;border:1.6px solid var(--edge,#24324a);border-radius:2px;background:transparent}
            .results-stack{display:flex;flex-direction:column;gap:4px;margin-top:6px}
            .rline{display:grid;grid-template-columns:64px 1fr;align-items:center;gap:6px}
            .gline{display:grid;grid-template-columns:repeat(12,14px);gap:5px}
            @media print{
              body{background:#fff !important}
              *{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .print-backdrop{position:static;background:none}
              .print-modal{border:none;width:auto;max-height:none}
              .print-modal-header{display:none}
              .print-root{padding:0}
              .print-grid{gap:10px;grid-template-columns:1fr 1fr}
              .pcard{page-break-inside:avoid;break-inside:avoid}
              body > *:not(.print-backdrop):not(.print-root) { display:none !important }
              .page, .tabs, header, nav, footer { display:none !important }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: "16px 12px" }}>
      <header className="keep-print" style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap" }}>
        <h2 style={{margin:0}}>קבוצות</h2>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <label style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span>מס׳ קבוצות</span>
            <select
              value={teamsCount}
              onChange={(e) => onChangeTeamsCount(e.target.value)}
              className="pill"
              style={{ padding: "6px 10px", borderRadius: 999 }}
            >
              {[2,3,4,5,6,7,8].map((n)=><option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button className="btn" onClick={makeTeams}>עשה כוחות</button>
          <button className="btn" onClick={() => setShowPrint(true)}>PRINT PREVIEW</button>
          <button className="btn" onClick={saveRound}>שמור מחזור</button>
          <label className="pill" style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:999 }}>
            <input type="checkbox" checked={hideRatingsInCards} onChange={onToggleHide}/>
            <span>הסתר ציונים (בכרטיסים בלבד)</span>
          </label>
        </div>
      </header>

      {userDraggedOnce && warnings.length > 0 && (
        <div className="warn" style={{ margin: "10px 0", padding: "8px 12px", borderRadius: 8 }}>
          {warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
        </div>
      )}

      <section style={{ marginTop: 8 }}>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12 }}>
          {teams.map((t, ti) => {
            const a = Math.round(avg(t.players) * 10) / 10;
            const s = sumRating(t.players).toFixed(1);
            return (
              <div
                key={t.id}
                className="card"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => dropTeam(e, ti)}
                style={{ border:"1px solid var(--edge,#24324a)",background:"var(--card,#0f1a2e)",borderRadius:14,padding:12,minHeight:160 }}
              >
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6 }}>
                  <div style={{ fontWeight:600 }}>{t.name}</div>
                  <div style={{ fontSize:12, opacity:.85 }}>ממוצע {a} | סכ״כ {s}</div>
                </div>
                <ul style={{ listStyle:"disc", paddingInlineStart:20, margin:0 }}>
                  {t.players.map((p, pi) => (
                    <li
                      key={p.id}
                      draggable
                      onDragStart={() => dragFromTeam(ti, pi)}
                      onDragEnd={endDrag}
                      title="גרור לקבוצה אחרת או חזרה לטבלה"
                      style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,margin:"4px 0",background:"rgba(255,255,255,.03)" }}
                    >
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <span>{p.name}</span>
                        <span style={{ fontSize:12, opacity:.7 }}>({p.pos})</span>
                        {!hideRatingsInCards && <span style={{ fontSize:12 }}>ציון {p.rating}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ marginTop: 22 }}>
        <div style={{ display:"flex",alignItems:"baseline",justifyContent:"space-between" }}>
          <h3 style={{ margin:"0 0 8px 0", opacity:.9 }}>רשימת השחקנים</h3>
          <small style={{ opacity:.8 }}>גרור שחקן מהטבלה לכרטיס קבוצה, או חזרה לכאן להסרה.</small>
        </div>

        <div onDragOver={(e) => e.preventDefault()} onDrop={dropTable}
             style={{ overflow:"auto", maxHeight:420, border:"1px solid var(--edge,#24324a)", borderRadius:12 }}>
          <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
            <thead style={{ position:"sticky", top:0, background:"var(--card,#0f1a2e)", zIndex:1 }}>
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
                  <td style={tdCenter}><input type="checkbox" checked={!!p.active} readOnly /></td>
                  <td style={{ ...td, cursor:"grab", userSelect:"none" }} draggable onDragStart={() => dragFromTable(p)} onDragEnd={endDrag}>{p.name}</td>
                  <td style={td}>{p.pos}</td>
                  <td style={td}>{p.rating}</td>
                  <td style={tdSmall}>{p.mustWith?.length ? p.mustWith.join(", ") : "—"}</td>
                  <td style={tdSmall}>{p.notWith?.length ? p.notWith.join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 8, opacity:.7, fontSize:12 }}>
          יעדי גודל לקבוצות: {targets.join(" / ")} (החלוקה מבטיחה הפרש גודל של לכל היותר שחקן אחד).
        </div>
      </section>

      {showPrint && <PrintModal teams={teams} onClose={() => setShowPrint(false)} />}
    </div>
  );
}

const th = { textAlign:"right", padding:"10px 12px", borderBottom:"1px solid var(--edge,#24324a)", whiteSpace:"nowrap" };
const td = { textAlign:"right", padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,.06)" };
const tdSmall = { ...td, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" };
const tdCenter = { ...td, textAlign:"center" };

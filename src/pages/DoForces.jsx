// src/pages/DoForces.jsx
import React, { useEffect, useMemo, useState } from "react";
import playersDataFallback from "../../data/players.json";

/* =================== מפתחות אחסון =================== */
const LS_KEYS = {
  DRAFT: "teams_draft_v1",     // מצב קבוצות אחרון (התמדה במסך)
  UI: "teams_ui_state_v1",
  ROUNDS: "rounds_store_v1",   // מחזורים למסך מנהל
};

/* ========= טעינת שחקנים – כמו במסך “שחקנים” ========= */
async function tryLoadFromStore() {
  try {
    const mod = await import("../store/playerStorage.js");
    const m = mod.default || mod;
    if (m?.getState) {
      const st = m.getState();
      if (st && Array.isArray(st.players) && st.players.length) return st.players;
    }
    if (typeof m.getActivePlayers === "function") {
      const arr = await m.getActivePlayers(); if (arr?.length) return arr;
    }
    if (typeof m.getPlayers === "function") {
      const arr = await m.getPlayers(); if (arr?.length) return arr;
    }
  } catch {}
  return null;
}
function tryLoadFromLocalStorage() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    try {
      const val = JSON.parse(localStorage.getItem(k) || "null");
      if (Array.isArray(val)) out.push(val);
    } catch {}
  }
  if (!out.length) return null;
  const score = (arr) =>
    arr.filter((p) => p && typeof p.name === "string" &&
      (typeof p.rating === "number" || !isNaN(parseFloat(p.rating)))).length;
  out.sort((a, b) => score(b) - score(a));
  return out[0];
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

/* =================== לוגיקת איזון =================== */
const byRatingDesc = (a, b) => (b.rating || 0) - (a.rating || 0);
const rndTie = () => Math.random() - 0.5;

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
function sumRating(players) {
  return players.reduce((s, p) => s + (p.rating || 0), 0);
}
function avg(players) {
  return players.length ? sumRating(players) / players.length : 0;
}

// מאגד “חייב־עם” לקלסטרים (Union-Find)
function buildClusters(players) {
  const nameIdx = new Map(players.map((p, i) => [p.name, i]));
  const parent = players.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const unite = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  players.forEach((p, i) => (p.mustWith || []).forEach((mw) => nameIdx.has(mw) && unite(i, nameIdx.get(mw))));
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
      size: members.length,
      ratingSum: sumRating(members),
      notWith: Array.from(new Set(members.flatMap((m) => m.notWith || []))),
      names: new Set(members.map((m) => m.name)),
    });
  }
  // חזקים קודם + שובר שוויון רנדומי כדי שכל לחיצה יוצרת חלוקה קצת אחרת
  clusters.sort((a, b) => (b.ratingSum - a.ratingSum) || (b.size - a.size) || rndTie());
  return clusters;
}

function violatesNotWith(teamPlayers, cluster) {
  if (!cluster.notWith?.length) return false;
  const names = new Set(teamPlayers.map((p) => p.name));
  return cluster.notWith.some((nw) => names.has(nw));
}

// שיבוץ ראשוני לפי סכום נמוך ויעד גודל
function initialAssign(players, teamsCount) {
  const targets = sizeTargets(players.length, teamsCount);
  const teams = emptyTeams(teamsCount);
  const clusters = buildClusters(players);

  for (const cl of clusters) {
    const order = teams
      .map((t, i) => ({ i, t }))
      .sort((a, b) => (sumRating(a.t.players) - sumRating(b.t.players)) || (a.t.players.length - b.t.players.length) || rndTie());

    let placed = false;
    for (const o of order) {
      const target = targets[o.i];
      if (o.t.players.length + cl.size > target) continue;
      if (violatesNotWith(o.t.players, cl)) continue;
      o.t.players.push(...cl.members);
      placed = true; break;
    }
    if (!placed) {
      // fallback: הקבוצה עם הסכום הנמוך ביותר ובעלת הכי הרבה מקום
      const fb = teams
        .map((t, i) => ({ i, t, free: targets[i] - t.players.length }))
        .filter((x) => x.free > 0)
        .sort((a, b) => (sumRating(a.t.players) - sumRating(b.t.players)) || (b.free - a.free) || rndTie())[0];
      (fb ? fb.t : teams.sort((a, b) => sumRating(a.players) - sumRating(b.players) || rndTie())[0]).players.push(...cl.members);
    }
  }
  teams.forEach((t) => t.players.sort(byRatingDesc));
  return { teams, targets };
}

// איזון חוזר: נעביר קלסטרים בין קבוצות כדי לצמצם סטיית ממוצעים, תוך שמירה על יעדי גודל ואילוצי not-with
function rebalance(teams, targets, maxIters = 300) {
  const score = () => {
    const avgs = teams.map((t) => avg(t.players));
    const mean = avgs.reduce((s, x) => s + x, 0) / avgs.length;
    return Math.sqrt(avgs.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / avgs.length);
  };

  // נכין קלסטרים מתוך הצבה נוכחית (כיבוד must-with)
  const clustersByTeam = teams.map((t) => {
    const items = [];
    const taken = new Set();
    t.players.forEach((p, i) => {
      if (taken.has(p)) return;
      const group = t.players.filter((q) => q.mustWith?.includes(p.name) || p.mustWith?.includes(q.name) || q === p);
      group.forEach((g) => taken.add(g));
      items.push({
        members: group,
        size: group.length,
        ratingSum: sumRating(group),
        notWith: Array.from(new Set(group.flatMap((m) => m.notWith || []))),
        names: new Set(group.map((m) => m.name)),
      });
    });
    // אם לא זוהו קלסטרים – כל אחד לעצמו
    if (!items.length) t.players.forEach((p) => items.push({ members: [p], size: 1, ratingSum: p.rating || 0, notWith: p.notWith || [], names: new Set([p.name]) }));
    return items;
  });

  let best = score();
  for (let iter = 0; iter < maxIters; iter++) {
    // מצא קבוצה "חזקה" (ממוצע גבוה) וחלשה (נמוך)
    let hi = 0, lo = 0;
    const avgs = teams.map((t) => avg(t.players));
    avgs.forEach((v, i) => { if (v > avgs[hi]) hi = i; if (v < avgs[lo]) lo = i; });

    if (hi === lo) break; // כולן שוות

    // נסה להעביר קלסטר קטן מהחזקה לחלשה
    const from = hi, to = lo;
    const fromClusters = clustersByTeam[from];
    fromClusters.sort((a, b) => a.ratingSum - b.ratingSum || a.size - b.size); // הכי קטן קודם
    let improved = false;
    for (const cl of fromClusters) {
      // כבוד ליעדי גודל
      if (teams[to].players.length + cl.size > targets[to]) continue;
      if (teams[from].players.length - cl.size < targets[from] - 1) continue; // שמירה על ±1
      if (violatesNotWith(teams[to].players, cl)) continue;

      // בצע מהלך
      teams[from].players = teams[from].players.filter((p) => !cl.names.has(p.name));
      teams[to].players = [...teams[to].players, ...cl.members];
      teams[from].players.sort(byRatingDesc);
      teams[to].players.sort(byRatingDesc);

      const s = score();
      if (s + 1e-6 < best) { best = s; improved = true; break; }
      // לא השתפר? בטל
      teams[to].players = teams[to].players.filter((p) => !cl.names.has(p.name));
      teams[from].players = [...teams[from].players, ...cl.members].sort(byRatingDesc);
    }
    if (!improved) break;
  }
  return teams;
}

function buildBalancedTeams(players, teamsCount) {
  const { teams, targets } = initialAssign(players, teamsCount);
  rebalance(teams, targets, 300);
  return teams.map((t, i) => ({ id: `team-${i + 1}`, name: `קבוצה ${i + 1}`, players: t.players.slice().sort(byRatingDesc) }));
}

/* =================== עזר למסך מנהל =================== */
function upsertRoundInStore({ teams, teamsCount, playersCount }) {
  const entry = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    teamsCount,
    playersCount,
    teams,
    status: "draft",
  };
  let store = [];
  try { store = JSON.parse(localStorage.getItem(LS_KEYS.ROUNDS) || "[]"); } catch {}
  store.unshift(entry);
  localStorage.setItem(LS_KEYS.ROUNDS, JSON.stringify(store));
  return entry.id;
}

/* =================== קומפוננטת המסך =================== */
export default function DoForces() {
  const [players, setPlayers] = useState([]);
  const [teamsCount, setTeamsCount] = useState(4);
  const [teams, setTeams] = useState(emptyTeams(4));
  const [hideRatingsInCards, setHideRatingsInCards] = useState(false);
  const [userDraggedOnce, setUserDraggedOnce] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    (async () => {
      const ui = JSON.parse(localStorage.getItem(LS_KEYS.UI) || "null") || { hideRatingsInCards:false, teamsCount:4 };
      setHideRatingsInCards(!!ui.hideRatingsInCards);
      setTeamsCount(ui.teamsCount || 4);

      const actives = await loadPlayersUnified();
      setPlayers(actives);

      const draft = JSON.parse(localStorage.getItem(LS_KEYS.DRAFT) || "null");
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

  // הערות "חייב/לא־עם" – רק אחרי גרירה
  const mustWithAlerts = useMemo(() => {
    if (!userDraggedOnce) return [];
    const warnings = new Set();
    const nameToTeam = new Map();
    teams.forEach((t, ti) => t.players.forEach((p) => nameToTeam.set(p.name, ti)));
    teams.forEach((t) => {
      const names = new Set(t.players.map((x) => x.name));
      t.players.forEach((p) => {
        (p.mustWith || []).forEach((m) => {
          const t1 = nameToTeam.get(p.name);
          const t2 = nameToTeam.get(m);
          if (t2 !== undefined && t1 !== t2) warnings.add(`${p.name} חייב לשחק עם ${m} (כעת מופרדים)`);
        });
        (p.notWith || []).forEach((nw) => {
          if (names.has(nw)) warnings.add(`${p.name} מסומן "לא־עם" ${nw} (כעת יחד)`);
        });
      });
    });
    return [...warnings];
  }, [teams, userDraggedOnce]);

  /* פעולות */
  function onMakeTeams() {
    const fresh = buildBalancedTeams(players, teamsCount);
    setTeams(fresh);
    setUserDraggedOnce(false);
    localStorage.setItem(LS_KEYS.DRAFT, JSON.stringify({ savedAt:new Date().toISOString(), teamsCount, teams:fresh }));
  }
  function onSaveDraft() {
    const payload = { savedAt: new Date().toISOString(), teamsCount, teams };
    localStorage.setItem(LS_KEYS.DRAFT, JSON.stringify(payload));
    upsertRoundInStore({ teams, teamsCount, playersCount: players.length });
    alert("המחזור נשמר. רענן/פתח את מסך המנהל – הוא יופיע שם.");
  }
  function onClear() {
    const blank = emptyTeams(teamsCount);
    setTeams(blank);
    setUserDraggedOnce(false);
    localStorage.setItem(LS_KEYS.DRAFT, JSON.stringify({ savedAt:new Date().toISOString(), teamsCount, teams:blank }));
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
    const blank = emptyTeams(num);
    setTeams(blank);
    setUserDraggedOnce(false);
    localStorage.setItem(LS_KEYS.DRAFT, JSON.stringify({ savedAt:new Date().toISOString(), teamsCount:num, teams:blank }));
  }

  /* Drag & Drop – גרירה גוברת על אילוצים */
  const [drag, setDrag] = useState(null);
  function dragFromTable(p){ setDrag({ from:"table", player:p }); }
  function dragFromTeam(ti,pi){ setDrag({ from:"team", teamIdx:ti, pIdx:pi, player:teams[ti].players[pi] }); }
  function endDrag(){ setDrag(null); }
  function overTeam(e){ e.preventDefault(); }
  function dropTeam(e,ti){
    e.preventDefault(); if(!drag) return;
    const next = teams.map(x=>({ ...x, players:[...x.players] }));
    if(drag.from==="team") next[drag.teamIdx].players.splice(drag.pIdx,1);
    next[ti].players.push(drag.player);
    next[ti].players.sort(byRatingDesc);
    setTeams(next); setUserDraggedOnce(true); endDrag();
    localStorage.setItem(LS_KEYS.DRAFT, JSON.stringify({ savedAt:new Date().toISOString(), teamsCount, teams:next }));
  }
  function overTable(e){ e.preventDefault(); }
  function dropTable(e){
    e.preventDefault(); if(!drag || drag.from!=="team") return;
    const next = teams.map(x=>({ ...x, players:[...x.players] }));
    next[drag.teamIdx].players.splice(drag.pIdx,1);
    setTeams(next); setUserDraggedOnce(true); endDrag();
    localStorage.setItem(LS_KEYS.DRAFT, JSON.stringify({ savedAt:new Date().toISOString(), teamsCount, teams:next }));
  }
  function removeFromTeam(ti,pi){
    const next = teams.map(x=>({ ...x, players:[...x.players] })); next[ti].players.splice(pi,1);
    setTeams(next); setUserDraggedOnce(true);
    localStorage.setItem(LS_KEYS.DRAFT, JSON.stringify({ savedAt:new Date().toISOString(), teamsCount, teams:next }));
  }

  /* ========= PRINT PREVIEW ========= */
  function PrintModal({ teams, onClose }) {
    const dateStr = new Date().toISOString().slice(0,10);
    return (
      <div className="print-backdrop">
        <div className="print-modal">
          <div className="print-modal-header">
            <button className="btn" onClick={()=>window.print()}>הדפס</button>
            <button className="btn ghost" onClick={onClose}>סגור</button>
            <button className="btn" onClick={()=>window.print()} style={{ marginInlineStart:"auto" }}>יצוא PDF</button>
          </div>

          <div className="print-grid">
            {teams.map((t)=>(
              <section key={t.id} className="pcard">
                <header className="pcard-head">
                  <div>{dateStr} תאריך</div>
                  <div className="pcard-title">{t.name}</div>
                </header>

                <table className="ptable">
                  <thead>
                    <tr>
                      <th className="col-name">שחקן</th>
                      <th className="col-goals">שערים</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.players.map((p,idx)=>(
                      <tr key={idx}>
                        <td className="cell-name">{p.name}</td>
                        <td className="cell-goals">{Array.from({length:12}).map((_,i)=><span key={i} className="gbox"/>)}</td>
                      </tr>
                    ))}
                    {Array.from({length: Math.max(0, 12 - t.players.length)}).map((_,ri)=>(
                      <tr key={`empty-${ri}`}>
                        <td className="cell-name">&nbsp;</td>
                        <td className="cell-goals">{Array.from({length:12}).map((_,i)=><span key={i} className="gbox"/>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="results-stack">
                  <div className="rline"><span>ניצחון</span><div className="gline">{Array.from({length:12}).map((_,i)=><span key={i} className="gbox"/>)}</div></div>
                  <div className="rline"><span>תיקו</span><div className="gline">{Array.from({length:12}).map((_,i)=><span key={i} className="gbox"/>)}</div></div>
                  <div className="rline"><span>הפסד</span><div className="gline">{Array.from({length:12}).map((_,i)=><span key={i} className="gbox"/>)}</div></div>
                </div>
              </section>
            ))}
          </div>

          <style>{`
            .print-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:1000}
            .print-modal{background:#0b1220;border:1px solid #24324a;border-radius:12px;width:min(1120px,96vw);max-height:92vh;display:flex;flex-direction:column}
            .print-modal-header{padding:10px;border-bottom:1px solid #24324a;display:flex;gap:8;align-items:center;background:#0f1a2e}
            .print-grid{padding:10px;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:1fr;gap:10px;overflow:auto}
            .pcard{background:#fff;color:#000;border:2px solid #000;border-radius:6px;padding:6px;display:flex;flex-direction:column}
            .pcard-head{display:flex;justify-content:space-between;align-items:center;font-weight:700;margin-bottom:4px}
            .pcard-title{font-weight:800}
            .ptable{width:100%;border-collapse:separate;border-spacing:0}
            .ptable th,.ptable td{border:2px solid #000;padding:3px}
            .col-name{width:52%}  /* ← צר יותר כדי שהעמוד יתיישר יפה */
            .col-goals{width:48%}
            .cell-name{text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            .cell-goals{display:grid;grid-template-columns:repeat(12,14px);gap:5px;justify-content:end}
            .gbox{display:inline-block;width:12px;height:12px;border:2px solid #000;border-radius:2px}
            .results-stack{display:flex;flex-direction:column;gap:4px;margin-top:6px}
            .rline{display:grid;grid-template-columns:56px 1fr;align-items:center;gap:6px}
            .gline{display:grid;grid-template-columns:repeat(12,14px);gap:5px}

            @media print{
              body{background:#fff !important}
              .site-header,.tabs,.page > header:not(.keep-print), .btn, .pill{ display:none !important; }
              .print-backdrop{position:static;background:none}
              .print-modal{border:none;width:auto;max-height:none}
              .print-modal-header{display:none}
              .print-grid{padding:0;gap:8px;grid-template-columns:1fr 1fr}
              .pcard{page-break-inside:avoid;break-inside:avoid}
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
            <select value={teamsCount} onChange={(e)=>onChangeTeamsCount(e.target.value)} className="pill" style={{padding:"6px 10px",borderRadius:999}}>
              {[2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button className="btn" onClick={onMakeTeams}>עשה כוחות</button>
          <button className="btn" onClick={()=>setShowPrint(true)}>PRINT PREVIEW</button>
          <button className="btn ghost" onClick={onClear}>איפוס</button>
          <button className="btn" onClick={onSaveDraft}>שמור מחזור</button>
          <label className="pill" style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:999 }}>
            <input type="checkbox" checked={hideRatingsInCards} onChange={onToggleHide}/>
            <span>הסתר ציונים (בכרטיסים בלבד)</span>
          </label>
        </div>
      </header>

      {userDraggedOnce && mustWithAlerts.length>0 && (
        <div className="warn" style={{ margin:"10px 0", padding:"8px 12px", borderRadius:8 }}>
          {mustWithAlerts.map((w,i)=><div key={i}>⚠️ {w}</div>)}
        </div>
      )}

      <section style={{ marginTop: 8 }}>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12 }}>
          {teams.map((t,ti)=>{
            const a = avg(t.players); const s = sumRating(t.players);
            return (
              <div key={t.id} className="card" onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>dropTeam(e,ti)}
                   style={{ border:"1px solid var(--edge,#24324a)",background:"var(--card,#0f1a2e)",borderRadius:14,padding:12,minHeight:160 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6 }}>
                  <div style={{ fontWeight:600 }}>{t.name}</div>
                  <div style={{ fontSize:12, opacity:.85 }}>ממוצע {Math.round(a*10)/10} | סכ״כ {s.toFixed(1)}</div>
                </div>
                <ul style={{ listStyle:"disc", paddingInlineStart:20, margin:0 }}>
                  {t.players.map((p,pi)=>(
                    <li key={p.id} draggable onDragStart={()=>dragFromTeam(ti,pi)} onDragEnd={endDrag}
                        style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:8, padding:"6px 8px", borderRadius:8, margin:"4px 0",
                                 background:"rgba(255,255,255,.03)" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <span>{p.name}</span>
                        <span style={{ fontSize:12, opacity:.7 }}>({p.pos})</span>
                        {!hideRatingsInCards && <span style={{ fontSize:12 }}>ציון {p.rating}</span>}
                      </div>
                      <button className="btn tiny ghost" onClick={()=>removeFromTeam(ti,pi)}>הסר</button>
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
        <div onDragOver={overTable} onDrop={dropTable}
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
              {players.map((p)=>(
                <tr key={p.id}>
                  <td style={tdCenter}><input type="checkbox" checked={!!p.active} readOnly /></td>
                  <td style={{ ...td, cursor:"grab", userSelect:"none" }} draggable onDragStart={()=>dragFromTable(p)} onDragEnd={endDrag}>{p.name}</td>
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
          יעדי גודל לקבוצות: {targets.join(" / ")} (גרירה יכולה לחרוג; יצירה מחדש מאזנת).
        </div>
      </section>

      {showPrint && <PrintModal teams={teams} onClose={()=>setShowPrint(false)} />}
    </div>
  );
}

const th = { textAlign:"right", padding:"10px 12px", borderBottom:"1px solid var(--edge,#24324a)", whiteSpace:"nowrap" };
const td = { textAlign:"right", padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,.06)" };
const tdSmall = { ...td, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" };
const tdCenter = { ...td, textAlign:"center" };

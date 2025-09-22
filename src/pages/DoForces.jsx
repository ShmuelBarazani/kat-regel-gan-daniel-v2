// src/pages/DoForces.jsx
import React, { useEffect, useMemo, useState } from "react";
import playersDataFallback from "../../data/players.json";

/* =================== אחסון עזר =================== */
const LS_KEYS = {
  DRAFT: "teams_draft_v1",          // מצב הקבוצות האחרון
  UI: "teams_ui_state_v1",
  ROUNDS: "rounds_store_v1",        // "מסך מנהל" – מחזורים שמורים
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
      const arr = await m.getActivePlayers(); if (Array.isArray(arr) && arr.length) return arr;
    }
    if (typeof m.getPlayers === "function") {
      const arr = await m.getPlayers(); if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch {}
  return null;
}
function tryLoadFromLocalStorage() {
  const candidates = [];
  const read = (k) => {
    try { const val = JSON.parse(localStorage.getItem(k) || "null"); return Array.isArray(val) ? val : null; }
    catch { return null; }
  };
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    const arr = read(k);
    if (arr?.length) candidates.push(arr);
  }
  if (!candidates.length) return null;
  const score = (arr) =>
    arr.filter((p) => p && typeof p.name === "string" && (typeof p.rating === "number" || !isNaN(parseFloat(p.rating)))).length;
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
const rnd = (n=1)=>Math.random()-0.5;   // שובר שוויון אקראי

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
function buildClusters(players) {
  // מאגד "חייב־עם" לקלסטרים (Union-Find)
  const byName = new Map(players.map((p, i) => [p.name, i]));
  const parent = players.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[rb] = ra; };
  players.forEach((p, i) => (p.mustWith || []).forEach((mw) => byName.has(mw) && union(i, byName.get(mw))));
  const groups = new Map();
  players.forEach((p, i) => { const r = find(i); (groups.get(r) || groups.set(r, []).get(r)).push(p); });

  const clusters = [];
  for (const arr of groups.values()) {
    const members = arr.slice().sort(byRatingDesc);
    const ratingSum = members.reduce((s, m) => s + (m.rating || 0), 0);
    const notWith = Array.from(new Set(members.flatMap((m) => m.notWith || [])));
    clusters.push({ members, ratingSum, size: members.length, notWith });
  }
  // חזקים קודם + שובר שוויון רנדומי כדי שכל לחיצה תיצור חלוקה שונה
  clusters.sort((a, b) => (b.ratingSum - a.ratingSum) || (b.size - a.size) || rnd());
  return clusters;
}
function buildBalancedTeams(players, teamsCount) {
  const targets = sizeTargets(players.length, teamsCount);
  const teams = emptyTeams(teamsCount);
  const clusters = buildClusters(players);

  for (const cl of clusters) {
    const order = teams
      .map((t, i) => ({ i, t }))
      .sort((a, b) => (a.t.sum - b.t.sum) || (a.t.count - b.t.count) || rnd());
    let placed = false;
    for (const o of order) {
      const target = targets[o.i];
      if (o.t.count + cl.size > target) continue;
      // "לא־עם": התרעה תוצג לאחר גרירה בלבד; כאן מנסים להימנע מראש
      const names = new Set(o.t.players.map((p) => p.name));
      if (cl.notWith.some((nw) => names.has(nw))) continue;

      o.t.players.push(...cl.members);
      o.t.sum += cl.ratingSum;
      o.t.count += cl.size;
      placed = true;
      break;
    }
    if (!placed) {
      const fb = teams
        .map((t, i) => ({ i, t, free: targets[i] - t.count }))
        .filter((x) => x.free > 0)
        .sort((a, b) => (a.t.sum - b.t.sum) || (b.free - a.free) || rnd())[0];
      (fb ? fb.t : teams.sort((a,b)=>a.sum-b.sum||rnd())[0]).players.push(...cl.members);
    }
  }
  teams.forEach((t) => (t.players = t.players.slice().sort(byRatingDesc)));
  return teams.map((t, i) => ({ id: `team-${i + 1}`, name: `קבוצה ${i + 1}`, players: t.players }));
}

/* =================== עזר למנהל/מחזורים =================== */
function upsertRoundInStore({ teams, teamsCount, playersCount }) {
  const now = new Date().toISOString();
  let store = [];
  try { store = JSON.parse(localStorage.getItem(LS_KEYS.ROUNDS) || "[]"); } catch {}
  const entry = { id: now, createdAt: now, teamsCount, playersCount, teams, status: "draft" };
  store.unshift(entry);
  localStorage.setItem(LS_KEYS.ROUNDS, JSON.stringify(store));
}

/* =================== קומפוננטת המסך =================== */
export default function DoForces() {
  const [players, setPlayers] = useState([]);
  const [teamsCount, setTeamsCount] = useState(4);
  const [teams, setTeams] = useState(emptyTeams(4).map((t) => ({ ...t, players: [] })));
  const [hideRatingsInCards, setHideRatingsInCards] = useState(false);

  // הערות מוצגות רק אחרי גרירה (גרירה גוברת על אילוצים)
  const [userDraggedOnce, setUserDraggedOnce] = useState(false);

  // PRINT PREVIEW
  const [showPrint, setShowPrint] = useState(false);

  // טעינה ראשונית + התמדה
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
        setTeams(emptyTeams(ui.teamsCount || 4).map((t) => ({ ...t, players: [] })));
      }
    })();

    const onStorage = () => loadPlayersUnified().then(setPlayers);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // יעד גודל אינדיקטיבי (±1)
  const activeCount = players.length;
  const targets = useMemo(() => sizeTargets(activeCount, teamsCount), [activeCount, teamsCount]);

  // הערות "חייב־עם / לא־עם" – לאחר גרירה בלבד
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
    teams.forEach((t) => {
      const names = new Set(t.players.map((x) => x.name));
      t.players.forEach((p) => (p.notWith || []).forEach((nw) => names.has(nw) && warnings.add(`${p.name} מסומן "לא־עם" ${nw} (כעת יחד)`)));
    });
    return [...warnings];
  }, [teams, userDraggedOnce]);

  /* פעולות עיקריות */
  function onMakeTeams() {
    const fresh = buildBalancedTeams(players, teamsCount); // איזון ממוצעים + גודל ±1 + אילוצים, עם אקראיות
    setTeams(fresh);
    setUserDraggedOnce(false);
    // שומר מצב נוכחי להתמדה
    localStorage.setItem(LS_KEYS.DRAFT, JSON.stringify({ savedAt:new Date().toISOString(), teamsCount, teams:fresh }));
  }
  function onSaveDraft() {
    const payload = { savedAt: new Date().toISOString(), teamsCount, teams };
    localStorage.setItem(LS_KEYS.DRAFT, JSON.stringify(payload));
    // הוספה/עדכון למחזורי מנהל
    upsertRoundInStore({ teams, teamsCount, playersCount: players.length });
    alert("המחזור נשמר מקומית.");
  }
  function onClear() {
    const blank = emptyTeams(teamsCount).map((t) => ({ ...t, players: [] }));
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
    const blank = emptyTeams(num).map((t) => ({ ...t, players: [] }));
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
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button className="btn" onClick={()=>window.print()}>הדפס</button>
              <button className="btn ghost" onClick={onClose}>סגור</button>
            </div>
            <div style={{marginInlineStart:"auto"}}>
              <button className="btn" onClick={()=>window.print()}>יצוא PDF</button>
            </div>
          </div>

          <div className="print-root">
            {teams.map((t, idx)=>(
              <section key={t.id} className="print-card">
                <header className="print-card-head">
                  <div>{dateStr} תאריך</div>
                  <div className="print-team-title">{t.name}</div>
                </header>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th style={{width:"75%"}}>שחקן</th>
                      <th style={{width:"25%"}}>שערים</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.players.map((p,pi)=>(
                      <tr key={pi}>
                        <td className="print-name">{p.name}</td>
                        <td className="print-goals">
                          {Array.from({length:10}).map((_,i)=><span key={i} className="gbox"/>)}
                        </td>
                      </tr>
                    ))}
                    {/* שורות ריקות להשלמה */}
                    {Array.from({length: Math.max(0, 10 - t.players.length)}).map((_,ri)=>(
                      <tr key={`empty-${ri}`}>
                        <td className="print-name">&nbsp;</td>
                        <td className="print-goals">{Array.from({length:10}).map((_,i)=><span key={i} className="gbox"/>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="print-footer-metrics">
                  <div className="metric">
                    <div>ניצחון</div>
                    <div className="gline">{Array.from({length:10}).map((_,i)=><span key={i} className="gbox"/>)}</div>
                  </div>
                  <div className="metric">
                    <div>תיקו</div>
                    <div className="gline">{Array.from({length:10}).map((_,i)=><span key={i} className="gbox"/>)}</div>
                  </div>
                  <div className="metric">
                    <div>הפסד</div>
                    <div className="gline">{Array.from({length:10}).map((_,i)=><span key={i} className="gbox"/>)}</div>
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* סגנונות הדפסה – נשלפים מהקוד הישן ומותאמים */}
          <style>{`
            .print-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:1000}
            .print-modal{background:#0b1220;border:1px solid #24324a;border-radius:12px;width:min(1100px,96vw);max-height:92vh;display:flex;flex-direction:column}
            .print-modal-header{padding:12px;border-bottom:1px solid #24324a;display:flex;align-items:center;gap:8;background:#0f1a2e;position:sticky;top:0;z-index:2}
            .print-root{padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px;overflow:auto}
            .print-card{background:white;color:black;border:2px solid #333;border-radius:6px;padding:8px;page-break-inside:avoid}
            .print-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-weight:600}
            .print-team-title{font-weight:700}
            .print-table{width:100%;border-collapse:separate;border-spacing:0}
            .print-table th,.print-table td{border:2px solid #333;padding:4px}
            .print-name{text-align:right}
            .print-goals{display:grid;grid-template-columns:repeat(10, 16px);gap:6px;justify-content:end}
            .gbox{display:inline-block;width:14px;height:14px;border:2px solid #333;border-radius:3px}
            .print-footer-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
            .metric{display:grid;grid-template-columns:60px 1fr;align-items:center;gap:6px}
            .gline{display:grid;grid-template-columns:repeat(10, 16px);gap:6px;justify-content:start}

            @media print{
              body{background:white !important}
              .site-header, .tabs, nav, header.page-header, .btn, .pill, .warn, .page > header, .page > section:not(:has(.print-root)){ display:none !important; }
              .print-backdrop{position:static;background:none}
              .print-modal{border:none;width:auto;max-height:none}
              .print-modal-header{display:none}
              .print-root{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0}
              .print-card{break-inside:avoid-page;page-break-inside:avoid}
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: "16px 12px" }}>
      {/* כותרת + פעולות */}
      <header style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap" }}>
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
          <button className="btn" onClick={onSaveDraft}>שמור מחזור</button> {/* ← בלי "טיוטה" */}
          <label className="pill" style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:999 }}>
            <input type="checkbox" checked={hideRatingsInCards} onChange={onToggleHide}/>
            <span>הסתר ציונים (בכרטיסים בלבד)</span>
          </label>
        </div>
      </header>

      {/* הערות – רק אחרי גרירה */}
      {userDraggedOnce && mustWithAlerts.length>0 && (
        <div className="warn" style={{ margin:"10px 0", padding:"8px 12px", borderRadius:8 }}>
          {mustWithAlerts.map((w,i)=><div key={i}>⚠️ {w}</div>)}
        </div>
      )}

      {/* כרטיסי קבוצות */}
      <section style={{ marginTop: 8 }}>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12 }}>
          {teams.map((t,ti)=>{
            const stats = teamStats(t);
            return (
              <div key={t.id} className="card" onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>dropTeam(e,ti)}
                   style={{ border:"1px solid var(--edge,#24324a)",background:"var(--card,#0f1a2e)",borderRadius:14,padding:12,minHeight:160 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6 }}>
                  <div style={{ fontWeight:600 }}>{t.name}</div>
                  <div style={{ fontSize:12, opacity:.85 }}>ממוצע {stats.avg} | סכ״כ {stats.sum.toFixed(1)}</div>
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

      {/* טבלת שחקנים */}
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

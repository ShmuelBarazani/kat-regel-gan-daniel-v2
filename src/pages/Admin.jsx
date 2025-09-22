// src/pages/Admin.jsx
import React, { useEffect, useState } from "react";

const ROUNDS_KEY = "rounds_store_v1";

// עוזר: מיגרציה מתצורה ישנה (results[ti] היה אובייקט יחיד) לתצורה חדשה (מערך games)
function migrateResults(results, teams) {
  const safe = Array.isArray(results) ? results.slice() : [];
  while (safe.length < teams.length) safe.push({ games: [] });

  return safe.map((r) => {
    // ישן: { outcome: 'win'|'draw'|'loss'|'NA', goals: {playerId:num} }
    if (r && !Array.isArray(r.games)) {
      return { games: [ { outcome: r.outcome || "NA", goals: r.goals || {} } ] };
    }
    // חדש כבר
    return { games: (r?.games || []).map(g => ({ outcome: g.outcome || "NA", goals: g.goals || {} })) };
  });
}

export default function Admin() {
  const [rounds, setRounds] = useState([]);
  const [checked, setChecked] = useState(new Set());
  const [editing, setEditing] = useState(null); // round object when open

  const load = () => {
    try {
      const arr = JSON.parse(localStorage.getItem(ROUNDS_KEY) || "[]");
      setRounds(Array.isArray(arr) ? arr : []);
    } catch { setRounds([]); }
  };
  useEffect(() => { load(); }, []);

  const toggleCheck = (id) => {
    const next = new Set(checked);
    next.has(id) ? next.delete(id) : next.add(id);
    setChecked(next);
  };
  const removeSelected = () => {
    const left = rounds.filter((r) => !checked.has(r.id));
    localStorage.setItem(ROUNDS_KEY, JSON.stringify(left));
    setRounds(left);
    setChecked(new Set());
  };

  const openRound = (r) => {
    const copy = JSON.parse(JSON.stringify(r));
    copy.results = migrateResults(copy.results, copy.teams);
    setEditing(copy);
  };

  const saveEditedRound = () => {
    const list = JSON.parse(localStorage.getItem(ROUNDS_KEY) || "[]");
    const idx = list.findIndex((x) => x.id === editing.id);
    if (idx !== -1) list[idx] = editing;
    localStorage.setItem(ROUNDS_KEY, JSON.stringify(list));
    setEditing(null);
    load();
  };

  return (
    <div className="page" style={{ padding:"16px 12px" }}>
      <header style={{ display:"flex", alignItems:"center", gap:8 }}>
        <h2 style={{ margin:0 }}>מנהל</h2>
        <button className="btn" onClick={load}>רענן</button>
        <button className="btn ghost" onClick={removeSelected} disabled={!checked.size}>מחק נבחרים</button>
      </header>

      <section style={{ marginTop:12 }}>
        <div style={{ border:"1px solid var(--edge,#24324a)", borderRadius:12, overflow:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
            <thead style={{ position:"sticky", top:0, background:"var(--card,#0f1a2e)" }}>
              <tr>
                <th style={th}>בחר</th>
                <th style={th}>תאריך/שעה</th>
                <th style={th}>מס׳ קבוצות</th>
                <th style={th}>מס׳ שחקנים ששיחקו</th>
                <th style={th}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {rounds.length === 0 && (
                <tr><td colSpan={5} style={{ ...td, textAlign:"center" }}>אין מחזורים שמורים</td></tr>
              )}
              {rounds.map((r)=>(
                <tr key={r.id}>
                  <td style={tdCenter}>
                    <input type="checkbox" checked={checked.has(r.id)} onChange={()=>toggleCheck(r.id)} />
                  </td>
                  <td style={td}>{new Date(r.createdAt).toLocaleString('he-IL')}</td>
                  <td style={td}>{r.teamsCount}</td>
                  <td style={td}>{r.playersCount}</td>
                  <td style={td}>
                    <button className="btn tiny" onClick={()=>openRound(r)}>פתח מחזור</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <RoundEditor round={editing} onClose={()=>setEditing(null)} onSave={saveEditedRound} setRound={setEditing} />
      )}
    </div>
  );
}

function RoundEditor({ round, setRound, onClose, onSave }) {
  // results[teamIdx] = { games: [{ outcome, goals: {playerId: num} }, ...] }

  function ensureGame(teamIdx, gameIdx) {
    const next = { ...round, results: round.results.slice() };
    const teamRes = next.results[teamIdx] || { games: [] };
    while (teamRes.games.length <= gameIdx) teamRes.games.push({ outcome: "NA", goals: {} });
    next.results[teamIdx] = teamRes;
    setRound(next);
  }

  function addGame(teamIdx) {
    const next = { ...round, results: round.results.slice() };
    const t = next.results[teamIdx] || { games: [] };
    t.games = [...(t.games || []), { outcome: "NA", goals: {} }];
    next.results[teamIdx] = t;
    setRound(next);
  }
  function removeGame(teamIdx, gameIdx) {
    const next = { ...round, results: round.results.slice() };
    const t = next.results[teamIdx] || { games: [] };
    t.games = (t.games || []).filter((_, i) => i !== gameIdx);
    next.results[teamIdx] = t;
    setRound(next);
  }

  function setOutcome(teamIdx, gameIdx, val) {
    ensureGame(teamIdx, gameIdx);
    const next = { ...round, results: round.results.slice() };
    next.results[teamIdx].games[gameIdx].outcome = val;
    setRound(next);
  }
  function incGoal(teamIdx, gameIdx, playerId, delta) {
    ensureGame(teamIdx, gameIdx);
    const next = { ...round, results: round.results.slice() };
    const g = next.results[teamIdx].games[gameIdx];
    const cur = g.goals[playerId] || 0;
    g.goals[playerId] = Math.max(0, Math.min(12, cur + delta));
    setRound(next);
  }

  return (
    <div className="print-backdrop" style={{ background:"rgba(0,0,0,.6)" }}>
      <div className="print-modal" style={{ width:"min(1200px,96vw)", maxHeight:"92vh", overflow:"auto" }}>
        <div className="print-modal-header" style={{ display:"flex", gap:8, alignItems:"center", padding:10, borderBottom:"1px solid var(--edge,#24324a)", background:"var(--card,#0f1a2e)" }}>
          <strong>עורך מחזור — {new Date(round.createdAt).toLocaleString('he-IL')}</strong>
          <div style={{ marginInlineStart:"auto" }} />
          <button className="btn" onClick={onSave}>שמור</button>
          <button className="btn ghost" onClick={onClose}>סגור</button>
        </div>

        <div style={{ padding:12, display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:12 }}>
          {round.teams.map((t, ti) => {
            const teamRes = round.results?.[ti] || { games: [] };
            return (
              <div key={t.id} className="card" style={{ border:"1px solid var(--edge,#24324a)", background:"var(--card,#0f1a2e)", borderRadius:12, padding:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <strong>{t.name}</strong>
                  <button className="btn tiny" onClick={() => addGame(ti)}>הוסף משחק</button>
                </div>

                {teamRes.games.length === 0 && (
                  <div style={{ opacity:.8, marginBottom:8 }}>אין משחקים — לחץ "הוסף משחק".</div>
                )}

                {teamRes.games.map((g, gi) => (
                  <div key={gi} style={{ border:"1px dashed var(--edge,#24324a)", borderRadius:8, marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", background:"rgba(255,255,255,.03)", borderTopLeftRadius:8, borderTopRightRadius:8 }}>
                      <strong>משחק #{gi + 1}</strong>
                      <select className="pill" value={g.outcome || "NA"} onChange={(e)=>setOutcome(ti, gi, e.target.value)}>
                        <option value="NA">— תוצאה —</option>
                        <option value="win">ניצחון</option>
                        <option value="draw">תיקו</option>
                        <option value="loss">הפסד</option>
                      </select>
                      <button className="btn tiny ghost" style={{ marginInlineStart:"auto" }} onClick={()=>removeGame(ti, gi)}>מחק משחק</button>
                    </div>

                    <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
                      <thead>
                        <tr>
                          <th style={th}>שחקן</th>
                          <th style={thCenter}>שערים</th>
                          <th style={thCenter}>+</th>
                          <th style={thCenter}>−</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.players.map((p) => {
                          const goals = g.goals?.[p.id] || 0;
                          return (
                            <tr key={p.id}>
                              <td style={td}>{p.name}</td>
                              <td style={tdCenter}><strong>{goals}</strong></td>
                              <td style={tdCenter}><button className="btn tiny" onClick={()=>incGoal(ti,gi,p.id,+1)}>+</button></td>
                              <td style={tdCenter}><button className="btn tiny ghost" onClick={()=>incGoal(ti,gi,p.id,-1)}>−</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const th = { textAlign:"right", padding:"10px 12px", borderBottom:"1px solid var(--edge,#24324a)", whiteSpace:"nowrap" };
const thCenter = { ...th, textAlign:"center" };
const td = { textAlign:"right", padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,.06)" };
const tdCenter = { ...td, textAlign:"center" };

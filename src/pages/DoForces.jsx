import React, { useEffect, useMemo, useState } from "react";
import { loadPlayers } from "../store/playerStorage";

// עזר
const sum = (arr) => arr.reduce((s, x) => s + (Number(x) || 0), 0);
const byRatingDesc = (a, b) => (b.rating || 0) - (a.rating || 0);

export default function DoForces() {
  const [players, setPlayers] = useState([]);
  const [teamsCount, setTeamsCount] = useState(4);
  const [hideScoresInCards, setHideScoresInCards] = useState(false);

  // מצב שיבוץ
  const [assign, setAssign] = useState({}); // {playerId: teamIdx}
  const [teams, setTeams] = useState([]);   // [{name, ids:number[]}]
  const [drag, setDrag] = useState(null);   // {id, fromTeam}

  useEffect(() => { setPlayers(loadPlayers()); }, []);
  const active   = useMemo(() => players.filter(p => !!p.active), [players]);
  const inactive = useMemo(() => players.filter(p => !p.active), [players]);

  // יצירה – מכבד "חייב-עם", איזון ±1
  function buildTeams() {
    if (active.length === 0) { alert("אין שחקנים פעילים."); return; }
    const n = Math.max(2, Math.min(12, Number(teamsCount) || 4));

    // גרף "חייב-עם"
    const nameToId = new Map(active.map(p => [p.name, p.id]));
    const adj = new Map(active.map(p => [p.id, new Set()]));
    active.forEach(p => (p.mustWith || []).forEach(nm => {
      const j = nameToId.get(nm);
      if (j) { adj.get(p.id).add(j); adj.get(j).add(p.id); }
    }));

    // יחידות (רכיבי קישוריות)
    const visited = new Set(); const units = [];
    for (const p of active) {
      if (visited.has(p.id)) continue;
      const q = [p.id]; visited.add(p.id); const comp = [p.id];
      while (q.length) {
        const v = q.pop();
        for (const nb of adj.get(v) || []) if (!visited.has(nb)) {
          visited.add(nb); q.push(nb); comp.push(nb);
        }
      }
      units.push(comp);
    }

    // ולידציה מול גודל יעד
    const target = Math.floor(active.length / n);
    const maxAllowed = target + 1;
    if (units.some(u => u.length > maxAllowed)) {
      alert("אי אפשר ליצור כוחות חוקיים: יחידת 'חייב-עם' גדולה מדי עבור גודל קבוצה.");
      return;
    }

    const idToPlayer = new Map(active.map(p => [p.id, p]));
    const unitRating = (u) => sum(u.map(id => idToPlayer.get(id)?.rating || 0)) / u.length;
    units.sort((a, b) => unitRating(b) - unitRating(a));

    const buckets = Array.from({ length: n }, (_, i) => ({ name: `קבוצה ${i + 1}`, ids: [], sum: 0 }));
    let i = 0, fwd = true;
    for (const u of units) {
      // בחירת יעד – נחש, ואם לא נכנס אז הקבוצה הדלה ביותר שמתאימה
      let k = i;
      if (buckets[i].ids.length + u.length > maxAllowed) {
        let best = -1, bestAvg = Infinity;
        for (let t = 0; t < buckets.length; t++) {
          if (buckets[t].ids.length + u.length <= maxAllowed) {
            const avg = buckets[t].sum / Math.max(1, buckets[t].ids.length);
            if (avg < bestAvg) { best = t; bestAvg = avg; }
          }
        }
        if (best >= 0) k = best;
      }
      buckets[k].ids.push(...u);
      buckets[k].sum += sum(u.map(id => idToPlayer.get(id)?.rating || 0));
      if (fwd) { if (i === n - 1) fwd = false; else i++; }
      else { if (i === 0) fwd = true; else i--; }
    }

    const map = {}; buckets.forEach((b, idx) => b.ids.forEach(id => map[id] = idx));
    setAssign(map);
    setTeams(buckets);
  }

  // סטטוס קבוצה
  function teamStat(t) {
    const plist = t.ids.map(id => active.find(p => p.id === id)).filter(Boolean);
    const scores = plist.map(p => Number(p.rating) || 0);
    return { count: plist.length, sum: sum(scores), avg: plist.length ? sum(scores) / plist.length : 0, players: plist.sort(byRatingDesc) };
  }

  // איזון אחרי גרירה
  function isBalancedAfterMove(fromIdx, toIdx) {
    if (fromIdx === toIdx) return true;
    const sizes = teams.map(t => t.ids.length);
    if (fromIdx >= 0) sizes[fromIdx] -= 1;
    if (toIdx >= 0) sizes[toIdx] += 1;
    return Math.max(...sizes) - Math.min(...sizes) <= 1;
  }

  // DnD
  function onDragStart(e, id, fromTeam) { setDrag({ id, fromTeam }); e.dataTransfer.effectAllowed = "move"; }
  function onDragOver(e, teamIdx) { if (!drag) return; if (!isBalancedAfterMove(drag.fromTeam, teamIdx)) return; e.preventDefault(); }
  function onDrop(e, teamIdx) {
    e.preventDefault();
    if (!drag) return;
    if (!isBalancedAfterMove(drag.fromTeam, teamIdx)) { alert("אי אפשר: חייבים לשמור על הבדל גודל עד שחקן אחד."); setDrag(null); return; }
    const id = drag.id;
    const nextTeams = teams.map(t => ({ ...t, ids: [...t.ids] }));
    if (drag.fromTeam >= 0) nextTeams[drag.fromTeam].ids = nextTeams[drag.fromTeam].ids.filter(x => x !== id);
    nextTeams[teamIdx].ids.push(id);
    setAssign({ ...assign, [id]: teamIdx });
    setTeams(nextTeams);
    setDrag(null);
  }

  const assignedCount = useMemo(() => Object.values(assign).filter(v => v >= 0).length, [assign]);

  function saveDraft() {
    if (teams.length === 0) { alert("אין קבוצות לשמירה."); return; }
    const idToPlayer = new Map(players.map(p => [p.id, p]));
    const payload = {
      ts: Date.now(),
      teams: teams.map(t => ({
        name: t.name,
        players: t.ids.map(id => {
          const p = idToPlayer.get(id);
          return { id, name: p?.name, pos: p?.pos, rating: p?.rating };
        })
      })),
      totals: { active: active.length, teamsCount: teams.length }
    };
    const KEY = "katregel.roundDrafts.v1";
    const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
    arr.unshift(payload);
    localStorage.setItem(KEY, JSON.stringify(arr));
    alert("הטיוטה נשמרה. ראה 'מנהל'.");
  }

  return (
    <div dir="rtl" style={{maxWidth:1180, margin:"0 auto"}}>
      {/* סרגל עליון */}
      <div style={{display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:10}}>
        <div className="chip">פעילים: <b>{active.length}</b></div>
        <div className="chip">משובצים: <b>{assignedCount}</b></div>
        <div className="chip">לא פעילים: <b>{inactive.length}</b></div>
        <div style={{flex:1}} />
        <label style={{display:"inline-flex", alignItems:"center", gap:8}}>
          מס׳ קבוצות
          <input type="number" min="2" max="12" value={teamsCount} onChange={e=>setTeamsCount(e.target.value)} style={{width:64}} />
        </label>
        <label style={{display:"inline-flex", alignItems:"center", gap:6}}>
          הסתר ציונים (בכרטיסים בלבד)
          <input type="checkbox" checked={hideScoresInCards} onChange={e=>setHideScoresInCards(e.target.checked)} />
        </label>
        <button className="btn" onClick={buildTeams}>עשה כוחות</button>
        <button className="btn primary" onClick={saveDraft}>שמור מחזור (טיוטה)</button>
      </div>

      {/* כרטיסי קבוצות – למעלה */}
      {teams.length > 0 && (
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:12, marginBottom:12}}>
          {teams.map((t, idx) => {
            const stat = teamStat(t);
            return (
              <div key={idx}
                   onDragOver={e=>onDragOver(e, idx)}
                   onDrop={e=>onDrop(e, idx)}
                   className="card"
                   style={{minHeight:190}}>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
                  <b>{t.name}</b>
                  <span style={{color:"#9fb0cb"}}>
                    {stat.players.length} שחקנים | סכ״ר {stat.sum.toFixed(1)} | ממוצע {stat.avg.toFixed(2)}
                  </span>
                </div>
                <ul style={{listStyle:"none", padding:0, margin:0}}>
                  {stat.players.map(p=>(
                    <li key={p.id}
                        draggable
                        onDragStart={e=>onDragStart(e, p.id, assign[p.id] ?? idx)}
                        style={{display:"flex", justifyContent:"space-between", padding:"4px 0", borderTop:"1px dashed #24324a", cursor:"grab"}}>
                      <span>{p.name} ({p.pos})</span>
                      {!hideScoresInCards && <span>{p.rating}</span>}
                    </li>
                  ))}
                  {stat.players.length===0 && <li style={{opacity:.7}}>גררו לכאן שחקנים…</li>}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* טבלת שחקנים – למטה (כמו במסך שחקנים) */}
      <div className="card" style={{marginTop:12}}>
        <div style={{maxHeight:"50vh", overflow:"auto"}}>
          <table style={{width:"100%", borderCollapse:"separate", borderSpacing:0}}>
            <thead>
              <tr style={{position:"sticky", top:0, background:"#105340", color:"#e8eefc"}}>
                <th style={th}>שם</th>
                <th style={th}>עמדה</th>
                <th style={th}>ציון</th>
              </tr>
            </thead>
            <tbody>
              {active.sort(byRatingDesc).map(p=>{
                const tidx = assign[p.id];
                return (
                  <tr key={p.id}
                      draggable={teams.length>0}
                      onDragStart={e=>onDragStart(e, p.id, tidx ?? -1)}
                      style={{borderTop:"1px solid #24324a", cursor: teams.length>0 ? "grab" : "default"}}>
                    <td style={td}>{p.name}</td>
                    <td style={td}>{p.pos}</td>
                    <td style={td}>{p.rating}</td>
                  </tr>
                );
              })}
              {active.length===0 && (
                <tr><td colSpan={3} style={{padding:"18px", textAlign:"center", color:"#9fb0cb"}}>אין שחקנים פעילים.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th = { padding: "10px 12px", textAlign: "right" };
const td = { padding: "10px 12px", color: "#e8eefc" };

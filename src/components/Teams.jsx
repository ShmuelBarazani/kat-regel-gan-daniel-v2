// src/components/Teams.jsx
import React, { useMemo, useState } from "react";
import { useStorage, POS, sum } from "../lib/storage.js";
import Players from "./Players.jsx";

export default function Teams({ mode = "build" }) {
  const { players, hiddenRatings, cycles, setCycles } = useStorage();
  const [numTeams, setNumTeams] = useState(4);
  const [teams, setTeams] = useState(() => makeEmpty(numTeams));
  const actives = useMemo(() => players.filter(p => p.active), [players]);

  // בנה קבוצות אוטומטיות
  function build() {
    if (!actives.length) { alert("אין שחקנים מסומנים למשחק"); return; }
    const buckets = makeEmpty(numTeams);
    // פזר GK
    const gk = actives.filter(p => p.pos === "GK").sort((a,b)=>b.rating-a.rating);
    gk.forEach(p => place(p, buckets));
    // פזר שאר
    const rest = actives.filter(p => p.pos !== "GK").sort((a,b)=>b.rating-a.rating);
    rest.forEach(p => place(p, buckets));
    setTeams(buckets);
  }

  // שמירת מחזור
  function saveCycle() {
    const stamp = new Date().toISOString().slice(0,19).replace("T"," ");
    const payload = { id: crypto.randomUUID(), at: stamp, teams };
    setCycles(prev => [payload, ...prev]);
    alert("המחזור נשמר");
  }

  // DnD
  function onDragStart(e, playerId, fromIdx) {
    e.dataTransfer.setData("playerId", playerId);
    e.dataTransfer.setData("fromIdx", String(fromIdx));
  }
  function onDrop(e, toIdx) {
    const playerId = e.dataTransfer.getData("playerId");
    const fromIdx = Number(e.dataTransfer.getData("fromIdx"));
    if (!playerId || Number.isNaN(fromIdx)) return;

    setTeams(prev => {
      const next = prev.map(t => ({ ...t, players: [...t.players] }));
      const from = next[fromIdx];
      const to = next[toIdx];
      const i = from.players.findIndex(p => p.id === playerId);
      if (i === -1) return prev;
      const [p] = from.players.splice(i,1);
      to.players.push(p);
      from.sum = sum(from.players, x=>x.rating);
      to.sum = sum(to.players, x=>x.rating);
      return next;
    });
  }

  // איפוס
  function clearTeams(){ setTeams(makeEmpty(numTeams)); }

  const totals = useMemo(() => actives.length, [actives]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>קבוצות למחזור</h2>
        <div className="actions">
          <label className="inline">
            <span>מס' קבוצות:</span>
            <select className="inp small" value={numTeams} onChange={e => { setNumTeams(Number(e.target.value)); clearTeams(); }}>
              {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button className="btn accent" onClick={build}>עשה מחזור</button>
          <button className="btn" onClick={saveCycle}>שמור מחזור</button>
          <span className="muted">מסומנים למשחק: {totals}</span>
        </div>
      </div>

      {/* קבוצות מעל הטבלה */}
      <div className="teams-grid">
        {teams.map((t, idx) => (
          <div key={idx}
               className="team-card"
               onDragOver={(e)=>e.preventDefault()}
               onDrop={(e)=>onDrop(e, idx)}
          >
            <div className="team-head">
              <div className="team-title">קבוצה {idx+1}</div>
              <div className="team-meta">
                סה״כ {t.sum.toFixed(2)} | ממוצע {(t.players.length? (t.sum/t.players.length):0).toFixed(2)}
              </div>
            </div>
            <div className="team-body">
              <ul>
                {t.players.map(p => (
                  <li key={p.id} draggable
                      onDragStart={(e)=>onDragStart(e, p.id, idx)}
                      title="גרור לשינוי קבוצה">
                    <span className="pos">{p.pos}</span>
                    <span className="nm">{p.name}</span>
                    <span className="rt">{hiddenRatings ? "—" : Number(p.rating).toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* טבלת השחקנים למטה */}
      <Players />
    </div>
  );
}

// אלגוריתם הנחתה פשוט עם עדיפויות: סכום נמוך, יעד עמדות, פיזור
function place(p, buckets) {
  let best = 0, bestScore = Infinity;
  for (let i=0;i<buckets.length;i++){
    const t = buckets[i];
    const score = t.sum + (t.posCounts[p.pos]||0)*2; // קנס קל על עומס בעמדה
    if (score < bestScore){ bestScore = score; best = i; }
  }
  const t = buckets[best];
  t.players.push(p);
  t.sum += p.rating || 0;
  t.posCounts[p.pos] = (t.posCounts[p.pos]||0)+1;
}

function makeEmpty(n){
  return Array.from({length:n}, (_,i)=>({
    name:`קבוצה ${i+1}`,
    players:[],
    sum:0,
    posCounts:{}
  }));
}

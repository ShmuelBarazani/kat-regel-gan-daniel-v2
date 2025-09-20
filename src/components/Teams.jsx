// src/components/Teams.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useStorage } from "../lib/storage.js";
import Players from "./Players.jsx";

export default function Teams() {
  const { players, addCycle, getLastTeams, setLastTeams } = useStorage();
  const activePlayers = useMemo(() => players.filter(p => p.active), [players]);

  const [teamCount, setTeamCount] = useState(4);
  const [groups, setGroups] = useState([]); // [[playerId...]]

  // שחזור מצב עמוד (קבוצות אחרונות)
  useEffect(() => {
    const last = getLastTeams();
    if (last && last.groups?.length) {
      setTeamCount(last.teamCount || 4);
      setGroups(last.groups);
    }
  }, [getLastTeams]);

  useEffect(() => {
    setLastTeams({ teamCount, groups });  // נשמר מידית
  }, [teamCount, groups, setLastTeams]);

  const avg = (ids) => {
    if (!ids.length) return 0;
    const sum = ids.reduce((s,id)=> s + (activePlayers.find(p=>String(p.id)===String(id))?.rating || 0), 0);
    return Number((sum / ids.length).toFixed(2));
  };

  // אלגוריתם מאוזן בסיסי: ממיינים לפי ציון ו"נחש" בין הקבוצות
  const makeTeams = () => {
    const list = activePlayers.slice().sort((a,b)=>b.rating-a.rating).map(p=>String(p.id));
    const g = Array.from({length: teamCount}, ()=>[]);
    let dir = 1, k = 0;
    for (const id of list) {
      g[k].push(id);
      if (k===teamCount-1) { dir = -1; }
      else if (k===0) { dir = 1; }
      k += dir;
    }
    setGroups(g);
  };

  const saveCycle = () => {
    if (!groups.some(g=>g.length)) return alert("אין קבוצות לשמירה");
    addCycle({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      teamCount,
      groups,
      // צילום מצב (לקריאה בלבד בדירוג/מנהל):
      snapshot: activePlayers.map(({id,name,pos,rating})=>({id,name,pos,rating}))
    });
    alert("המחזור נשמר בהצלחה");
  };

  return (
    <div className="container" dir="rtl">
      <div className="toolbar">
        <div className="inline">
          מס' קבוצות:{" "}
          <select value={teamCount} onChange={e=>setTeamCount(Number(e.target.value))}>
            {[2,3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button className="btn primary" onClick={makeTeams}>עשה כוחות</button>
        <button className="btn" onClick={saveCycle}>שמור מחזור</button>
      </div>

      {/* הקבוצות למעלה */}
      <div className="teams-grid">
        {Array.from({length: teamCount}).map((_,i)=>(
          <div className="team-card" key={i}>
            <div className="team-header">
              <span>קבוצה {i+1}</span>
              <span>{avg(groups[i]||[])} ממוצע</span>
            </div>
            <div className="team-list">
              {(groups[i]||[]).map(pid=>{
                const p = activePlayers.find(x=>String(x.id)===String(pid));
                if (!p) return null;
                return (
                  <div className="team-row" key={pid}>
                    <div className="name">{p.name}</div>
                    <div className="pos">{p.pos}</div>
                    <div className="rating">{p.rating}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* טבלת שחקנים מתחת לקבוצות */}
      <Players embedded />
    </div>
  );
}

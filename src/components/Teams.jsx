// src/components/Teams.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useStorage, POS, sum, avg } from "../lib/storage.js";
import Players from "./Players.jsx";

export default function Teams() {
  const {
    players, setPlayers,
    hiddenRatings, setHiddenRatings,
    cycles, setCycles,
  } = useStorage();

  const [teamCount, setTeamCount] = useState(4);
  const [teams, setTeams] = useState(() => emptyTeams(4));

  // רק שחקנים פעילים
  const activePlayers = useMemo(() => players.filter(p => p.active), [players]);

  // יצירת כוחות מאוזנים – בכל לחיצה קומבינציה שונה אך עם ממוצעים קרובים
  const makeBalancedTeams = useCallback(() => {
    let g = balancedGreedy(activePlayers, teamCount);
    g = optimizeGroups(g, 1500); // הורדת סטיית תקן של סכומי ציונים
    setTeams(g.map(sortByRatingDesc));
  }, [activePlayers, teamCount]);

  // שמירת הכוחות למחזור
  const saveTeams = () => {
    if (!teams.some(t => t.length)) return alert("אין קבוצות לשמירה.");
    const payload = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      groups: teams.map(g => g.map(p => p.id)),
      sums: teams.map(g => sum(g, x => x.rating)),
    };
    setCycles(prev => [payload, ...prev]);
    alert("הכוחות נשמרו למחזור.");
  };

  // גרירה בין קבוצות
  const onDragStart = (e, pid, fromIdx) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ pid, fromIdx }));
  };
  const onDrop = (e, toIdx) => {
    e.preventDefault();
    try {
      const { pid, fromIdx } = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (fromIdx === toIdx) return;
      setTeams(prev => {
        const next = prev.map(g => g.slice());
        const i = next[fromIdx].findIndex(x => x.id === pid);
        if (i >= 0) {
          const [pl] = next[fromIdx].splice(i, 1);
          next[toIdx].push(pl);
          next[toIdx] = sortByRatingDesc(next[toIdx]);
          next[fromIdx] = sortByRatingDesc(next[fromIdx]);
        }
        return next;
      });
    } catch {}
  };

  const renderTeam = (team, idx) => {
    const total = sum(team, p => p.rating);
    const average = team.length ? total / team.length : 0;

    return (
      <div
        key={idx}
        className="team-card"
        onDragOver={e => e.preventDefault()}
        onDrop={e => onDrop(e, idx)}
        data-hide-ratings={hiddenRatings ? "true" : "false"}
        dir="rtl"
      >
        <div className="team-header">
          <div>קבוצה {idx + 1}</div>
          <div className="team-metrics">
            <span>ממוצע {average.toFixed(2)}</span>
            <span> | סה״כ {total.toFixed(2)}</span>
          </div>
        </div>

        <ul className="team-list">
          {team.map(p => (
            <li
              key={p.id}
              className="team-row"
              draggable
              onDragStart={e => onDragStart(e, p.id, idx)}
              title={`${p.name} • ${p.pos} • ${p.rating.toFixed(1)}`}
            >
              {/* שם → תפקיד → ציון */}
              <span className="cell name">{p.name}</span>
              <span className="cell pos">{p.pos}</span>
              <span className="cell rating">{p.rating.toFixed(1)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="teams-page" dir="rtl">
      <div className="toolbar">
        <button className="btn primary" onClick={makeBalancedTeams}>עשה כוחות</button>
        <button className="btn" onClick={saveTeams}>קבע כוחות</button>

        <label className="toolbar-item">
          מס׳ קבוצות:
          <select
            value={teamCount}
            onChange={e => { const n = Number(e.target.value||4); setTeamCount(n); setTeams(emptyTeams(n)); }}
          >
            {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <label className="toolbar-item">
          הסתר ציונים
          <input type="checkbox" checked={hiddenRatings} onChange={e => setHiddenRatings(e.target.checked)} />
        </label>

        <div className="toolbar-note">טיפ: כל לחיצה על <b>עשה כוחות</b> תיצור חלוקה חדשה ומאוזנת.</div>
      </div>

      <div className="teams-grid">{teams.map(renderTeam)}</div>

      {/* טבלת השחקנים מתחת לכוחות */}
      <div style={{marginTop: "1rem"}}>
        <Players />
      </div>
    </div>
  );
}

/* ---------- חלוקה ומיטוב לאיזון ממוצעים ---------- */
function balancedGreedy(players, k){
  const shuffled = shuffle([...players]);
  shuffled.sort((a,b)=>b.rating-a.rating); // חזקים קודם
  const groups = Array.from({length:k},()=>[]);
  const sums = new Array(k).fill(0);
  for(const p of shuffled){
    let gi = 0;
    for(let i=1;i<k;i++) if(sums[i] < sums[gi]) gi = i;
    groups[gi].push(p);
    sums[gi] += Number(p.rating||0);
  }
  return groups;
}

// הורדת סטיית תקן של סכומי הקבוצות ע"י החלפות/העברות אקראיות שמקטינות את הפונקציה
function optimizeGroups(groups, iters=1000){
  const k = groups.length;
  const g = groups.map(arr=>arr.slice());
  let sums = g.map(team=>sum(team,p=>p.rating));
  let best = {score: stdev(sums), g: g.map(t=>t.slice()), sums:[...sums]};
  for(let t=0;t<iters;t++){
    const i = Math.floor(Math.random()*k);
    let j = Math.floor(Math.random()*k);
    if(j===i) j = (j+1)%k;

    // ננסה או swap או move
    if(g[i].length && g[j].length && Math.random()<0.7){
      const ai = Math.floor(Math.random()*g[i].length);
      const aj = Math.floor(Math.random()*g[j].length);
      const a = g[i][ai], b = g[j][aj];
      const di = b.rating - a.rating;
      const dj = a.rating - b.rating;
      const nsums = sums.slice();
      nsums[i] += di; nsums[j] += dj;
      if(stdev(nsums) <= stdev(sums)){
        // משפר – נבצע
        [g[i][ai], g[j][aj]] = [b, a];
        sums = nsums;
        if(stdev(sums) < best.score){ best={score:stdev(sums), g:g.map(t=>t.slice()), sums:[...sums]}; }
      }
    }else if(g[i].length){ // העברה בודדת
      const ai = Math.floor(Math.random()*g[i].length);
      const a = g[i][ai];
      const nsums = sums.slice();
      nsums[i] -= a.rating; nsums[j] += a.rating;
      if(stdev(nsums) <= stdev(sums)){
        g[i].splice(ai,1); g[j].push(a);
        sums = nsums;
        if(stdev(sums) < best.score){ best={score:stdev(sums), g:g.map(t=>t.slice()), sums:[...sums]}; }
      }
    }
  }
  return best.g;
}

function stdev(arr){ const m = arr.reduce((a,b)=>a+b,0)/arr.length; const v = arr.reduce((a,b)=>a+(b-m)**2,0)/arr.length; return Math.sqrt(v); }

function sortByRatingDesc(a){ return [...a].sort((x,y)=>y.rating-x.rating); }
function emptyTeams(n){ return Array.from({length:n},()=>[]); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

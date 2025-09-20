// src/components/Teams.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useStorage, sum } from "../lib/storage.js";
import Players from "./Players.jsx";

const TEAMS_LS = "katregel_last_teams_v2";

export default function Teams() {
  const { players, hiddenRatings, setHiddenRatings, setCycles } = useStorage();

  const [teamCount, setTeamCount] = useState(4);
  const [teams, setTeams] = useState(() => emptyTeams(4));

  const activePlayers = useMemo(() => players.filter(p => p.active), [players]);

  /** שחזור כוחות בעת כניסה למסך */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TEAMS_LS);
      if (!raw) return;
      const saved = JSON.parse(raw); // { teamCount, groups: [[id,id,...], ...] }

      const idMap = new Map(players.map(p => [String(p.id), p]));
      const restored = (saved?.groups || []).map(g =>
        (Array.isArray(g) ? g : []).map(id => idMap.get(String(id))).filter(Boolean)
      );
      if (restored.length) {
        setTeamCount(saved.teamCount || restored.length);
        setTeams(restored.map(sortByRatingDesc));
      }
    } catch {}
  }, [players]);

  /** שמירה בכל שינוי */
  useEffect(() => {
    if (!teams.length) return;
    const payload = {
      teamCount: teams.length,
      groups: teams.map(g => g.map(p => String(p.id))),
    };
    localStorage.setItem(TEAMS_LS, JSON.stringify(payload));
  }, [teams]);

  /** יצירה מאוזנת לפי ממוצע */
  const makeBalancedTeams = useCallback(() => {
    let g = balancedByAverage(activePlayers, teamCount);
    g = optimizeByAverage(g, 2000);
    setTeams(g.map(sortByRatingDesc));
    // נשמר גם ברגע הלחיצה (בנוסף ל-useEffect)
    setTimeout(() => {
      const payload = { teamCount, groups: g.map(t => t.map(p => String(p.id))) };
      localStorage.setItem(TEAMS_LS, JSON.stringify(payload));
    }, 0);
  }, [activePlayers, teamCount]);

  const saveTeamsAsCycle = () => {
    if (!teams.some(t => t.length)) return alert("אין קבוצות לשמירה.");
    const payload = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      groups: teams.map(g => g.map(p => p.id)),
      avgs: teams.map(g => avg(g, x => x.rating)),
    };
    setCycles(prev => [payload, ...prev]);
    alert("הכוחות נשמרו למחזור.");
  };

  /** Drag & Drop */
  const onDragStart = (e, pid, fromIdx) =>
    e.dataTransfer.setData("text/plain", JSON.stringify({ pid, fromIdx }));

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
    const average = team.length ? avg(team, p => p.rating) : 0;
    const total = sum(team, p => p.rating);
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
    <div className="teams-page container" dir="rtl">
      {/* טול־בר */}
      <div className="toolbar">
        <button className="btn primary" onClick={makeBalancedTeams}>עשה כוחות</button>
        <button className="btn" onClick={saveTeamsAsCycle}>קבע כוחות</button>

        <label className="toolbar-item">
          מס׳ קבוצות:
          <select
            value={teamCount}
            onChange={(e) => {
              const n = Number(e.target.value || 4);
              setTeamCount(n);
              setTeams(emptyTeams(n));
            }}
          >
            {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <label className="toolbar-item">
          הסתר ציונים
          <input
            type="checkbox"
            checked={hiddenRatings}
            onChange={e => setHiddenRatings(e.target.checked)}
          />
        </label>

        <div className="toolbar-note">טיפ: כל לחיצה על <b>עשה כוחות</b> תיצור חלוקה חדשה ומאוזנת.</div>
      </div>

      {/* קבוצות – בראש הדף */}
      <div className="teams-grid">{teams.map(renderTeam)}</div>

      {/* טבלת השחקנים – מתחת לקבוצות */}
      <div className="players-embed">
        <Players embedded />
      </div>
    </div>
  );
}

/*** helpers ***/
function avg(arr, sel = (x)=>x){ if(!arr?.length) return 0; return arr.reduce((a,x)=>a+(sel(x)||0),0)/arr.length; }
function sortByRatingDesc(a){ return [...a].sort((x,y)=>y.rating-x.rating); }
function emptyTeams(n){ return Array.from({length:n},()=>[]); }
function desiredSizes(n,k){ const base=Math.floor(n/k), extra=n%k; return Array.from({length:k},(_,i)=>base+(i<extra?1:0)); }
function nextIndex(i,k,dir){ const j=i+dir; return j<0?0:j>=k?k-1:j; }

function balancedByAverage(players, k){
  const sorted = [...players].sort((a,b)=>b.rating-a.rating);
  const sizes = desiredSizes(sorted.length, k);
  const groups = Array.from({length:k}, ()=>[]);
  let dir = 1, i = 0;
  for(const p of sorted){
    while(groups[i].length >= sizes[i]) i = nextIndex(i, k, dir);
    groups[i].push(p);
    i = nextIndex(i, k, dir);
    if(i===0 || i===k-1) dir *= -1;
  }
  return groups;
}
function optimizeByAverage(groups, iters=2000){
  const k = groups.length;
  const g = groups.map(a=>a.slice());
  let score = stdev(g.map(t=>avg(t,x=>x.rating)));
  for(let t=0;t<iters;t++){
    const i = Math.floor(Math.random()*k);
    let j = Math.floor(Math.random()*k); if(j===i) j=(j+1)%k;
    const ai = Math.floor(Math.random()*g[i].length);
    const aj = Math.floor(Math.random()*g[j].length);
    const A = g[i][ai], B = g[j][aj]; if(!A || !B) continue;
    g[i][ai] = B; g[j][aj] = A;
    const newScore = stdev(g.map(t=>avg(t,x=>x.rating)));
    if(newScore <= score) score = newScore; else { g[i][ai] = A; g[j][aj] = B; }
  }
  return g;
}
function stdev(arr){ const m=arr.reduce((a,b)=>a+b,0)/arr.length; const v=arr.reduce((a,b)=>a+(b-m)**2,0)/arr.length; return Math.sqrt(v); }

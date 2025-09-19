import React, { useEffect, useMemo, useState } from "react";

const LS_PLAYERS = "krgd_v2_players";
const LS_TEAMS   = "krgd_v2_teams";
const DEFAULT_TEAMS = ["אדום","כחול","ירוק","צהוב"];

export default function Teams(){
  const [players,setPlayers]=useState([]);
  const [teams,setTeams]=useState({});

  useEffect(()=>{
    const ps = localStorage.getItem(LS_PLAYERS);
    if(ps) setPlayers(JSON.parse(ps));
    const ts = localStorage.getItem(LS_TEAMS);
    if(ts) setTeams(JSON.parse(ts));
    else{
      const init = Object.fromEntries(DEFAULT_TEAMS.map(n=>[n,[]]));
      setTeams(init);
    }
  },[]);
  useEffect(()=>{
    localStorage.setItem(LS_TEAMS, JSON.stringify(teams));
  },[teams]);

  const unassigned = useMemo(()=>{
    const taken = new Set(Object.values(teams).flat().map(x=>x.id));
    return players.filter(p=>!taken.has(p.id));
  },[players,teams]);

  const addToTeam=(teamId,playerId)=>{
    const p = players.find(x=>x.id===playerId);
    if(!p) return;
    setTeams(t=>({...t,[teamId]:[...t[teamId], p]}));
  };
  const removeFromTeam=(teamId,playerId)=>{
    setTeams(t=>({...t,[teamId]: t[teamId].filter(x=>x.id!==playerId)}));
  };

  const totals = (arr)=>({
    count: arr.length,
    rating: arr.reduce((s,x)=>s+x.rating,0).toFixed(1)
  });

  const saveCycle=()=>{
    const time = new Date().toISOString();
    const cycles = JSON.parse(localStorage.getItem("krgd_v2_cycles")||"[]");
    cycles.push({id:crypto.randomUUID(), time, teams});
    localStorage.setItem("krgd_v2_cycles", JSON.stringify(cycles));
    alert("המחזור נשמר");
  };

  return (
    <div className="grid gap-4">
      <div className="card">
        <div className="card-title">שחקנים פנויים</div>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {unassigned.map(p=>(
            <div key={p.id} className="flex items-center justify-between px-3 py-2 border border-slate-700 rounded-xl">
              <div className="text-sm">{p.name} · <span className="text-slate-400">{p.pos}</span> · {p.rating}</div>
              <select className="input"
                      onChange={e=>{ if(e.target.value){ addToTeam(e.target.value,p.id); e.target.value=""; } }}>
                <option value="">הוסף לקבוצה…</option>
                {Object.keys(teams).map(t=> <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          ))}
          {!unassigned.length && <div className="text-slate-400 text-sm">אין שחקנים פנויים</div>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(teams).map(([teamName,list])=>{
          const t=totals(list);
          return (
            <div key={teamName} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="card-title">{teamName}</div>
                <div className="flex gap-2">
                  <span className="tag sky">שחקנים: {t.count}</span>
                  <span className="tag good">סך דירוג: {t.rating}</span>
                </div>
              </div>
              <table className="table text-sm">
                <thead><tr><th>שם</th><th>תפקיד</th><th>דירוג</th><th className="text-left">פעולה</th></tr></thead>
                <tbody>
                  {list.map(p=>(
                    <tr key={p.id}>
                      <td>{p.name}</td><td>{p.pos}</td><td>{p.rating}</td>
                      <td className="text-left">
                        <button className="btn btn-danger" onClick={()=>removeFromTeam(teamName,p.id)}>הסר</button>
                      </td>
                    </tr>
                  ))}
                  {!list.length && <tr><td colSpan={4} className="text-center text-slate-400 py-6">אין שחקנים בקבוצה</td></tr>}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2">
        <button className="btn btn-success" onClick={saveCycle}>שמירת מחזור</button>
        <button className="btn" onClick={()=>{
          if(confirm("לאפס חלוקת שחקנים בין הקבוצות?")) {
            const reset = Object.fromEntries(Object.keys(teams).map(n=>[n,[]]));
            setTeams(reset);
          }
        }}>איפוס חלוקה</button>
      </div>
    </div>
  );
}

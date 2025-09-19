import React, { useEffect, useMemo, useState } from "react";

const LS_RESULTS = "krgd_v2_results";
const LS_TEAMS   = "krgd_v2_teams";

export default function MatchdayResults({ bonusEnabled }){
  const [teams,setTeams]=useState({});
  const [rows,setRows]=useState([{a:"",b:"",ga:"0",gb:"0"}]);

  useEffect(()=>{
    const ts = localStorage.getItem(LS_TEAMS);
    if(ts) setTeams(JSON.parse(ts));
    const saved = localStorage.getItem(LS_RESULTS);
    if(saved) setRows(JSON.parse(saved));
  },[]);
  useEffect(()=>{
    localStorage.setItem(LS_RESULTS, JSON.stringify(rows));
  },[rows]);

  const allTeamNames = Object.keys(teams);

  const addRow=()=> setRows(r=>[...r,{a:"",b:"",ga:"0",gb:"0"}]);
  const delRow=(i)=> setRows(r=> r.filter((_,idx)=>idx!==i));

  const parsed = rows.filter(r=>r.a && r.b).map(r=>({
    a:r.a, b:r.b, ga:+r.ga, gb:+r.gb
  }));

  // חישוב ניקוד: 1 נק' לכל שער, 3 נק' לניצחון, 1 נק' לכל קבוצה בתיקו
  const scores = useMemo(()=>{
    const s = {};
    parsed.forEach(({a,b,ga,gb})=>{
      if(!s[a]) s[a]=0;
      if(!s[b]) s[b]=0;
      s[a]+= ga; s[b]+= gb;     // נקודות על שערים
      if(ga>gb) s[a]+=3;
      else if(gb>ga) s[b]+=3;
      else { s[a]+=1; s[b]+=1; } // תיקו
    });
    // בונוס כללי (פשוט): אם פעיל - תוספת 5 לכל קבוצה ששיחקה לפחות משחק אחד
    if(bonusEnabled){
      Object.keys(s).forEach(k=> s[k]+=5);
    }
    return s;
  },[parsed, bonusEnabled]);

  return (
    <div className="grid gap-4">
      <div className="card">
        <div className="card-title">תוצאות מחזור</div>
        <table className="table text-sm">
          <thead>
            <tr>
              <th style={{width:"28%"}}>קבוצת בית</th>
              <th style={{width:"28%"}}>קבוצת חוץ</th>
              <th style={{width:"10%"}}>שערי בית</th>
              <th style={{width:"10%"}}>שערי חוץ</th>
              <th className="text-left" style={{width:"14%"}}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,idx)=>(
              <tr key={idx}>
                <td>
                  <select className="input w-full" value={r.a}
                          onChange={e=>setRows(x=>x.map((y,i)=> i===idx? {...y,a:e.target.value}:y))}>
                    <option value="">בחר…</option>
                    {allTeamNames.map(t=> <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td>
                  <select className="input w-full" value={r.b}
                          onChange={e=>setRows(x=>x.map((y,i)=> i===idx? {...y,b:e.target.value}:y))}>
                    <option value="">בחר…</option>
                    {allTeamNames.map(t=> <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td>
                  <input className="input w-full" type="number" min="0" max="50" value={r.ga}
                         onChange={e=>setRows(x=>x.map((y,i)=> i===idx? {...y,ga:e.target.value}:y))}/>
                </td>
                <td>
                  <input className="input w-full" type="number" min="0" max="50" value={r.gb}
                         onChange={e=>setRows(x=>x.map((y,i)=> i===idx? {...y,gb:e.target.value}:y))}/>
                </td>
                <td className="text-left">
                  <button className="btn btn-danger" onClick={()=>delRow(idx)}>מחק</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 mt-3">
          <button className="btn btn-primary" onClick={addRow}>הוסף משחק</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">ניקוד מצטבר למחזור (1 לשער, 3 לניצחון{bonusEnabled ? ", +5 בונוס": ""})</div>
        <table className="table text-sm">
          <thead><tr><th>קבוצה</th><th>נקודות</th></tr></thead>
          <tbody>
            {Object.entries(scores).sort((a,b)=>b[1]-a[1]).map(([team,pts])=>(
              <tr key={team}><td>{team}</td><td>{pts}</td></tr>
            ))}
            {!Object.keys(scores).length && <tr><td colSpan={2} className="text-center text-slate-400 py-6">עדיין אין נתונים</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";

const LS_RESULTS = "krgd_v2_results";

export default function Leaderboards(){
  const [rows,setRows]=useState([]);
  useEffect(()=>{
    const saved = localStorage.getItem(LS_RESULTS);
    if(saved) setRows(JSON.parse(saved));
  },[]);

  const data = useMemo(()=>{
    const agg = {};
    rows.filter(r=>r.a&&r.b).forEach(r=>{
      const ga=+r.ga, gb=+r.gb;
      agg[r.a]=(agg[r.a]||{goals:0,matches:0}); agg[r.a].goals+=ga; agg[r.a].matches++;
      agg[r.b]=(agg[r.b]||{goals:0,matches:0}); agg[r.b].goals+=gb; agg[r.b].matches++;
    });
    return Object.entries(agg).map(([team,vals])=>({team, ...vals})).sort((a,b)=>b.goals-a.goals);
  },[rows]);

  return (
    <div className="grid gap-4">
      <div className="card">
        <div className="card-title">מלכות השערים — לפי קבוצות</div>
        <table className="table text-sm">
          <thead><tr><th>#</th><th>קבוצה</th><th>שערים</th><th>משחקים</th></tr></thead>
          <tbody>
            {data.map((r,i)=>(
              <tr key={r.team}>
                <td>{i+1}</td><td>{r.team}</td><td>{r.goals}</td><td>{r.matches}</td>
              </tr>
            ))}
            {!data.length && <tr><td colSpan={4} className="text-center text-slate-400 py-6">אין נתונים</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-slate-400">* ניתן להרחיב בעתיד למלך שערים לפי שחקנים כאשר נקשר תיעוד שערים לרמת שחקן.</div>
    </div>
  );
}

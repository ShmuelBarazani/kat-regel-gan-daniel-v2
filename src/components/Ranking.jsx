import React, { useEffect, useMemo, useState } from "react";

const LS_RESULTS = "krgd_v2_results";

export default function Ranking(){
  const [rows,setRows]=useState([]);

  useEffect(()=>{
    const saved = localStorage.getItem(LS_RESULTS);
    if(saved) setRows(JSON.parse(saved));
  },[]);

  // חישוב ניקוד זהה לזה שבמסך תוצאות (לשימוש משני)
  const aggregate = useMemo(()=>{
    const parsed = rows.filter(r=>r.a && r.b).map(r=>({a:r.a,b:r.b,ga:+r.ga,gb:+r.gb}));
    const s={};
    parsed.forEach(({a,b,ga,gb})=>{
      s[a]=(s[a]||0)+ga;
      s[b]=(s[b]||0)+gb;
      if(ga>gb) s[a]+=3;
      else if(gb>ga) s[b]+=3;
      else { s[a]=(s[a]||0)+1; s[b]=(s[b]||0)+1; }
    });
    return s;
  },[rows]);

  const sorted = useMemo(()=> Object.entries(aggregate).sort((a,b)=>b[1]-a[1]) ,[aggregate]);

  return (
    <div className="grid gap-4">
      <div className="card">
        <div className="card-title">טבלת דירוג מצטבר</div>
        <table className="table text-sm">
          <thead><tr><th>#</th><th>קבוצה</th><th>נקודות</th></tr></thead>
          <tbody>
            {sorted.map(([team,pts],i)=>(
              <tr key={team}><td>{i+1}</td><td>{team}</td><td>{pts}</td></tr>
            ))}
            {!sorted.length && <tr><td colSpan={3} className="text-center text-slate-400 py-6">אין נתונים</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

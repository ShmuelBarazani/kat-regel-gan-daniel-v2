import React, { useEffect, useState } from "react";

const LS_TEAMS   = "krgd_v2_teams";
const LS_RESULTS = "krgd_v2_results";

export default function PrintView(){
  const [teams,setTeams]=useState({});
  const [rows,setRows]=useState([]);

  useEffect(()=>{
    const ts = localStorage.getItem(LS_TEAMS);
    if(ts) setTeams(JSON.parse(ts));
    const rs = localStorage.getItem(LS_RESULTS);
    if(rs) setRows(JSON.parse(rs));
  },[]);

  return (
    <div className="grid gap-4">
      <div className="print-page">
        <h2 style={{marginTop:0}}>קבוצות ושחקנים</h2>
        <div className="grid md:grid-cols-2 gap-12">
          {Object.entries(teams).map(([name,list])=>(
            <div key={name}>
              <h3 style={{margin:"6px 0"}}>{name}</h3>
              <table style={{width:"100%",borderCollapse:"collapse"}} border="1">
                <thead><tr><th>שם</th><th>תפקיד</th><th>דירוג</th></tr></thead>
                <tbody>
                  {list.map(p=> (<tr key={p.id}><td>{p.name}</td><td>{p.pos}</td><td>{p.rating}</td></tr>))}
                  {!list.length && <tr><td colSpan={3} style={{textAlign:"center"}}>—</td></tr>}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      <div className="print-page">
        <h2 style={{marginTop:0}}>תוצאות מחזור</h2>
        <table style={{width:"100%",borderCollapse:"collapse"}} border="1">
          <thead><tr><th>בית</th><th>חוץ</th><th>שערי בית</th><th>שערי חוץ</th></tr></thead>
          <tbody>
            {rows.filter(r=>r.a&&r.b).map((r,i)=>(
              <tr key={i}><td>{r.a}</td><td>{r.b}</td><td>{r.ga}</td><td>{r.gb}</td></tr>
            ))}
            {!rows.length && <tr><td colSpan={4} style={{textAlign:"center"}}>—</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

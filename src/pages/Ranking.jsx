import React, { useContext, useMemo, useState } from "react";
import { AppCtx } from "../App.jsx";

const css = {
  card:{background:"#0f172a",border:"1px solid #1d2a4a",borderRadius:12},
  body:{padding:12},
  table:{width:"100%",borderCollapse:"collapse",fontSize:14},
  th:{position:"sticky",top:0,background:"#134e4a",color:"#86efac",padding:8},
  td:{padding:8,borderBottom:"1px solid #1f2b46"}
};
const scroll=h=>({maxHeight:h,overflow:"auto"});
const pts = r => (r==="W"?3:r==="D"?1:0);

export default function RankingPage(){
  const {sessions}=useContext(AppCtx);
  const published = sessions.filter(s=>s.status==="PUBLISHED");
  const [year,setYear]=useState(new Date().getFullYear());
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const [bonuses,setBonuses]=useState(true);

  const boards = useMemo(()=>{
    const rec = new Map(); // id -> {name, monthly:{key:{pts,goals,apps}}, yearly:{y:{...}} }
    const forMonth = `${year}-${String(month).padStart(2,"0")}`;
    const forYear  = `${year}`;
    published.forEach(s=>{
      const d = new Date(s.date);
      const mk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const yk=`${d.getFullYear()}`;
      s.teams.forEach((t,ti)=>{
        const arr=s.results.teamMatches[ti]||[];
        t.players.forEach(p=>{
          if(!rec.has(p.id)) rec.set(p.id,{name:p.name,M:{},Y:{}});
          const rp=rec.get(p.id);
          const m=rp.M[mk]??={pts:0,goals:0,apps:0}; m.pts+=arr.reduce((s,r)=>s+pts(r),0); m.apps+=1; m.goals+=(+s.results.goals?.[p.id]||0);
          const y=rp.Y[yk]??={pts:0,goals:0,apps:0}; y.pts+=arr.reduce((s,r)=>s+pts(r),0); y.apps+=1; y.goals+=(+s.results.goals?.[p.id]||0);
          rp.M[mk]=m; rp.Y[yk]=y;
        });
      });
    });

    let monthly=[]; rec.forEach((v,id)=>{const m=v.M[forMonth]; if(m&&m.apps) monthly.push({id,name:v.name,avg:+(m.pts/m.apps).toFixed(2),apps:m.apps,points:m.pts,goals:m.goals});});
    monthly.sort((a,b)=>b.avg-a.avg||b.points-a.points);
    if(monthly.length && bonuses){ monthly[0].points+=10; } // בונוס חודשי
    let topGoalsMonthly=[...monthly].sort((a,b)=>b.goals-a.goals).map(x=>({id:x.id,name:x.name,goals:x.goals}));

    let yearly=[]; rec.forEach(v=>{const y=v.Y[forYear]; if(y&&y.apps) yearly.push({name:v.name,goals:y.goals});});
    yearly.sort((a,b)=>b.goals-a.goals);

    return {monthly, topGoalsMonthly, topGoalsYearly: yearly};
  },[published,year,month,bonuses]);

  return (
    <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr",gap:12}}>
      <div style={css.card}>
        <div style={{...css.body,display:"flex",gap:8,alignItems:"center"}}>
          <h3 style={{margin:0}}>אליפות החודש {bonuses?"(כולל בונוסים)":"(ללא בונוסים)"}</h3>
          <select value={year} onChange={e=>setYear(+e.target.value)}>{Array.from({length:6},(_,i)=>new Date().getFullYear()-i).map(y=><option key={y} value={y}>{y}</option>)}</select>
          <select value={month} onChange={e=>setMonth(+e.target.value)}>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}</option>)}</select>
          <label style={{marginInlineStart:"auto"}}><input type="checkbox" checked={bonuses} onChange={e=>setBonuses(e.target.checked)} /> עם בונוסים</label>
        </div>
        <div style={{...css.body,...scroll("55vh")}}>
          <table style={css.table}><thead><tr><th style={css.th}>#</th><th style={css.th}>שחקן</th><th style={css.th}>ממוצע</th><th style={css.th}>מפגשים</th><th style={css.th}>נק'</th></tr></thead>
            <tbody>{boards.monthly.map((r,i)=>(<tr key={r.id}><td style={css.td}>{i+1}</td><td style={css.td}>{r.name}{i===0?" 👑":""}</td><td style={css.td}>{r.avg}</td><td style={css.td}>{r.apps}</td><td style={css.td}>{r.points}</td></tr>))}</tbody>
          </table>
        </div>
      </div>

      <div style={css.card}>
        <div style={css.body}><h3 style={{margin:0}}>מלך שערים — חודשי</h3></div>
        <div style={{...css.body,...scroll("55vh")}}>
          <table style={css.table}><thead><tr><th style={css.th}>#</th><th style={css.th}>שחקן</th><th style={css.th}>שערים</th></tr></thead>
            <tbody>{boards.topGoalsMonthly.map((r,i)=>(<tr key={i}><td style={css.td}>{i+1}</td><td style={css.td}>{r.name}</td><td style={css.td}>{r.goals}</td></tr>))}</tbody>
          </table>
        </div>
      </div>

      <div style={css.card}>
        <div style={css.body}><h3 style={{margin:0}}>מלך השערים — שנתי</h3></div>
        <div style={{...css.body,...scroll("55vh")}}>
          <table style={css.table}><thead><tr><th style={css.th}>#</th><th style={css.th}>שחקן</th><th style={css.th}>שערים</th></tr></thead>
            <tbody>{boards.topGoalsYearly.map((r,i)=>(<tr key={i}><td style={css.td}>{i+1}</td><td style={css.td}>{r.name}</td><td style={css.td}>{r.goals}</td></tr>))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

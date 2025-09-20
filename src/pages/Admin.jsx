import React, { useContext, useMemo, useState } from "react";
import { AppCtx } from "../App.jsx";

const css = {
  card:{background:"#0f172a",border:"1px solid #1d2a4a",borderRadius:12},
  body:{padding:12},
  table:{width:"100%",borderCollapse:"collapse",fontSize:14},
  th:{position:"sticky",top:0,background:"#134e4a",color:"#86efac",padding:8},
  td:{padding:8,borderBottom:"1px solid #1f2b46"},
  select:{background:"#0b1020",border:"1px solid #1f2b46",color:"#e5f0ff",borderRadius:8,padding:"6px 8px"}
};
const scroll = h=>({maxHeight:h,overflow:"auto"});

export default function AdminPage(){
  const {sessions,setSessions}=useContext(AppCtx);
  const [currentId,setCurrentId]=useState(null);
  const drafts = sessions.filter(s=>s.status==="DRAFT");

  const open = (id)=> setCurrentId(id);
  const remove = (id)=> setSessions(ps=>ps.filter(s=>s.id!==id));
  const publish = (id)=> setSessions(ps=>ps.map(s=>s.id===id?{...s,status:"PUBLISHED"}:s));

  const cur = sessions.find(s=>s.id===currentId)||null;

  const addMatch=(tidx)=>setSessions(ps=>ps.map(s=>s.id!==currentId?s:({...s,results:{...s.results,teamMatches:s.results.teamMatches.map((a,i)=>i===tidx?[...a,"W"]:a)}})));
  const updMatch=(tidx,idx,val)=>setSessions(ps=>ps.map(s=>s.id!==currentId?s:({...s,results:{...s.results,teamMatches:s.results.teamMatches.map((a,i)=>i===tidx?a.map((x,j)=>j===idx?val:x):a)}})));
  const rmMatch=(tidx,idx)=>setSessions(ps=>ps.map(s=>s.id!==currentId?s:({...s,results:{...s.results,teamMatches:s.results.teamMatches.map((a,i)=>i===tidx?a.filter((_,j)=>j!==idx):a)}})));
  const setGoals=(pid,val)=>setSessions(ps=>ps.map(s=>s.id!==currentId?s:({...s,results:{...s.results,goals:{...s.results.goals,[pid]:Math.max(0,+val||0)}}})));

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1.5fr",gap:12}}>
      <div style={css.card}>
        <div style={{...css.body}}>
          <h3 style={{marginTop:0}}>מחזורים שמורים (טיוטות)</h3>
        </div>
        <div style={{...css.body,...scroll("58vh")}}>
          <table style={css.table}>
            <thead><tr><th style={css.th}>תאריך</th><th style={css.th}>קבוצות</th><th style={css.th}>שחקנים</th><th style={css.th}>פעולות</th></tr></thead>
            <tbody>
              {drafts.map(s=>{
                const countPlayers = s.teams.reduce((n,t)=>n+t.players.length,0);
                return (
                  <tr key={s.id}>
                    <td style={css.td}>{s.date}</td>
                    <td style={css.td}>{s.teams.length}</td>
                    <td style={css.td}>{countPlayers}</td>
                    <td style={css.td}>
                      <button onClick={()=>open(s.id)}>פתח</button>{" "}
                      <button onClick={()=>publish(s.id)}>פרסם</button>{" "}
                      <button onClick={()=>remove(s.id)}>מחק</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={css.card}>
        <div style={css.body}><h3 style={{marginTop:0}}>עריכת מחזור</h3></div>
        {!cur? <div style={{...css.body,opacity:.7}}>בחר טיוטה.</div> :
          <div style={{...css.body,...scroll("58vh")}}>
            <div style={{display:"grid",gap:8,gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))"}}>
              {cur.teams.map((t,idx)=>{
                const arr=cur.results.teamMatches[idx]||[];
                const pts = arr.reduce((s,r)=>s+(r==="W"?3:r==="D"?1:0),0);
                return (
                  <div key={idx} style={{border:"1px solid #1d2a4a",borderRadius:12,padding:10}}>
                    <div style={{fontWeight:700,marginBottom:6}}>{t.name} (נק': {pts})</div>
                    {arr.map((r,i)=>(
                      <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                        <select style={css.select} value={r} onChange={e=>updMatch(idx,i,e.target.value)}>
                          <option value="W">ניצחון</option><option value="D">תיקו</option><option value="L">הפסד</option>
                        </select>
                        <button onClick={()=>rmMatch(idx,i)}>מחק</button>
                      </div>
                    ))}
                    <button onClick={()=>addMatch(idx)}>הוסף תוצאה</button>

                    <div style={{marginTop:10,fontSize:13,color:"#93c5fd"}}>כובשי שערים</div>
                    {t.players.map(p=>(
                      <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:6,alignItems:"center"}}>
                        <div>{p.name}</div>
                        <input type="number" min={0} value={cur.results.goals?.[p.id]||0}
                               onChange={e=>setGoals(p.id,e.target.value)} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>}
      </div>
    </div>
  );
}

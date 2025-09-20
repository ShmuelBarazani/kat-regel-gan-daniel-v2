import React, { useContext, useMemo, useState } from "react";
import { AppCtx } from "../App.jsx";
import { balanceTeams, avg } from "../logic/balance.js";

const css = {
  card:{background:"#0f172a",border:"1px solid #1d2a4a",borderRadius:12},
  body:{padding:12},
  grid:{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))"},
  box:{border:"1px solid #1d2a4a",borderRadius:12,padding:12,minHeight:120},
  title:{margin:0,color:"#6ee7b7"}
};
const scroll = h => ({maxHeight:h,overflow:"auto"});

export default function TeamsPage(){
  const {players,setPlayers,teams,setTeams,ui,setUi,sessions,setSessions}=useContext(AppCtx);
  const [k,setK]=useState(4);
  const poolPlayers = players.filter(p=>p.selected);

  const build = ()=>{
    try{
      const t = balanceTeams(poolPlayers, k);
      setTeams(t);
    }catch(e){ alert(e.message||String(e)); }
  };

  const saveDraft = ()=>{
    if(!teams.length){ alert("אין כוחות לשמירה."); return; }
    const s = {
      id: Date.now(),
      status: "DRAFT",
      date: new Date().toISOString().slice(0,10),
      teams: teams.map((t,i)=>({name:`קבוצה ${i+1}`,players:t.players})),
      results:{ teamMatches: teams.map(()=>[]), goals:{} },
    };
    setSessions(prev=>[s,...prev]);
    alert("נשמרה טיוטת מחזור במסך מנהל.");
  };

  // גרירה
  const onDragStart = (e,pid,fromTeamIdx)=> {
    e.dataTransfer.setData("text/plain", JSON.stringify({pid,fromTeamIdx}));
    e.dataTransfer.effectAllowed="move";
  };
  const allowDrop = e => { e.preventDefault(); e.dataTransfer.dropEffect="move"; };
  const onDropToTeam = (e,teamIdx)=>{
    e.preventDefault();
    const data=JSON.parse(e.dataTransfer.getData("text/plain")||"{}");
    if(!data.pid && data.pid!==0) return;
    setTeams(ts=>{
      const copy=ts.map(t=>({...t,players:[...t.players]}));
      let player=null;
      if(data.fromTeamIdx>=0){
        const arr=copy[data.fromTeamIdx].players;
        const i=arr.findIndex(p=>p.id===data.pid);
        if(i>=0){ player=arr[i]; arr.splice(i,1); }
      }else{
        player=poolPlayers.find(p=>p.id===data.pid);
      }
      if(!player) return ts;

      // אזהרת שבירה של “חייב-עם”
      if((player.prefer||[]).length){
        const inSame = copy[teamIdx].players.filter(p=> (player.prefer||[]).includes(p.id)).length;
        if(inSame < (player.prefer||[]).length){
          if(!confirm("פעולה זו מפרקת יחידת 'חייב-עם'. להמשיך?")) return ts;
        }
      }
      copy[teamIdx].players.push(player);
      copy[teamIdx].players.sort((a,b)=>b.r-a.r);

      // בדיקת כלל גדלים (שוויון/±1)
      const sizes = copy.map(t=>t.players.length);
      const mx=Math.max(...sizes), mn=Math.min(...sizes);
      if(mx-mn>1){
        alert("הפרת כלל גודל: ההפרש בין קבוצות אינו יכול לעלות על 1");
        return ts; // ביטול
      }
      return copy;
    });
  };

  const onDropToPool = e=>{
    e.preventDefault();
    const data=JSON.parse(e.dataTransfer.getData("text/plain")||"{}");
    if(data.fromTeamIdx>=0){
      setTeams(ts=>{
        const copy=ts.map(t=>({...t,players:[...t.players]}));
        const arr=copy[data.fromTeamIdx].players;
        const i=arr.findIndex(p=>p.id===data.pid);
        if(i>=0) arr.splice(i,1);
        return copy;
      });
    }
  };

  return (
    <div className="teams">
      {/* כרטיסי קבוצות */}
      <div style={{...css.card,marginBottom:12}}>
        <div style={css.body}>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
            <button onClick={build}>עשה כוחות</button>
            <button onClick={saveDraft}>שמור מחזור (טיוטה)</button>
            <label style={{fontSize:13,marginInlineStart:8}}>
              <input type="checkbox" checked={ui.showRatings} onChange={e=>setUi({...ui,showRatings:e.target.checked})} />
              {" "}הסתר ציונים (בכרטיסי הקבוצות)
            </label>
            <div style={{marginInlineStart:"auto",fontSize:13,color:"#93c5fd"}}>
              פעילים: {poolPlayers.length} | בקבוצות: {teams.reduce((n,t)=>n+t.players.length,0)}
            </div>
            <div style={{display:"flex",gap:6}}>
              <span style={{fontSize:13}}>מס' קבוצות</span>
              <input type="number" min={2} max={12} value={k} onChange={e=>setK(Math.max(2,Math.min(12,+e.target.value||4)))} />
            </div>
          </div>

          {!teams.length? <div style={{opacity:.7}}>עוד לא נוצרו כוחות.</div> :
            <div style={css.grid}>
              {teams.map((t,i)=>{
                const total=t.players.reduce((s,x)=>s+x.r,0);
                const a=avg(t.players.map(p=>p.r)).toFixed(2);
                return (
                  <div key={i} style={css.box} onDragOver={allowDrop} onDrop={e=>onDropToTeam(e,i)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <h4 style={css.title}>{t.name}</h4>
                      <div style={{fontSize:12,color:"#a7f3d0"}}>
                        {ui.showRatings? <>ממוצע {a} | </> : null}
                        סכ"ה {total} | {t.players.length} שחקנים
                      </div>
                    </div>
                    <ul style={{listStyle:"none",margin:0,padding:0}}>
                      {t.players.map(p=>(
                        <li key={p.id} style={{display:"flex",gap:6,alignItems:"center",padding:"4px 0"}}>
                          <span draggable onDragStart={e=>onDragStart(e,p.id,i)} style={{cursor:"grab"}}>⋮⋮</span>
                          <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                            {ui.showRatings? `${p.name} (${p.pos||"-"}) – ${p.r}` : p.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>}
        </div>
      </div>

      {/* אזור גרירה להחזרה למאגר */}
      <div style={{...css.card,marginBottom:12}}>
        <div style={{...css.body,color:"#93c5fd"}} onDragOver={e=>e.preventDefault()} onDrop={onDropToPool}>
          כדי להסיר שחקן מקבוצה – גרור לכאן (מאגר).
        </div>
      </div>

      {/* טבלת שחקנים רק לצפייה (עם ציונים) – גלילה פנימית */}
      <div style={css.card}>
        <div style={{...css.body,...scroll("36vh")}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr>
                <th style={{position:"sticky",top:0,background:"#134e4a",color:"#86efac",padding:6}}>שם</th>
                <th style={{position:"sticky",top:0,background:"#134e4a",color:"#86efac",padding:6}}>עמדה</th>
                <th style={{position:"sticky",top:0,background:"#134e4a",color:"#86efac",padding:6}}>ציון</th>
              </tr>
            </thead>
            <tbody>
              {poolPlayers.map(p=>(
                <tr key={p.id}>
                  <td style={{padding:6,borderBottom:"1px solid #1f2b46"}} draggable
                      onDragStart={e=>{e.dataTransfer.setData("text/plain",JSON.stringify({pid:p.id,fromTeamIdx:-1})); e.dataTransfer.effectAllowed="move";}}>
                    {p.name}
                  </td>
                  <td style={{padding:6,borderBottom:"1px solid #1f2b46"}}>{p.pos||"-"}</td>
                  <td style={{padding:6,borderBottom:"1px solid #1f2b46"}}>{p.r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

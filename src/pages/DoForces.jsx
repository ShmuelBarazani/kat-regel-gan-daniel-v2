// src/pages/DoForces.jsx
import React, { useEffect, useMemo, useState } from "react";

/** ================== הגדרות אחסון ================== **/
const LS_KEYS = {
  PLAYERS: "players",          // אותו מפתח שמסך "שחקנים" שומר אליו
  DRAFT: "teams_draft_v1",     // טיוטת מחזור אחרונה
  UI: "teams_ui_state_v1",     // מצב UI (הסתר ציונים + מס’ קבוצות)
};

function loadPlayersFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEYS.PLAYERS);
    const arr = JSON.parse(raw || "[]");
    return arr
      .map((p, idx) => ({
        id: p.id ?? `${p.name}-${idx}`,
        name: (p.name || "").trim(),
        pos: p.pos || "MF",
        rating: typeof p.rating === "number" ? p.rating : parseFloat(p.rating) || 0,
        mustWith: Array.isArray(p.mustWith) ? p.mustWith : [],
        notWith: Array.isArray(p.notWith) ? p.notWith : [],
        active: p.active !== false, // ברירת־מחדל: משחק
      }))
      .filter((p) => p.active);
  } catch {
    return [];
  }
}

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.DRAFT) || "null"); }
  catch { return null; }
}
function saveDraft(d) {
  localStorage.setItem(LS_KEYS.DRAFT, JSON.stringify(d));
}

function loadUi() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.UI) || "null") || { hideRatingsInCards:false, teamsCount:4 }; }
  catch { return { hideRatingsInCards:false, teamsCount:4 }; }
}
function saveUi(u) { localStorage.setItem(LS_KEYS.UI, JSON.stringify(u)); }

/** ================== עזרי לוגיקה ================== **/
function shuffle(a0){const a=[...a0];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;}
function emptyTeams(n){return Array.from({length:n},(_,i)=>({id:`team-${i+1}`,name:`קבוצה ${i+1}`,players:[]}));}
function teamStats(t){const c=t.players.length,sum=t.players.reduce((s,p)=>s+(p.rating||0),0),avg=c?sum/c:0;return{count:c,sum,avg:Math.round(avg*10)/10};}
function sizeTargets(playersCount,teamsCount){const base=Math.floor(playersCount/teamsCount),extra=playersCount%teamsCount;return Array.from({length:teamsCount},(_,i)=>base+(i<extra?1:0));}
function violatesNotWith(team,player){if(!player?.notWith?.length)return false;const names=new Set(team.players.map(p=>p.name));return player.notWith.some(n=>names.has(n));}
function mustWithWarnings(teams){
  const warnings=new Set();
  const nameToTeam=new Map();
  teams.forEach((t,ti)=>t.players.forEach(p=>nameToTeam.set(p.name,ti)));
  teams.forEach(t=>t.players.forEach(p=>{
    (p.mustWith||[]).forEach(m=>{
      const t1=nameToTeam.get(p.name),t2=nameToTeam.get(m);
      if(t2!==undefined && t1!==t2) warnings.add(`${p.name} חייב לשחק עם ${m} (כעת מופרדים)`);
    });
  }));
  return [...warnings];
}
function canDrop(team,player,max){ if(team.players.length>=max) return false; if(violatesNotWith(team,player)) return false; return true; }

function buildRandomTeams(players,teamsCount){
  const targets=sizeTargets(players.length,teamsCount);
  const teams=emptyTeams(teamsCount);
  const rnd=shuffle(players);
  rnd.forEach(p=>{
    const order=teams.map((t,i)=>({i,t,need:targets[i]-t.players.length})).filter(x=>x.need>0).sort((a,b)=>b.need-a.need);
    let placed=false;
    for(const o of order){ if(canDrop(o.t,p,targets[o.i])){ o.t.players.push(p); placed=true; break; } }
    if(!placed){
      const idx=teams.findIndex((t,i)=>t.players.length<targets[i]);
      if(idx>=0) teams[idx].players.push(p);
      else teams[0].players.push(p);
    }
  });
  return teams;
}

/** ================== דף עשה כוחות ================== **/
export default function DoForces(){
  const [players,setPlayers]=useState([]);
  const [teamsCount,setTeamsCount]=useState(4);
  const [teams,setTeams]=useState(emptyTeams(4));
  const [hideRatingsInCards,setHideRatingsInCards]=useState(false);
  const [drag,setDrag]=useState(null);
  const [hoverWarn,setHoverWarn]=useState(null);

  // טעינה ראשונית + האזנה לשינויים ב-localStorage (למקרה שעוברים לטאב "שחקנים" ומשנים)
  useEffect(()=>{
    const ui=loadUi();
    setHideRatingsInCards(!!ui.hideRatingsInCards);
    setTeamsCount(ui.teamsCount||4);

    const actives=loadPlayersFromLocalStorage();
    setPlayers(actives);

    const draft=loadDraft();
    if(draft?.teamsCount){
      setTeams(draft.teams||emptyTeams(draft.teamsCount));
      setTeamsCount(draft.teamsCount);
    }else{
      setTeams(emptyTeams(ui.teamsCount||4));
    }

    const onStorage=(e)=>{ if(e.key===LS_KEYS.PLAYERS){ setPlayers(loadPlayersFromLocalStorage()); } };
    window.addEventListener("storage",onStorage);
    return ()=>window.removeEventListener("storage",onStorage);
  },[]);

  const activeCount=players.length;
  const targets=useMemo(()=>sizeTargets(activeCount,teamsCount),[activeCount,teamsCount]);
  const mustAlerts=useMemo(()=>mustWithWarnings(teams),[teams]);

  function onMakeTeams(){ setTeams(buildRandomTeams(players,teamsCount)); }
  function onSaveDraft(){
    saveDraft({ savedAt:new Date().toISOString(), teamsCount, teams });
    alert("הטיוטה נשמרה (localStorage).");
  }
  function onClear(){ setTeams(emptyTeams(teamsCount)); }
  function onToggleHide(){ const next=!hideRatingsInCards; setHideRatingsInCards(next); saveUi({hideRatingsInCards:next,teamsCount}); }
  function onChangeTeamsCount(n){ const num=Math.max(2,Math.min(8,Number(n)||4)); setTeamsCount(num); saveUi({hideRatingsInCards,teamsCount:num}); setTeams(emptyTeams(num)); }

  // D&D
  function dragFromTable(p){ setDrag({from:"table",player:p}); }
  function dragFromTeam(ti,pi){ setDrag({from:"team",teamIdx:ti,pIdx:pi,player:teams[ti].players[pi]}); }
  function endDrag(){ setDrag(null); setHoverWarn(null); }
  function overTeam(e,ti){ e.preventDefault(); if(!drag) return;
    const t=teams[ti]; const max=targets[ti];
    if(!canDrop(t,drag.player,max)) setHoverWarn("אי אפשר לשבץ כאן (חסימת 'לא־עם' או שהקבוצה מלאה)");
    else setHoverWarn(null);
  }
  function dropTeam(e,ti){ e.preventDefault(); if(!drag) return;
    const t=teams[ti]; const max=targets[ti]; if(!canDrop(t,drag.player,max)) return endDrag();
    const next=teams.map(x=>({ ...x, players:[...x.players] }));
    if(drag.from==="team"){ next[drag.teamIdx].players.splice(drag.pIdx,1); }
    next[ti].players.push(drag.player);
    setTeams(next); endDrag();
  }
  function overTable(e){ e.preventDefault(); }
  function dropTable(e){ e.preventDefault(); if(!drag || drag.from!=="team") return;
    const next=teams.map(x=>({ ...x, players:[...x.players] })); next[drag.teamIdx].players.splice(drag.pIdx,1); setTeams(next); endDrag();
  }
  function removeFromTeam(ti,pi){ const next=teams.map(x=>({ ...x, players:[...x.players] })); next[ti].players.splice(pi,1); setTeams(next); }

  return (
    <div className="page" style={{padding:"16px 12px"}}>
      <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <h1 style={{margin:0}}>קטרגל־גן דניאל ⚽</h1>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <label style={{display:"flex",alignItems:"center",gap:6}}>
            <span>מס׳ קבוצות</span>
            <select value={teamsCount} onChange={e=>onChangeTeamsCount(e.target.value)} className="pill" style={{padding:"6px 10px",borderRadius:999}}>
              {[2,3,4,5,6,7,8].map(n=> <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button className="btn" onClick={onMakeTeams}>עשה כוחות</button>
          <button className="btn ghost" onClick={onClear}>איפוס</button>
          <button className="btn" onClick={onSaveDraft}>שמור מחזור (טיוטה)</button>
          <label className="pill" style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:999}}>
            <input type="checkbox" checked={hideRatingsInCards} onChange={onToggleHide}/>
            <span>הסתר ציונים (בכרטיסים בלבד)</span>
          </label>
        </div>
      </header>

      <section style={{marginTop:18}}>
        <h2 style={{margin:"0 0 8px 0",opacity:.9}}>קבוצות למחזור</h2>

        {hoverWarn && (
          <div style={{margin:"6px 0 10px",padding:"8px 12px",borderRadius:8,border:"1px dashed var(--edge,#334)",background:"var(--card,#0f1a2e)"}}>
            {hoverWarn}
          </div>
        )}
        {mustAlerts.length>0 && (
          <div style={{margin:"6px 0 10px",padding:"8px 12px",borderRadius:8,border:"1px solid var(--warn,#ff5c7a)",background:"rgba(255,92,122,.08)"}}>
            {mustAlerts.map((w,i)=><div key={i}>⚠️ {w}</div>)}
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12}}>
          {teams.map((t,ti)=>{
            const stats=teamStats(t); const target=targets[ti]??0; const full=t.players.length>=target;
            return (
              <div key={t.id}
                   className={`card team-card ${full?"full":""}`}
                   onDragOver={e=>overTeam(e,ti)} onDrop={e=>dropTeam(e,ti)}
                   style={{border:"1px solid var(--edge,#24324a)",background:"var(--card,#0f1a2e)",borderRadius:14,padding:12,minHeight:140}}>
                <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,marginBottom:6}}>
                  <div style={{fontWeight:600}}>{t.name}</div>
                  <div style={{fontSize:12,opacity:.85}}>ממוצע {stats.avg} | סכ״כ {stats.sum.toFixed(1)} | {stats.count}/{target}</div>
                </div>
                <ul style={{listStyle:"disc",paddingInlineStart:20,margin:0}}>
                  {t.players.map((p,pi)=>(
                    <li key={p.id}
                        draggable onDragStart={()=>dragFromTeam(ti,pi)} onDragEnd={endDrag}
                        title="גרור כדי להחזיר לטבלה"
                        style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"6px 8px",borderRadius:8,margin:"4px 0",background:"rgba(255,255,255,.03)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{opacity:.9}}>{p.name}</span>
                        <span style={{fontSize:12,opacity:.7}}>({p.pos})</span>
                        {!hideRatingsInCards && <span style={{fontSize:12,opacity:.9}}>ציון {p.rating}</span>}
                      </div>
                      <button className="btn tiny ghost" onClick={()=>removeFromTeam(ti,pi)}>הסר</button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{marginTop:22}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
          <h2 style={{margin:"0 0 8px 0",opacity:.9}}>רשימת השחקנים</h2>
          <small style={{opacity:.8}}>גרור שחקן מהטבלה לכרטיס קבוצה, או חזרה לכאן להסרה.</small>
        </div>

        <div onDragOver={overTable} onDrop={dropTable}
             style={{overflow:"auto",maxHeight:420,border:"1px solid var(--edge,#24324a)",borderRadius:12}}>
          <table style={{width:"100%",borderCollapse:"separate",borderSpacing:0}}>
            <thead style={{position:"sticky",top:0,background:"var(--card,#0f1a2e)",zIndex:1}}>
              <tr>
                <th style={th}>משחק?</th>
                <th style={th}>שם</th>
                <th style={th}>עמדה</th>
                <th style={th}>ציון</th>
                <th style={th}>חייב־עם</th>
                <th style={th}>לא־עם</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p=>{
                const inTeam=teams.some(t=>t.players.some(x=>x.id===p.id));
                return (
                  <tr key={p.id}>
                    <td style={tdCenter}><input type="checkbox" checked={!inTeam} readOnly/></td>
                    <td style={{...td,cursor:"grab",userSelect:"none"}}
                        draggable onDragStart={()=>dragFromTable(p)} onDragEnd={endDrag}
                        title="גרור לקבוצה">
                      {p.name}
                    </td>
                    <td style={td}>{p.pos}</td>
                    <td style={td}>{p.rating}</td>
                    <td style={tdSmall}>{p.mustWith?.length?p.mustWith.join(", "):"—"}</td>
                    <td style={tdSmall}>{p.notWith?.length?p.notWith.join(", "):"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const th={textAlign:"right",padding:"10px 12px",borderBottom:"1px solid var(--edge,#24324a)",whiteSpace:"nowrap"};
const td={textAlign:"right",padding:"10px 12px",borderBottom:"1px solid rgba(255,255,255,.06)"};
const tdSmall={...td,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"};
const tdCenter={...td,textAlign:"center"};

import React, { useContext, useMemo, useRef, useState } from "react";
import { AppCtx } from "../App.jsx";

const POS = ["","GK","DF","MF","FW"];
const css = {
  card:{background:"#0f172a",border:"1px solid #1d2a4a",borderRadius:12},
  body:{padding:12},
  table:{width:"100%",borderCollapse:"collapse",fontSize:14},
  th:{position:"sticky",top:0,zIndex:5,background:"#134e4a",color:"#86efac",padding:8,textAlign:"right"},
  thSort:{cursor:"pointer",userSelect:"none"},
  td:{padding:8,borderBottom:"1px solid #1f2b46",verticalAlign:"middle"},
  input:{background:"#0b1020",border:"1px solid #1f2b46",color:"#e5f0ff",borderRadius:8,padding:"6px 8px"},
  select:{background:"#0b1020",border:"1px solid #1f2b46",color:"#e5f0ff",borderRadius:8,padding:"6px 8px"},
  chips:{display:"flex",gap:6,flexWrap:"wrap",color:"#a7f3d0",fontSize:12},
  chip:{border:"1px solid #2a425f",borderRadius:999,padding:"2px 8px"},
  modalBg:{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999},
  modal:{background:"#0f172a",border:"1px solid #1d2a4a",borderRadius:12,padding:12,width:"min(800px,96vw)",color:"#dbeafe"}
};
const scroll = h => ({maxHeight:h,overflow:"auto"});

export default function PlayersPage(){
  const {players,setPlayers}=useContext(AppCtx);
  const [sort,setSort]=useState({key:"name",dir:"asc"});
  const [modal,setModal]=useState(null); // {type:'add'|'pick', forId, field:'prefer'|'avoid'}
  const [filterActive,setFilterActive]=useState(false);

  const namesById = useMemo(()=>{const m=new Map();players.forEach(p=>m.set(p.id,p.name));return m;},[players]);

  const sorted = useMemo(()=>{
    const arr=[...players].filter(p=>!filterActive || p.selected);
    const dir = sort.dir==="asc"?1:-1;
    const val = (p,k)=> k==="name"?p.name||"":k==="pos"?p.pos||"":k==="r"?+p.r||0:k==="selected"?(p.selected?1:0):"";
    return arr.sort((a,b)=>{
      const va=val(a,sort.key), vb=val(b,sort.key);
      if(typeof va==="number"||typeof vb==="number") return (va-vb)*dir;
      return String(va).localeCompare(String(vb),"he")*dir;
    });
  },[players,sort,filterActive]);

  const toggleSort=k=>setSort(s=>s.key===k?{key:k,dir:s.dir==="asc"?"desc":"asc"}:{key:k,dir:"asc"});
  const sicon=k=> sort.key!==k? "" : (sort.dir==="asc"?" ▲":" ▼");

  const update = (id,patch) => setPlayers(ps => ps.map(p=>p.id===id?{...p,...patch}:p));
  const remove = id => setPlayers(ps => ps.filter(p=>p.id!==id));
  const add = (draft) => setPlayers(ps => [...ps, draft]);

  const activeCount = players.filter(p=>p.selected).length;

  return (
    <div style={css.card}>
      <div style={{...css.body,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:13,color:"#93c5fd"}}>שחקנים פעילים: {activeCount}</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setModal({type:"add"})}>הוסף שחקן</button>
          <label style={{fontSize:13}}>
            <input type="checkbox" checked={filterActive} onChange={e=>setFilterActive(e.target.checked)} /> הצג פעילים בלבד
          </label>
        </div>
      </div>

      <div style={{...css.body,...scroll("50vh")}}>
        <table style={css.table}>
          <thead>
            <tr>
              <th style={{...css.th,width:80}} onClick={()=>toggleSort("selected")} className="th">משחק?{sicon("selected")}</th>
              <th style={{...css.th,...css.thSort}} onClick={()=>toggleSort("name")}>שם{sicon("name")}</th>
              <th style={{...css.th,...css.thSort}} onClick={()=>toggleSort("pos")}>עמדה{sicon("pos")}</th>
              <th style={{...css.th,...css.thSort,width:90}} onClick={()=>toggleSort("r")}>ציון{sicon("r")}</th>
              <th style={css.th}>חייב עם</th>
              <th style={css.th}>לא עם</th>
              <th style={{...css.th,width:90}}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(p=>(
              <tr key={p.id}>
                <td style={css.td}>
                  <input type="checkbox" checked={p.selected||false} onChange={e=>update(p.id,{selected:e.target.checked})}/>
                </td>
                <td style={css.td}>
                  <input style={{...css.input,width:180}} value={p.name||""}
                         onChange={e=>update(p.id,{name:e.target.value})}/>
                </td>
                <td style={css.td}>
                  <select style={{...css.select,width:90}} value={p.pos||""}
                          onChange={e=>update(p.id,{pos:e.target.value})}>
                    {POS.map(x=><option key={x} value={x}>{x||"(ללא)"}</option>)}
                  </select>
                </td>
                <td style={css.td}>
                  <input type="number" min={1} max={10} style={{...css.input,width:70}} value={p.r||5}
                         onChange={e=>update(p.id,{r:Math.max(1,Math.min(10,+e.target.value||5))})}/>
                </td>
                <td style={css.td}>
                  <div style={css.chips}>
                    {(p.prefer||[]).map(id=> <span key={id} style={css.chip}>{namesById.get(id)||id}</span>)}
                    <button onClick={()=>setModal({type:"pick",forId:p.id,field:"prefer"})}>בחר</button>
                  </div>
                </td>
                <td style={css.td}>
                  <div style={css.chips}>
                    {(p.avoid||[]).map(id=> <span key={id} style={css.chip}>{namesById.get(id)||id}</span>)}
                    <button onClick={()=>setModal({type:"pick",forId:p.id,field:"avoid"})}>בחר</button>
                  </div>
                </td>
                <td style={css.td}><button onClick={()=>remove(p.id)}>מחיקה</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type==="add" && <AddModal onClose={()=>setModal(null)} onSave={add} />}
      {modal?.type==="pick" && (
        <PickerModal
          onClose={()=>setModal(null)}
          playerId={modal.forId}
          field={modal.field}
          players={players}
          onSave={(ids)=> update(modal.forId,{ [modal.field]: ids })}
        />
      )}
    </div>
  );
}

function AddModal({onClose,onSave}){
  const [draft,setDraft]=useState({id:Date.now(),name:"",pos:"",r:5,selected:true,prefer:[],avoid:[]});
  const cssm={...css};
  return (
    <div style={cssm.modalBg} onMouseDown={onClose}>
      <div style={cssm.modal} onMouseDown={e=>e.stopPropagation()}>
        <h3 style={{marginTop:0}}>שחקן חדש</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          <input style={cssm.input} placeholder="שם" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/>
          <select style={cssm.select} value={draft.pos} onChange={e=>setDraft({...draft,pos:e.target.value})}>
            {["","GK","DF","MF","FW"].map(x=><option key={x} value={x}>{x||"(ללא)"}</option>)}
          </select>
          <input type="number" min={1} max={10} style={cssm.input} value={draft.r}
                 onChange={e=>setDraft({...draft,r:Math.max(1,Math.min(10,+e.target.value||5))})}/>
          <label style={{alignSelf:"center"}}>
            <input type="checkbox" checked={draft.selected} onChange={e=>setDraft({...draft,selected:e.target.checked})}/> משחק?
          </label>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8,fontSize:12,opacity:.8}}>
          <div>בחירת “חייב עם/לא עם” מהעמודה בטבלה אחרי השמירה.</div><div></div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:10}}>
          <button onClick={onClose}>סגור</button>
          <button onClick={()=>{ onSave(draft); onClose(); }}>שמירה</button>
        </div>
      </div>
    </div>
  );
}

function PickerModal({onClose,players,playerId,field,onSave}){
  const me = players.find(p=>p.id===playerId);
  const [sel,setSel]=useState(new Set(me?.[field]||[]));
  const list = players.filter(p=>p.id!==playerId);
  return (
    <div style={css.modalBg} onMouseDown={onClose}>
      <div style={css.modal} onMouseDown={e=>e.stopPropagation()}>
        <h3 style={{marginTop:0}}>{field==="prefer"?"חייב לשחק עם":"לא לשחק עם"}</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8,maxHeight:"50vh",overflow:"auto"}}>
          {list.map(p=>{
            const on = sel.has(p.id);
            return <label key={p.id} style={{border:"1px solid #2a425f",padding:8,borderRadius:10,background:on?"#1d2a4a":"transparent"}}>
              <input type="checkbox" checked={on} onChange={e=>{
                const s=new Set(sel); if(e.target.checked)s.add(p.id); else s.delete(p.id); setSel(s);
              }}/> <span style={{marginInlineStart:6}}>{p.name}</span>
            </label>
          })}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:10}}>
          <button onClick={onClose}>סגור</button>
          <button onClick={()=>{ onSave([...sel]); onClose(); }}>שמירה</button>
        </div>
      </div>
    </div>
  );
}

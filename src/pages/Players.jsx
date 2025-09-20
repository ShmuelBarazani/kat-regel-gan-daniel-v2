import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadPlayers, savePlayers, seedIfEmpty, reloadFromFile } from "../store/playerStorage";

const POS_OPTIONS = ["GK","DF","MF","FW"];

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState(blankForm());
  const firstFocusRef = useRef(null);

  useEffect(() => { (async () => {
    const seeded = await seedIfEmpty();
    setPlayers(seeded.length ? seeded : loadPlayers());
  })(); }, []);

  useEffect(() => { if (modalOpen && firstFocusRef.current) firstFocusRef.current.focus(); }, [modalOpen]);

  const activeCount = useMemo(() => players.filter(p => !!p.active).length, [players]);

  const data = useMemo(() => {
    const out = [...players];
    out.sort((a,b) => {
      const { key, dir } = sort;
      const va = typeof a[key]==="string" ? a[key].toLowerCase() : a[key] ?? "";
      const vb = typeof b[key]==="string" ? b[key].toLowerCase() : b[key] ?? "";
      if (va < vb) return dir==="asc" ? -1 : 1;
      if (va > vb) return dir==="asc" ?  1 : -1;
      return 0;
    });
    return out;
  }, [players, sort]);

  function blankForm(){ return { active:false, name:"", pos:"MF", rating:5, mustWith:[], avoidWith:[] }; }
  function splitCsv(v){ if(!v) return []; if(Array.isArray(v)) return v; return String(v).split(",").map(s=>s.trim()).filter(Boolean); }
  function joinNames(a){ return (a||[]).join(", "); }
  function cryptoId(){ return window.crypto?.randomUUID?.() || "id_" + Math.random().toString(36).slice(2); }

  function setSortCol(key){ setSort(prev => prev.key===key ? ({key, dir: prev.dir==="asc"?"desc":"asc"}) : ({key, dir:"asc"})); }
  function toggleActive(id){ const next = players.map(p => p.id===id ? {...p, active:!p.active} : p); setPlayers(next); savePlayers(next); }
  function removeById(id){ if(!confirm("למחוק את השחקן?")) return; const next = players.filter(p => p.id!==id); setPlayers(next); savePlayers(next); }

  function openAdd(){ setEditIdx(null); setForm(blankForm()); setModalOpen(true); }
  function openEdit(rowIdx){
    const p = data[rowIdx]; const orig = players.findIndex(x => x.id===p.id);
    setEditIdx(orig);
    setForm({ active:!!p.active, name:p.name||"", pos:p.pos||"MF",
      rating: typeof p.rating==="number"?p.rating:Number(p.rating)||0,
      mustWith: Array.isArray(p.mustWith)?p.mustWith:splitCsv(p.mustWith),
      avoidWith: Array.isArray(p.avoidWith)?p.avoidWith:splitCsv(p.avoidWith) });
    setModalOpen(true);
  }

  function onSaveForm(e){
    e?.preventDefault?.();
    if(!form.name.trim()) return alert("שם שחקן נדרש");
    const record = {
      id: editIdx===null ? cryptoId() : players[editIdx].id,
      active: !!form.active, name: form.name.trim(), pos: form.pos,
      rating: Number(form.rating)||0,
      mustWith: Array.isArray(form.mustWith)?form.mustWith:splitCsv(form.mustWith),
      avoidWith: Array.isArray(form.avoidWith)?form.avoidWith:splitCsv(form.avoidWith),
    };
    const next = [...players]; if (editIdx===null) next.push(record); else next[editIdx]=record;
    setPlayers(next); savePlayers(next); setModalOpen(false);
  }

  const selectableNames = useMemo(() => {
    const curr = form.name?.trim?.() || "";
    return players.map(p=>p.name).filter(n=>n && n!==curr);
  }, [players, form.name]);

  return (
    <div className="page" dir="rtl" style={{maxWidth:1180, margin:"24px auto", padding:"0 12px"}}>
      <HeaderBar
        activeCount={activeCount}
        onAdd={openAdd}
        onReload={async ()=>{ const f=await reloadFromFile(); setPlayers(f); }}
      />

      <div className="card" style={{background:"#0f1a2e", border:"1px solid #24324a", borderRadius:16, padding:12}}>
        <div style={{maxHeight:"64vh", overflow:"auto"}}>
          <table style={{width:"100%", borderCollapse:"separate", borderSpacing:0, direction:"rtl"}}>
            <thead>
              <tr style={{position:"sticky", top:0, zIndex:1}}>
                <Th onClick={()=>setSortCol("active")}>משחק?</Th>
                <Th onClick={()=>setSortCol("name")}   sorted={sort.key==="name"}   dir={sort.dir}>שם</Th>
                <Th onClick={()=>setSortCol("pos")}    sorted={sort.key==="pos"}    dir={sort.dir}>עמדה</Th>
                <Th onClick={()=>setSortCol("rating")} sorted={sort.key==="rating"} dir={sort.dir}>ציון</Th>
                <Th onClick={()=>setSortCol("mustWith")}  sorted={sort.key==="mustWith"}  dir={sort.dir}>חייב עם</Th>
                <Th onClick={()=>setSortCol("avoidWith")} sorted={sort.key==="avoidWith"} dir={sort.dir}>לא עם</Th>
                <Th>פעולות</Th>
              </tr>
            </thead>
            <tbody>
              {data.length===0 && (<tr><td colSpan={7} style={{padding:"28px 12px", textAlign:"center", color:"#9fb0cb"}}>אין שחקנים לתצוגה.</td></tr>)}
              {data.map((p, idx)=>(
                <tr key={p.id} style={{borderTop:"1px solid #24324a"}}>
                  <td style={cellStyle}><input type="checkbox" checked={!!p.active} onChange={()=>toggleActive(p.id)}/></td>
                  <td style={cellStyle}>{p.name}</td>
                  <td style={cellStyle}>{p.pos}</td>
                  <td style={cellStyle}>{p.rating}</td>
                  <td style={cellStyle}>{joinNames(p.mustWith)}</td>
                  <td style={cellStyle}>{joinNames(p.avoidWith)}</td>
                  <td style={cellStyle}>
                    <button onClick={()=>openEdit(idx)} className="btn ghost">ערוך</button>{" "}
                    <button onClick={()=>removeById(p.id)} className="btn danger">מחק</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div role="dialog" aria-modal="true" style={modalWrap}>
          <div style={modalCard /* <<< חלון צר יותר */}>
            <h3 style={{margin:"0 0 8px"}}>{editIdx===null ? "הוסף שחקן" : "ערוך שחקן"}</h3>

            <form onSubmit={onSaveForm}>
              {/* שורה קומפקטית: משחק? (צמוד) | V | שם (צר) | עמדה | ציון */}
              <div style={{
                display:"grid",
                gridTemplateColumns:"auto 16px 200px 96px 72px",
                columnGap:6, alignItems:"center", marginBottom:10
              }}>
                <label style={{margin:0, whiteSpace:"nowrap"}}>משחק?</label>
                <input ref={firstFocusRef} type="checkbox" checked={form.active}
                       onChange={e=>setForm(f=>({...f, active:e.target.checked}))}
                       style={{margin:0, justifySelf:"start"}} />
                <input  type="text" value={form.name}
                        onChange={e=>setForm(f=>({...f, name:e.target.value}))}
                        placeholder="שם שחקן" />
                <select value={form.pos} onChange={e=>setForm(f=>({...f, pos:e.target.value}))}>
                  {POS_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
                <input type="number" step="0.5" min="1" max="10" value={form.rating}
                       onChange={e=>setForm(f=>({...f, rating:e.target.value}))} />
              </div>

              {/* מתחת: רשימות בחירה */}
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
                <PickList title="לא עם"   value={form.avoidWith}
                          onChange={(vals)=>setForm(f=>({...f, avoidWith: vals}))}
                          options={selectableNames}/>
                <PickList title="חייב עם" value={form.mustWith}
                          onChange={(vals)=>setForm(f=>({...f, mustWith: vals}))}
                          options={selectableNames}/>
              </div>

              <div style={{marginTop:12, display:"flex", gap:8}}>
                <button type="submit" className="btn primary">שמור</button>
                <button type="button" className="btn ghost" onClick={()=>setModalOpen(false)}>בטל</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        /* כפתורים בסגנון כהה-ירוק (כמו התמונה המועדפת) */
        .btn{padding:7px 12px;border-radius:999px;border:1px solid #1e3b2f;background:#0e201a;color:#e8eefc;cursor:pointer}
        .btn:hover{filter:brightness(1.08)}
        .btn.primary{background:#1f6f43;border-color:#1f6f43}
        .btn.danger{background:#ff5c7a;border-color:#ff5c7a;color:white}
        .btn.ghost{background:transparent}

        thead tr{background:#105340;color:#e8eefc}
        th, td{font-size:14px}
        input, select{background:#0b1220;color:#e8eefc;border:1px solid #24324a;border-radius:10px;padding:6px}
        select[multiple]{width:100%;min-height:200px}
      `}</style>
    </div>
  );
}

function PickList({title, value, onChange, options}){
  return (
    <div>
      <div style={{marginBottom:6}}>{title}</div>
      <select multiple size={8}
              value={Array.isArray(value)?value:[]}
              onChange={e=>onChange([...e.target.selectedOptions].map(o=>o.value))}>
        {options.map(n => <option key={title+"_"+n} value={n}>{n}</option>)}
      </select>
    </div>
  );
}

function HeaderBar({ activeCount, onAdd, onReload }){
  return (
    <div style={{display:"flex", alignItems:"center", gap:12, justifyContent:"space-between", margin:"0 0 10px"}}>
      <div style={{display:"flex", alignItems:"center", gap:12}}>
        <button className="btn primary" onClick={onAdd}>הוסף שחקן</button>
        <button className="btn" onClick={onReload}>רענן מקובץ</button>
      </div>
      <div style={{color:"#9fb0cb"}}>שחקנים פעילים: {activeCount}</div>
    </div>
  );
}

function Th({ children, onClick, sorted, dir }){
  return (
    <th onClick={onClick} style={{
      position:"sticky", top:0, background:"#105340", color:"#e8eefc",
      padding:"10px 12px", textAlign:"right", cursor:onClick?"pointer":"default",
      borderBottom:"1px solid #24324a"
    }}>
      <span>{children}</span>{sorted ? (dir==="asc" ? " ▲" : " ▼") : ""}
    </th>
  );
}

const cellStyle = { padding:"10px 12px", verticalAlign:"middle", color:"#e8eefc" };
const modalWrap = { position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"grid", placeItems:"center", zIndex:1000 };
const modalCard = { width:560, maxWidth:"90vw", /* <<< קטן יותר */ background:"#0f1a2e", border:"1px solid #24324a", borderRadius:16, padding:16, color:"#e8eefc" };

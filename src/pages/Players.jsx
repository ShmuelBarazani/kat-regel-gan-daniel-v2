import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadPlayers, savePlayers, seedIfEmpty } from "../store/playerStorage";

// עמודות: משחק? | שם | עמדה | ציון | חייב עם | לא עם | פעולות
const POS_OPTIONS = ["GK","DF","MF","FW"];

export default function Players() {
  // טען/אתחל נתונים
  const [players, setPlayers] = useState([]);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState(blankForm());
  const firstFocusRef = useRef(null);

  useEffect(() => {
    seedIfEmpty();                  // מכניס רשימת ברירת מחדל אם אין כלום
    setPlayers(loadPlayers());      // טוען מה־localStorage
  }, []);

  useEffect(() => {
    if (modalOpen && firstFocusRef.current) {
      firstFocusRef.current.focus();
    }
  }, [modalOpen]);

  const activeCount = useMemo(() => players.filter(p => !!p.active).length, [players]);

  const data = useMemo(() => {
    let out = [...players];
    if (showActiveOnly) out = out.filter(p => p.active);
    out.sort((a,b) => {
      const { key, dir } = sort;
      const va = norm(a[key]);
      const vb = norm(b[key]);
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [players, showActiveOnly, sort]);

  function norm(v){
    if (v === undefined || v === null) return "";
    if (typeof v === "string") return v.toLowerCase();
    return v;
  }

  function blankForm() {
    return { active:false, name:"", pos:"MF", rating:5, mustWith:[], avoidWith:[] };
  }

  function openAdd() {
    setEditIdx(null);
    setForm(blankForm());
    setModalOpen(true);
  }

  function openEdit(idx) {
    const p = data[idx];
    const origIndex = players.findIndex(x => x.id === p.id);
    setEditIdx(origIndex);
    setForm({
      active: !!p.active,
      name: p.name || "",
      pos: p.pos || "MF",
      rating: p.rating ?? 5,
      mustWith: Array.isArray(p.mustWith) ? p.mustWith : splitNames(p.mustWith),
      avoidWith: Array.isArray(p.avoidWith) ? p.avoidWith : splitNames(p.avoidWith),
    });
    setModalOpen(true);
  }

  function splitNames(v){
    if (!v) return [];
    if (Array.isArray(v)) return v;
    return String(v).split(",").map(s=>s.trim()).filter(Boolean);
  }

  function joinNames(arr){
    return (arr || []).join(", ");
  }

  function onSaveForm(e){
    e?.preventDefault?.();
    // ולידציה קצרה
    if (!form.name.trim()) {
      alert("שם שחקן נדרש");
      return;
    }
    if (!POS_OPTIONS.includes(form.pos)) {
      alert("עמדה לא תקפה");
      return;
    }
    const record = {
      id: editIdx === null ? cryptoId() : players[editIdx].id,
      active: !!form.active,
      name: form.name.trim(),
      pos: form.pos,
      rating: Number(form.rating) || 0,
      mustWith: splitNames(form.mustWith),
      avoidWith: splitNames(form.avoidWith),
    };
    let next = [...players];
    if (editIdx === null) next.push(record);
    else next[editIdx] = record;

    setPlayers(next);
    savePlayers(next);
    setModalOpen(false);
  }

  function cryptoId(){
    // מזהה יציב
    return (window.crypto?.randomUUID?.() || "id_" + Math.random().toString(36).slice(2));
  }

  function removeById(id){
    if (!confirm("למחוק את השחקן?")) return;
    const next = players.filter(p => p.id !== id);
    setPlayers(next);
    savePlayers(next);
  }

  function toggleActive(id){
    const next = players.map(p => p.id===id ? {...p, active:!p.active} : p);
    setPlayers(next);
    savePlayers(next);
  }

  function setSortCol(key){
    setSort(prev => prev.key === key ? ({ key, dir: prev.dir==="asc"?"desc":"asc" }) : ({ key, dir:"asc" }));
  }

  // סגנון בסיסי + טבלה גלילה עם כותרות sticky
  return (
    <div className="page" dir="rtl" style={{maxWidth:1180, margin:"24px auto", padding:"0 12px"}}>
      <HeaderBar
        activeCount={activeCount}
        showActiveOnly={showActiveOnly}
        setShowActiveOnly={setShowActiveOnly}
        onAdd={openAdd}
      />

      <div className="card" style={{
        background:"#0f1a2e", border:"1px solid #24324a", borderRadius:16, padding:12
      }}>
        <div style={{maxHeight:"64vh", overflow:"auto"}}>
          <table style={{width:"100%", borderCollapse:"separate", borderSpacing:0, direction:"rtl"}}>
            <thead>
              <tr style={{position:"sticky", top:0, zIndex:1}}>
                <Th onClick={()=>setSortCol("active")}>משחק?</Th>
                <Th onClick={()=>setSortCol("name")} sorted={sort.key==="name"} dir={sort.dir}>שם</Th>
                <Th onClick={()=>setSortCol("pos")} sorted={sort.key==="pos"} dir={sort.dir}>עמדה</Th>
                <Th onClick={()=>setSortCol("rating")} sorted={sort.key==="rating"} dir={sort.dir}>ציון</Th>
                <Th onClick={()=>setSortCol("mustWith")} sorted={sort.key==="mustWith"} dir={sort.dir}>חייב עם</Th>
                <Th onClick={()=>setSortCol("avoidWith")} sorted={sort.key==="avoidWith"} dir={sort.dir}>לא עם</Th>
                <Th>פעולות</Th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} style={{padding:"28px 12px", textAlign:"center", color:"#9fb0cb"}}>
                    אין שחקנים לתצוגה.
                  </td>
                </tr>
              )}
              {data.map((p, idx) => (
                <tr key={p.id} style={{borderTop:"1px solid #24324a"}}>
                  <td style={cellStyle}>
                    <input
                      type="checkbox"
                      checked={!!p.active}
                      onChange={()=>toggleActive(p.id)}
                      aria-label={`שנה מצב משחק עבור ${p.name}`}
                    />
                  </td>
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
          <div style={modalCard}>
            <h3 style={{margin:"0 0 12px"}}>{editIdx===null ? "הוסף שחקן" : "ערוך שחקן"}</h3>
            <form onSubmit={onSaveForm}>
              <div className="grid" style={{display:"grid", gridTemplateColumns:"120px 1fr", gap:10, alignItems:"center"}}>
                <label>משחק?</label>
                <input type="checkbox" checked={form.active} onChange={e=>setForm(f=>({ ...f, active:e.target.checked }))} />

                <label>שם</label>
                <input ref={firstFocusRef} type="text" value={form.name} onChange={e=>setForm(f=>({ ...f, name:e.target.value }))} placeholder="שם שחקן" />

                <label>עמדה</label>
                <select value={form.pos} onChange={e=>setForm(f=>({ ...f, pos:e.target.value }))}>
                  {POS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>

                <label>ציון</label>
                <input type="number" step="0.5" min="1" max="10" value={form.rating}
                       onChange={e=>setForm(f=>({ ...f, rating:e.target.value }))} />

                <label>חייב עם</label>
                <input type="text" value={Array.isArray(form.mustWith)?form.mustWith.join(", "):form.mustWith||""}
                       onChange={e=>setForm(f=>({ ...f, mustWith:e.target.value }))} placeholder="שמות מופרדים בפסיקים" />

                <label>לא עם</label>
                <input type="text" value={Array.isArray(form.avoidWith)?form.avoidWith.join(", "):form.avoidWith||""}
                       onChange={e=>setForm(f=>({ ...f, avoidWith:e.target.value }))} placeholder="שמות מופרדים בפסיקים" />
              </div>

              <div style={{marginTop:16, display:"flex", gap:8, justifyContent:"flex-start"}}>
                <button type="submit" className="btn primary">שמור</button>
                <button type="button" className="btn ghost" onClick={()=>setModalOpen(false)}>בטל</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* סגנון כפתורים קטן */}
      <style>{`
        .btn{padding:6px 10px;border-radius:10px;border:1px solid #24324a;background:#0b1220;color:#e8eefc;cursor:pointer}
        .btn:hover{filter:brightness(1.1)}
        .btn.primary{background:#2575fc;border-color:#2575fc}
        .btn.danger{background:#ff5c7a;border-color:#ff5c7a}
        .btn.ghost{background:transparent}
        thead tr{background:#105340;color:#e8eefc}
        th, td{font-size:14px}
      `}</style>
    </div>
  );
}

function HeaderBar({ activeCount, showActiveOnly, setShowActiveOnly, onAdd }){
  return (
    <div style={{display:"flex", alignItems:"center", gap:12, justifyContent:"space-between", margin:"0 0 10px"}}>
      <div style={{display:"flex", alignItems:"center", gap:12}}>
        <button className="btn primary" onClick={onAdd}>הוסף שחקן</button>
        <label style={{display:"inline-flex", alignItems:"center", gap:6}}>
          <input type="checkbox" checked={showActiveOnly} onChange={e=>setShowActiveOnly(e.target.checked)} />
          הצג פעילים בלבד
        </label>
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

const modalWrap = {
  position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"grid", placeItems

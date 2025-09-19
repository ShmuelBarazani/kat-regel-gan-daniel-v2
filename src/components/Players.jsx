import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadPlayers, savePlayers, debounce } from "../lib/storage";

const POSITIONS = ["GK","DF","MF","FW"];
const RATINGS = Array.from({length:19},(_,i)=> (1 + i*0.5).toFixed(1));

function normalizePos(pos){
  if(!pos) return "MF";
  const p = String(pos).toUpperCase();
  return ["GK","DF","MF","FW"].includes(p) ? p : "MF";
}

export default function Players(){
  const [players,setPlayers]=useState([]);
  const [form,setForm]=useState({name:"",pos:"MF",rating:"6.0"});
  const [notice,setNotice]=useState(null);
  const fileRef = useRef(null);
  const [importMode,setImportMode] = useState("replace");

  // --- טעינה ראשונית מ-GitHub דרך /api/read (נמצא בsrc/lib/storage.js)
  useEffect(()=>{
    (async ()=>{
      const list = await loadPlayers();
      const withIds = list.map(p => ({
        id: p.id ?? crypto.randomUUID(),
        name: String(p.name||"").trim(),
        pos: normalizePos(p.pos),
        rating: Number(p.rating ?? p.r ?? 0)
      }));
      setPlayers(withIds);
      setNotice({type:"ok", msg:`נטענו ${withIds.length} שחקנים`});
    })();
  },[]);

  // --- שמירה אוטומטית (debounce)
  const autoSave = useMemo(()=> debounce(async (arr)=>{
    await savePlayers(arr, "auto: players update");
  }, 800),[]);
  useEffect(()=>{ if(players) autoSave(players); },[players, autoSave]);

  const avg = useMemo(()=>{
    if(!players.length) return 0;
    return (players.reduce((s,x)=>s+Number(x.rating||0),0)/players.length).toFixed(2);
  },[players]);

  const addPlayer=()=>{
    const name=form.name.trim();
    if(!name){
      setNotice({type:"warn", msg:"כתוב שם שחקן לפני הוספה"});
      return;
    }
    setPlayers(p=>[...p,{id:crypto.randomUUID(), name, pos:form.pos, rating:+form.rating}]);
    setForm({name:"",pos:"MF",rating:"6.0"});
  };
  const removePlayer=(id)=> setPlayers(p=>p.filter(x=>x.id!==id));

  // ייצוא/ייבוא מקובץ (אופציונלי)
  const exportJson=()=>{
    const blob = new Blob([JSON.stringify(players, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `players.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const onPickFile=()=> fileRef.current?.click();
  const onImportFile=async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    try{
      const text = await f.text();
      const data = JSON.parse(text);
      const list = (Array.isArray(data)? data : (Array.isArray(data.players)? data.players: []))
        .map(p=>({ id: p.id ?? crypto.randomUUID(), name: String(p.name||"").trim(),
                   pos: normalizePos(p.pos), rating: typeof p.rating==="number" ? p.rating : Number(p.r)||0,
                   selected: !!p.selected, prefer: p.prefer||[], avoid: p.avoid||[] }));
      if(!list.length) throw new Error("no valid players");
      setPlayers(prev => importMode==="replace" ? list : mergeByName(prev, list));
      setNotice({type:"ok", msg:`ייבוא: ${list.length} שחקנים (${importMode==="replace"?"החלפה":"מיזוג"})`});
    }catch(err){
      console.error(err);
      setNotice({type:"err", msg:"ייבוא נכשל — ודא JSON תקין"});
    }finally{
      e.target.value="";
    }
  };

  return (
    <div className="grid gap-4">
      {notice && (
        <div className={`border rounded-xl px-3 py-2 text-sm ${notice.type==="ok" ? "border-emerald-400 text-emerald-300" :
          notice.type==="warn" ? "border-amber-400 text-amber-300" : "border-rose-400 text-rose-300"}`}>
          {notice.msg}
        </div>
      )}

      <div className="card">
        <div className="card-title">הוספת שחקן</div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
          <button className="btn btn-success" onClick={addPlayer}>הוסף</button>
          <select className="input" value={form.rating} onChange={e=>setForm(f=>({...f,rating:e.target.value}))}>
            {RATINGS.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <select className="input" value={form.pos} onChange={e=>setForm(f=>({...f,pos:e.target.value}))}>
            {POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <input className="input" placeholder="שם שחקן"
                 value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          <div className="tag">ממוצע דירוג {avg}</div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <div className="card-title">סגל שחקנים</div>
          <div className="flex flex-wrap gap-2 items-center">
            <button className="btn" onClick={exportJson}>ייצוא JSON</button>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onImportFile}/>
            <button className="btn btn-primary" onClick={onPickFile}>ייבוא מקובץ…</button>
            <label className="text-xs flex items-center gap-2">
              מצב ייבוא:
              <select className="input" value={importMode} onChange={e=>setImportMode(e.target.value)}>
                <option value="replace">החלפה</option>
                <option value="merge">מיזוג</option>
              </select>
            </label>
          </div>
        </div>

        <table className="table text-sm">
          <thead><tr><th>שם</th><th>תפקיד</th><th>דירוג</th><th className="text-left">פעולות</th></tr></thead>
          <tbody>
            {players.map(p=>(
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.pos}</td><td>{p.rating}</td>
                <td className="text-left">
                  <button className="btn btn-danger" onClick={()=>removePlayer(p.id)}>מחק</button>
                </td>
              </tr>
            ))}
            {!players.length && <tr><td colSpan={4} className="text-center text-slate-400 py-8">אין שחקנים עדיין</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function mergeByName(baseList, incoming){
  const map = new Map();
  baseList.forEach(p=> map.set(p.name.trim(), p));
  incoming.forEach(p=> map.set(p.name.trim(), p));
  return Array.from(map.values());
}

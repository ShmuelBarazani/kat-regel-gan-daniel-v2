import React, { useEffect, useMemo, useState } from "react";

const LS_CYCLES = "krgd_v2_cycles";

export default function SavedCycles(){
  const [cycles,setCycles]=useState([]);
  const [checked,setChecked]=useState({});

  useEffect(()=>{
    const saved = localStorage.getItem(LS_CYCLES);
    if(saved) setCycles(JSON.parse(saved));
  },[]);

  const allChecked = useMemo(()=>{
    if(!cycles.length) return false;
    return cycles.every(c=>checked[c.id]);
  },[cycles,checked]);

  const toggleAll = ()=>{
    if(allChecked){
      setChecked({});
    }else{
      const map={}; cycles.forEach(c=>map[c.id]=true);
      setChecked(map);
    }
  };

  const removeSelected = ()=>{
    const left = cycles.filter(c=>!checked[c.id]);
    setCycles(left);
    localStorage.setItem(LS_CYCLES, JSON.stringify(left));
    setChecked({});
  };

  const removeOne = (id)=>{
    const left = cycles.filter(c=>c.id!==id);
    setCycles(left);
    localStorage.setItem(LS_CYCLES, JSON.stringify(left));
    const cp={...checked}; delete cp[id]; setChecked(cp);
  };

  return (
    <div className="grid gap-4">
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="card-title">מחזורים שמורים</div>
          <div className="flex items-center gap-2">
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={allChecked} onChange={toggleAll}/>
              סמן הכל / בטל
            </label>
            <button className="btn btn-danger" onClick={removeSelected}>מחק נבחרים</button>
          </div>
        </div>

        <table className="table text-sm">
          <thead><tr><th style={{width:"3rem"}}>✔</th><th>זמן שמירה</th><th>קבוצות</th><th className="text-left">פעולות</th></tr></thead>
          <tbody>
            {cycles.map(c=>(
              <tr key={c.id}>
                <td><input type="checkbox" checked={!!checked[c.id]}
                           onChange={e=> setChecked(x=>({...x,[c.id]:e.target.checked}))}/></td>
                <td dir="ltr">{new Date(c.time).toLocaleString()}</td>
                <td className="text-slate-300">
                  {Object.keys(c.teams).map(t=>(<span key={t} className="tag" style={{marginInlineEnd:6}}>{t}: {c.teams[t].length}</span>))}
                </td>
                <td className="text-left">
                  <button className="btn btn-danger" onClick={()=>removeOne(c.id)}>מחק</button>
                </td>
              </tr>
            ))}
            {!cycles.length && <tr><td colSpan={4} className="text-center text-slate-400 py-6">אין מחזורים שמורים</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// src/components/Players.jsx
import React, { useMemo, useState } from "react";
import { useStorage, POS } from "../lib/storage.js";
import PlayerFormModal from "./PlayerFormModal.jsx";
import LinkPickerModal from "./LinkPickerModal.jsx";

const COLS = [
  { key: "active",   label: "משחק?" },
  { key: "name",     label: "שם" },
  { key: "pos",      label: "עמדה" },
  { key: "rating",   label: "ציון" },
  { key: "mustWith", label: "חייב עם" },
  { key: "avoidWith",label: "לא עם" },
  { key: "actions",  label: "פעולות" },
];

export default function Players({ embedded=false }) {
  const { players, setPlayers } = useStorage();
  const [showAdd, setShowAdd] = useState(false);
  const [sort, setSort] = useState({ key:"rating", dir:"desc" });

  const normalized = useMemo(()=>players.map(p=>({
    ...p,
    mustWith: p.mustWith ?? p.prefer ?? [],
    avoidWith: p.avoidWith ?? p.avoid ?? [],
  })), [players]);

  const options = useMemo(()=>normalized.map(p=>({id:String(p.id),name:p.name})),[normalized]);
  const idToName = useMemo(()=> {
    const m = new Map(options.map(o=>[o.id,o.name]));
    return id => m.get(String(id)) || String(id);
  }, [options]);

  const [picker, setPicker] = useState(null);
  const openPicker = (player, field) => {
    const initial = (player[field] ?? (field==="mustWith"?player.prefer:player.avoid) ?? []).map(String);
    setPicker({ playerId: player.id, field, value: initial });
  };
  const handlePickerSave = (vals) => {
    const { playerId, field } = picker;
    const patch = { [field]: vals };
    if (field==="mustWith") patch.prefer = vals; else patch.avoid = vals;
    setPlayers(prev => prev.map(p => p.id===playerId ? ({...p, ...patch}) : p));
    setPicker(null);
  };

  const flipSort = (key) => setSort(s => s.key===key ? ({key, dir:s.dir==="asc"?"desc":"asc"}) : ({key, dir:"asc"}));
  const sorted = useMemo(()=>{
    const arr = normalized.slice();
    arr.sort((a,b)=>{
      const k = sort.key;
      let va = k==="mustWith"||k==="avoidWith" ? (a[k]?.length||0) : (k==="name"||k==="pos"?String(a[k]||""):a[k]);
      let vb = k==="mustWith"||k==="avoidWith" ? (b[k]?.length||0) : (k==="name"||k==="pos"?String(b[k]||""):b[k]);
      if (typeof va==="string" && typeof vb==="string") {
        const cmp = va.localeCompare(vb,"he");
        return sort.dir==="asc"?cmp:-cmp;
      } else {
        const cmp = Number(va) - Number(vb);
        return sort.dir==="asc"?cmp:-cmp;
      }
    });
    return arr;
  }, [normalized, sort]);

  const update = (id, patch) => setPlayers(prev => prev.map(p => p.id===id ? ({...p, ...patch}) : p));
  const remove  = (id) => setPlayers(prev => prev.filter(p => p.id!==id));

  const chips = (ids=[]) =>
    ids.length ? ids.map(x => <span key={x} className="chip">{idToName(x)}</span>) :
    <span className="chip chip-empty">—</span>;

  return (
    <div className={embedded ? "players-embed-root" : "players-page container"} dir="rtl">
      {!embedded && (
        <div className="toolbar players-toolbar">
          <button className="btn primary" onClick={()=>setShowAdd(true)}>הוסף שחקן</button>
        </div>
      )}

      <div className={embedded ? "table-scroll" : "table-wrapper"}>
        <table className="players-table">
          <colgroup>
            <col className="col-active" />
            <col className="col-name" />
            <col className="col-pos" />
            <col className="col-rating" />
            <col className="col-must" />
            <col className="col-avoid" />
            <col className="col-actions" />
          </colgroup>
          <thead>
            <tr>
              {COLS.map(c=>(
                <th key={c.key}
                    onClick={()=>!["actions"].includes(c.key)&&flipSort(c.key)}
                    style={{cursor: !["actions"].includes(c.key) ? "pointer":"default"}}>
                  {c.label}{sort.key===c.key ? (sort.dir==="asc"?" ▲":" ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(p=>(
              <tr key={p.id}>
                <td><input type="checkbox" checked={!!p.active} onChange={e=>update(p.id,{active:e.target.checked})}/></td>
                <td className="nowrap">
                  <input className="input input-name" value={p.name} onChange={e=>update(p.id,{name:e.target.value})}/>
                </td>
                <td>
                  <select value={p.pos} onChange={e=>update(p.id,{pos:e.target.value})}>
                    {POS.map(op=><option key={op} value={op}>{op}</option>)}
                  </select>
                </td>
                <td>
                  <input type="number" className="input input-rating" step="0.1" min="1" max="10"
                         value={p.rating} onChange={e=>update(p.id,{rating:Number(e.target.value)})}/>
                </td>
                <td className="nowrap">
                  <div className="chips-row">
                    <div className="chips flex-1">{chips(p.mustWith)}</div>
                    <button className="btn small" onClick={()=>openPicker(p,"mustWith")}>ערוך</button>
                  </div>
                </td>
                <td className="nowrap">
                  <div className="chips-row">
                    <div className="chips flex-1">{chips(p.avoidWith)}</div>
                    <button className="btn small" onClick={()=>openPicker(p,"avoidWith")}>ערוך</button>
                  </div>
                </td>
                <td><button className="btn danger" onClick={()=>remove(p.id)}>מחיקה</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <PlayerFormModal
          players={normalized}
          onClose={()=>setShowAdd(false)}
          onSave={(np)=>{ setPlayers(prev=>[np,...prev]); setShowAdd(false); }}
        />
      )}
      {picker && (
        <LinkPickerModal
          title={picker.field==="mustWith"?'בחר "חייב עם"':'בחר "לא עם"'}
          options={options.filter(o=>o.id!==String(picker.playerId))}
          value={picker.value}
          onSave={vals=>handlePickerSave(vals)}
          onClose={()=>setPicker(null)}
        />
      )}
    </div>
  );
}

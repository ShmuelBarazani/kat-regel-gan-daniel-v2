// src/components/Players.jsx
import React, { useMemo, useState } from "react";
import { useStorage, POS } from "../lib/storage.js";
import PlayerFormModal from "./PlayerFormModal.jsx";

const COLS = [
  { key: "actions",  label: "פעולות" },
  { key: "mustWith", label: "חייב עם" },
  { key: "avoidWith",label: "לא עם" },
  { key: "rating",   label: "ציון" },
  { key: "pos",      label: "עמדה" },
  { key: "name",     label: "שם" },
  { key: "active",   label: "משחק?" },
];

export default function Players({ embedded = false }) {
  const { players, setPlayers } = useStorage();
  const [showAdd, setShowAdd] = useState(false);
  const [sort, setSort] = useState({ key: "rating", dir: "desc" });

  // לשמירה לאחור (קבצי JSON ישנים: prefer/avoid)
  const normalised = useMemo(
    () => players.map(p => ({
      ...p,
      mustWith: p.mustWith ?? p.prefer ?? [],
      avoidWith: p.avoidWith ?? p.avoid ?? [],
    })),
    [players]
  );

  const options = useMemo(
    () => normalised.map(p => ({ id: String(p.id), name: p.name })),
    [normalised]
  );

  const sortedPlayers = useMemo(() => {
    const arr = normalised.slice();
    arr.sort((a,b)=>{
      const k=sort.key;
      let va = k==="mustWith"||k==="avoidWith" ? (a[k]?.length||0)
            : k==="name"||k==="pos" ? String(a[k]||"")
            : a[k];
      let vb = k==="mustWith"||k==="avoidWith" ? (b[k]?.length||0)
            : k==="name"||k==="pos" ? String(b[k]||"")
            : b[k];
      if(typeof va==="string" && typeof vb==="string"){
        const cmp = va.localeCompare(vb,"he"); return sort.dir==="asc"?cmp:-cmp;
      }else{
        const cmp = Number(va)-Number(vb); return sort.dir==="asc"?cmp:-cmp;
      }
    });
    return arr;
  }, [normalised, sort]);

  const flipSort = (key) =>
    setSort(s => s.key===key ? ({key, dir: s.dir==="asc"?"desc":"asc"}) : ({key, dir:"asc"}));

  const updatePlayer = (id, patch) =>
    setPlayers(prev => prev.map(p =>
      p.id === id ? ({ ...p, ...patch,
        // התאמה לאחור
        prefer: patch.mustWith ?? p.prefer,
        avoid:  patch.avoidWith ?? p.avoid
      }) : p
    ));

  const removePlayer = (id) =>
    setPlayers(prev => prev.filter(p => p.id !== id));

  const listWithoutSelf = (selfId) => options.filter(o => o.id !== String(selfId));
  const updateMulti = (player, field, e) => {
    const vals = Array.from(e.target.selectedOptions, o => String(o.value));
    updatePlayer(player.id, { [field]: vals });
  };

  return (
    <div className={embedded ? "players-embed-root" : "players-page"} dir="rtl">
      <div className="toolbar players-toolbar">
        <button className="btn primary" onClick={() => setShowAdd(true)}>הוסף שחקן</button>
      </div>

      <div className={embedded ? "table-scroll" : "table-wrapper"}>
        <table className="players-table">
          <thead>
            <tr>
              {COLS.map(c => (
                <th
                  key={c.key}
                  onClick={()=>c.key!=="actions" && flipSort(c.key)}
                  style={{cursor: c.key!=="actions" ? "pointer" : "default"}}
                >
                  {c.label}{sort.key===c.key ? (sort.dir==="asc" ? " ▲":" ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map(p => (
              <tr key={p.id}>
                <td><button className="btn danger" onClick={()=>removePlayer(p.id)}>מחיקה</button></td>

                <td className="nowrap">
                  <select multiple size={4} className="multi"
                          value={(p.mustWith||[]).map(String)}
                          onChange={(e)=>updateMulti(p,"mustWith",e)}>
                    {listWithoutSelf(p.id).map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </td>

                <td className="nowrap">
                  <select multiple size={4} className="multi"
                          value={(p.avoidWith||[]).map(String)}
                          onChange={(e)=>updateMulti(p,"avoidWith",e)}>
                    {listWithoutSelf(p.id).map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </td>

                <td>
                  <input type="number" className="input" step="0.1" min="1" max="10"
                         value={p.rating}
                         onChange={e => updatePlayer(p.id, {rating: Number(e.target.value)})}/>
                </td>

                <td>
                  <select value={p.pos} onChange={e => updatePlayer(p.id, {pos: e.target.value})}>
                    {POS.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                </td>

                <td><input className="input"
                           value={p.name}
                           onChange={e => updatePlayer(p.id, {name: e.target.value})}/></td>

                <td><input type="checkbox" checked={!!p.active}
                           onChange={e => updatePlayer(p.id, {active: e.target.checked})}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <PlayerFormModal
          players={normalised}
          onClose={() => setShowAdd(false)}
          onSave={(np)=>{ setPlayers(prev=>[{...np}, ...prev]); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

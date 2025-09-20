// src/components/Players.jsx
import React, { useMemo, useState } from "react";
import { useStorage, POS } from "../lib/storage.js";
import PlayerFormModal from "./PlayerFormModal.jsx";
import LinkPickerModal from "./LinkPickerModal.jsx";

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

  // נורמליזציה לשדות ההיסטוריים (prefer/avoid)
  const normalized = useMemo(
    () => players.map(p => ({
      ...p,
      mustWith: p.mustWith ?? p.prefer ?? [],
      avoidWith: p.avoidWith ?? p.avoid ?? [],
    })),
    [players]
  );

  const options = useMemo(
    () => normalized.map(p => ({ id: String(p.id), name: p.name })),
    [normalized]
  );

  const idToName = useMemo(() => {
    const m = new Map(options.map(o => [o.id, o.name]));
    return (id) => m.get(String(id)) || String(id);
  }, [options]);

  const [picker, setPicker] = useState(null);
  // picker = { playerId, field:'mustWith'|'avoidWith', value:[ids] }

  const openPicker = (player, field) => {
    const initial =
      (player[field] ??
       (field === "mustWith" ? player.prefer : player.avoid) ??
       []).map(String);

    setPicker({
      playerId: player.id,
      field,
      value: initial,
    });
  };

  const handlePickerSave = (vals) => {
    const { playerId, field } = picker;
    const patch = { [field]: vals };
    // תאימות לאחור לשדות הישנים
    if (field === "mustWith") patch.prefer = vals;
    else patch.avoid = vals;

    setPlayers(prev => prev.map(p => p.id === playerId ? ({ ...p, ...patch }) : p));
    setPicker(null);
  };

  const flipSort = (key) =>
    setSort(s => s.key===key ? ({key, dir: s.dir==="asc"?"desc":"asc"}) : ({key, dir:"asc"}));

  const sortedPlayers = useMemo(() => {
    const arr = normalized.slice();
    arr.sort((a,b)=>{
      const k=sort.key;
      let va = k==="mustWith"||k==="avoidWith" ? (a[k]?.length||0)
            : k==="name"||k==="pos" ? String(a[k]||"")
            : a[k];
      let vb = k==="mustWith"||k==="avoidWith" ? (b[k]?.length||0)
            : k==="name"||k==="pos" ? String(b[k]||"")
            : b[k];
      if(typeof va==="string" && typeof vb==="string"){
        const cmp = va.localeCompare(vb,"he");
        return sort.dir==="asc"?cmp:-cmp;
      }else{
        const cmp = Number(va)-Number(vb);
        return sort.dir==="asc"?cmp:-cmp;
      }
    });
    return arr;
  }, [normalized, sort]);

  const updatePlayer = (id, patch) =>
    setPlayers(prev => prev.map(p => p.id === id ? ({ ...p, ...patch }) : p));

  const removePlayer = (id) =>
    setPlayers(prev => prev.filter(p => p.id !== id));

  const namesChips = (ids=[]) => (
    <div className="chips">
      {ids.length
        ? ids.map(x => <span key={x} className="chip">{idToName(x)}</span>)
        : <span className="chip chip-empty">—</span>
      }
    </div>
  );

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
                <td>
                  <button className="btn danger" onClick={()=>removePlayer(p.id)}>מחיקה</button>
                </td>

                <td className="nowrap">
                  {namesChips(p.mustWith)}
                  <button className="btn small cell-btn" onClick={()=>openPicker(p,"mustWith")}>ערוך</button>
                </td>

                <td className="nowrap">
                  {namesChips(p.avoidWith)}
                  <button className="btn small cell-btn" onClick={()=>openPicker(p,"avoidWith")}>ערוך</button>
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

                <td>
                  <input className="input"
                         value={p.name}
                         onChange={e => updatePlayer(p.id, {name: e.target.value})}/>
                </td>

                <td>
                  <input type="checkbox" checked={!!p.active}
                         onChange={e => updatePlayer(p.id, {active: e.target.checked})}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <PlayerFormModal
          players={normalized}
          onClose={() => setShowAdd(false)}
          onSave={(np)=>{ 
            // תאימות לשדות הישנים
            const x = { ...np, prefer: np.mustWith, avoid: np.avoidWith };
            setPlayers(prev=>[x, ...prev]);
            setShowAdd(false);
          }}
        />
      )}

      {picker && (
        <LinkPickerModal
          title={picker.field === "mustWith" ? 'בחר "חייב עם"' : 'בחר "לא עם"'}
          options={options.filter(o => o.id !== String(picker.playerId))} // לא מציגים את עצמו
          value={picker.value}
          onClose={() => setPicker(null)}
          onSave={handlePickerSave}
        />
      )}
    </div>
  );
}

// src/components/PlayerFormModal.jsx
import React, { useMemo, useState } from "react";
import { POS } from "../lib/storage.js";

export default function PlayerFormModal({ players, onClose, onSave }) {
  const [name, setName] = useState("");
  const [pos, setPos] = useState(POS[1] || "MF");
  const [rating, setRating] = useState(6.5);
  const [active, setActive] = useState(true);
  const [mustWith, setMustWith] = useState([]);
  const [avoidWith, setAvoidWith] = useState([]);

  const options = useMemo(() => players.map(p => ({ id:String(p.id), name:p.name })), [players]);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("חסר שם שחקן");
    const newPlayer = {
      id: crypto.randomUUID(),
      name: name.trim(),
      pos, rating: Number(rating), active,
      mustWith, avoidWith,
      prefer: mustWith,  // תאימות לאחור
      avoid: avoidWith
    };
    onSave(newPlayer);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal modal-compact" dir="rtl" onClick={(e)=>e.stopPropagation()}>
        <h3 style={{marginBottom: 10}}>שחקן חדש</h3>
        <form onSubmit={submit} className="grid gap-compact">
          {/* שורה 1 – שם (מלא) */}
          <label className="col-span-2">שם
            <input className="input" value={name} onChange={e=>setName(e.target.value)} />
          </label>

          {/* שורה 2 – עמדה / ציון / משחק */}
          <label>עמדה
            <select value={pos} onChange={e=>setPos(e.target.value)}>
              {POS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>

          <label>ציון
            <input type="number" step="0.1" min="1" max="10"
                   className="input" value={rating}
                   onChange={e=>setRating(e.target.value)} />
          </label>

          <label className="row-compact">משחק?
            <input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} />
          </label>

          {/* שורה 3 – שתי רשימות זו לצד זו */}
          <div className="row-col">
            <label>חייב עם</label>
            <select multiple size={7} className="multi compact"
                    value={mustWith}
                    onChange={(e)=>setMustWith(Array.from(e.target.selectedOptions,o=>o.value))}>
              {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          <div className="row-col">
            <label>לא עם</label>
            <select multiple size={7} className="multi compact"
                    value={avoidWith}
                    onChange={(e)=>setAvoidWith(Array.from(e.target.selectedOptions,o=>o.value))}>
              {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          <div className="modal-actions col-span-2">
            <button type="button" className="btn" onClick={onClose}>ביטול</button>
            <button type="submit" className="btn primary">שמירה</button>
          </div>
        </form>
      </div>
    </div>
  );
}

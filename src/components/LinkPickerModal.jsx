// src/components/LinkPickerModal.jsx
import React, { useMemo, useState } from "react";

export default function LinkPickerModal({ title, options, value, onSave, onClose }) {
  const [selected, setSelected] = useState(new Set((value||[]).map(String)));
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () => options.filter(o => o.name.includes(q)),
    [options, q]
  );

  const toggle = (id) => {
    const nx = new Set(selected);
    nx.has(id) ? nx.delete(id) : nx.add(id);
    setSelected(nx);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" dir="rtl" onClick={e=>e.stopPropagation()}>
        <h3>{title}</h3>
        <input className="input" placeholder="חפש..." value={q} onChange={e=>setQ(e.target.value)} />
        <div className="list-scroll">
          {filtered.map(o => (
            <label key={o.id} className="row-check">
              <input type="checkbox" checked={selected.has(String(o.id))} onChange={()=>toggle(String(o.id))}/>
              <span>{o.name}</span>
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>ביטול</button>
          <button className="btn primary" onClick={()=>onSave(Array.from(selected))}>שמירה</button>
        </div>
      </div>
    </div>
  );
}

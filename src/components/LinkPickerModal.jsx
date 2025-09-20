// src/components/LinkPickerModal.jsx
import React, { useMemo, useState } from "react";

export default function LinkPickerModal({
  title = "בחירת שחקנים",
  options = [],           // [{id, name}]
  value = [],             // ["id","id",...]
  onSave,
  onClose,
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(() => new Set(value.map(String)));

  const filtered = useMemo(() => {
    const s = (q || "").trim();
    if (!s) return options;
    return options.filter(o => o.name.includes(s));
  }, [q, options]);

  const toggle = (id) => {
    const s = new Set(sel);
    s.has(id) ? s.delete(id) : s.add(id);
    setSel(s);
  };

  const save = () => onSave([...sel]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" dir="rtl" onClick={(e)=>e.stopPropagation()}>
        <h3 style={{marginBottom: 8}}>{title}</h3>

        <input
          className="input picker-search"
          placeholder="חיפוש…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />

        <div className="picker-list">
          {filtered.map(o => (
            <label key={o.id} className="picker-item">
              <input
                type="checkbox"
                checked={sel.has(o.id)}
                onChange={() => toggle(o.id)}
              />
              <span>{o.name}</span>
            </label>
          ))}
          {!filtered.length && <div style={{opacity:.7}}>לא נמצאו שחקנים תואמים</div>}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>ביטול</button>
          <button className="btn primary" onClick={save}>שמירה</button>
        </div>
      </div>
    </div>
  );
}

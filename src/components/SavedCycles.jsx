// src/components/SavedCycles.jsx
import React, { useMemo, useState } from "react";
import { useStorage } from "../lib/storage.js";

export default function SavedCycles(){
  const { getCycles, removeCycles } = useStorage();
  const [list, setList] = useState(getCycles());
  const [sel, setSel] = useState(new Set());

  const toggle = (id) => {
    const nx = new Set(sel);
    nx.has(id) ? nx.delete(id) : nx.add(id);
    setSel(nx);
  };

  const allIds = useMemo(()=>list.map(x=>x.id),[list]);
  const toggleAll = () => {
    setSel(sel.size===list.length ? new Set() : new Set(allIds));
  };

  const removeSel = () => {
    if (!sel.size) return;
    if (!confirm(`למחוק ${sel.size} מחזורים?`)) return;
    removeCycles(Array.from(sel));
    const fresh = getCycles();
    setList(fresh);
    setSel(new Set());
  };

  return (
    <div className="container" dir="rtl">
      <div className="toolbar">
        <button className="btn" onClick={toggleAll}>סמן הכל/בטל</button>
        <button className="btn danger" onClick={removeSel}>מחק נבחרים ({sel.size})</button>
      </div>

      <div className="table-wrapper">
        <table className="players-table">
          <thead>
            <tr>
              <th>בחר</th>
              <th>תאריך</th>
              <th>קבוצות</th>
              <th>שחקנים פעילים</th>
            </tr>
          </thead>
          <tbody>
            {list.map(c=>(
              <tr key={c.id}>
                <td><input type="checkbox" checked={sel.has(c.id)} onChange={()=>toggle(c.id)}/></td>
                <td>{new Date(c.date).toLocaleString("he-IL")}</td>
                <td>{c.teamCount}</td>
                <td>{c.snapshot?.length ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

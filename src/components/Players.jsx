// src/components/Players.jsx
import React, { useMemo, useState } from "react";
import { useStorage } from "../lib/storage.js";

const COLUMNS = [
  { key: "active", label: "משחק?", width: 80, sortable: true },
  { key: "name", label: "שם", width: 240, sortable: true },
  { key: "pos", label: "עמדה", width: 90, sortable: true },
  { key: "rating", label: "ציון", width: 90, sortable: true },
  { key: "mustWith", label: "חייב עם", width: 220, sortable: true },
  { key: "avoidWith", label: "לא עם", width: 220, sortable: true },
];

export default function Players() {
  const { players, setPlayers, hiddenRatings } = useStorage();
  const [sort, setSort] = useState({ key: "name", dir: "asc" });

  const sorted = useMemo(() => {
    const arr = [...players];
    const { key, dir } = sort;
    arr.sort((a, b) => {
      let va = a[key], vb = b[key];
      if (key === "mustWith" || key === "avoidWith") { va = (va || []).join(", "); vb = (vb || []).join(", "); }
      if (key === "active") { va = a.active ? 1 : 0; vb = b.active ? 1 : 0; }
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [players, sort]);

  function patch(id, p) { setPlayers(prev => prev.map(x => x.id === id ? { ...x, ...p } : x)); }
  function toggleActive(id) { const p = players.find(x => x.id === id); if (p) patch(id, { active: !p.active }); }
  function onHeader(colKey) {
    const c = COLUMNS.find(c => c.key === colKey);
    if (!c?.sortable) return;
    setSort(s => ({ key: colKey, dir: s.key === colKey && s.dir === "asc" ? "desc" : "asc" }));
  }
  function editList(id, field) {
    const p = players.find(x => x.id === id);
    const val = (p?.[field] || []).join(", ");
    const next = window.prompt(field === "mustWith" ? "ערוך 'חייב עם' (מופרד בפסיקים)" : "ערוך 'לא עם' (מופרד בפסיקים)", val);
    if (next === null) return;
    const list = next.split(",").map(s => s.trim()).filter(Boolean);
    patch(id, { [field]: list });
  }
  function addPlayer() {
    const name = window.prompt("שם שחקן חדש:");
    if (!name) return;
    const pos = (window.prompt("עמדה GK/DF/MF/FW:", "MF") || "MF").toUpperCase();
    const rating = parseFloat(window.prompt("ציון (1–10, כולל חצאים):", "6.5") || "6.5") || 6.5;
    setPlayers(prev => [...prev, {
      id: crypto.randomUUID(),
      name: name.trim(),
      pos: ["GK","DF","MF","FW"].includes(pos) ? pos : "MF",
      rating: Math.max(1, Math.min(10, rating)),
      active: false,
      mustWith: [], avoidWith: [],
    }]);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>שחקנים</h2>
        <div className="actions">
          <button className="btn" onClick={addPlayer}>הוסף שחקן</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              {COLUMNS.map(c => (
                <th key={c.key} style={{ width: c.width }} className={c.sortable ? "sortable" : ""} onClick={() => onHeader(c.key)}>
                  <div className="th-flex">
                    <span>{c.label}</span>
                    {sort.key === c.key && <span className="arrow">{sort.dir === "asc" ? "▲" : "▼"}</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length ? sorted.map(p => (
              <tr key={p.id}>
                <td className="center">
                  <input type="checkbox" checked={!!p.active} onChange={() => toggleActive(p.id)} />
                </td>
                <td><input className="inp" value={p.name} onChange={e => patch(p.id, { name: e.target.value })} /></td>
                <td>
                  <select className="inp" value={p.pos} onChange={e => patch(p.id, { pos: e.target.value })}>
                    <option>GK</option><option>DF</option><option>MF</option><option>FW</option>
                  </select>
                </td>
                <td>
                  {hiddenRatings ? <span className="muted">—</span> : (
                    <input className="inp" type="number" step={0.5} min={1} max={10}
                      value={p.rating} onChange={e => patch(p.id, { rating: Number(e.target.value) })} />
                  )}
                </td>
                <td>
                  <div className="cell-tags">
                    <Tags items={p.mustWith} />
                    <button className="pill" onClick={() => editList(p.id,"mustWith")}>ערוך</button>
                  </div>
                </td>
                <td>
                  <div className="cell-tags">
                    <Tags items={p.avoidWith} />
                    <button className="pill warn" onClick={() => editList(p.id,"avoidWith")}>ערוך</button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td className="center muted" colSpan={COLUMNS.length}>אין שחקנים</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Tags({ items }) {
  if (!items?.length) return <span className="muted">—</span>;
  return <span className="chips">{items.map(x => <span className="chip" key={x}>{x}</span>)}</span>;
}

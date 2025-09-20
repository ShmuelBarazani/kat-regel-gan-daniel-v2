// src/components/Admin.jsx
import React, { useEffect, useState } from "react";
import { getRounds, setRounds } from "../lib/storage";

export default function Admin() {
  const [rounds, setLocal] = useState(getRounds());
  const [checked, setChecked] = useState({});

  useEffect(() => setRounds(rounds), [rounds]);

  const toggle = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const all = rounds.length && rounds.every(r => !!checked[r.id]);
  const toggleAll = () => {
    const val = !all;
    const map = {};
    rounds.forEach(r => map[r.id] = val);
    setChecked(map);
  };

  const removeSelected = () => {
    const keep = rounds.filter(r => !checked[r.id]);
    setLocal(keep);
    setChecked({});
  };

  return (
    <section className="page admin" dir="rtl">
      <div className="toolbar">
        <h1 className="page-title">קטרגל גן-דניאל ⚙️ מנהל</h1>
        <div className="spacer" />
        <button className="btn" onClick={toggleAll}>
          {all ? "בטל סימון הכל" : "סמן הכל"}
        </button>
        <button className="btn danger" onClick={removeSelected}>
          מחק נבחרים ({Object.values(checked).filter(Boolean).length})
        </button>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:80}}>בחר</th>
              <th>תאריך</th>
              <th style={{width:180}}>קבוצות</th>
              <th style={{width:180}}>שחקנים פעילים</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map(r => (
              <tr key={r.id}>
                <td className="center">
                  <input
                    type="checkbox"
                    checked={!!checked[r.id]}
                    onChange={() => toggle(r.id)}
                  />
                </td>
                <td>{new Date(r.at).toLocaleString("he-IL")}</td>
                <td className="center">{r.teamCount}</td>
                <td className="center">{r.activeCount}</td>
              </tr>
            ))}
            {!rounds.length && (
              <tr><td colSpan={4} className="center muted">אין מחזורים שמורים עדיין</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

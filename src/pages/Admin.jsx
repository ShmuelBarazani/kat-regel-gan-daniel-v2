// src/pages/Admin.jsx
import React, { useEffect, useState } from "react";

const ROUNDS_KEY = "rounds_store_v1";

export default function Admin() {
  const [rounds, setRounds] = useState([]);
  const [checked, setChecked] = useState(new Set());

  function load() {
    try {
      const arr = JSON.parse(localStorage.getItem(ROUNDS_KEY) || "[]");
      setRounds(Array.isArray(arr) ? arr : []);
    } catch {
      setRounds([]);
    }
  }
  useEffect(() => { load(); }, []);

  function toggleCheck(id) {
    const next = new Set(checked);
    next.has(id) ? next.delete(id) : next.add(id);
    setChecked(next);
  }
  function removeSelected() {
    const left = rounds.filter((r) => !checked.has(r.id));
    localStorage.setItem(ROUNDS_KEY, JSON.stringify(left));
    setChecked(new Set());
    setRounds(left);
  }
  function openRound(r) {
    alert(`פתיחת מחזור בתצוגה בלבד:\nתאריך: ${new Date(r.createdAt).toLocaleString('he-IL')}\nקבוצות: ${r.teamsCount}\nשחקנים: ${r.playersCount}`);
  }

  return (
    <div className="page" style={{ padding:"16px 12px" }}>
      <header style={{ display:"flex", alignItems:"center", gap:8 }}>
        <h2 style={{ margin:0 }}>מנהל</h2>
        <button className="btn" onClick={load}>רענן</button>
        <button className="btn ghost" onClick={removeSelected} disabled={!checked.size}>מחק נבחרים</button>
      </header>

      <section style={{ marginTop:12 }}>
        <div style={{ border:"1px solid var(--edge,#24324a)", borderRadius:12, overflow:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
            <thead style={{ position:"sticky", top:0, background:"var(--card,#0f1a2e)" }}>
              <tr>
                <th style={th}>בחר</th>
                <th style={th}>תאריך/שעה</th>
                <th style={th}>מס׳ קבוצות</th>
                <th style={th}>מס׳ שחקנים ששיחקו</th>
                <th style={th}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {rounds.length === 0 && (
                <tr><td colSpan={5} style={{ ...td, textAlign:"center" }}>אין מחזורים שמורים</td></tr>
              )}
              {rounds.map((r)=>(
                <tr key={r.id}>
                  <td style={tdCenter}>
                    <input type="checkbox" checked={checked.has(r.id)} onChange={()=>toggleCheck(r.id)} />
                  </td>
                  <td style={td}>{new Date(r.createdAt).toLocaleString('he-IL')}</td>
                  <td style={td}>{r.teamsCount}</td>
                  <td style={td}>{r.playersCount}</td>
                  <td style={td}>
                    <button className="btn tiny" onClick={()=>openRound(r)}>פתח מחזור</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const th = { textAlign:"right", padding:"10px 12px", borderBottom:"1px solid var(--edge,#24324a)", whiteSpace:"nowrap" };
const td = { textAlign:"right", padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,.06)" };
const tdCenter = { ...td, textAlign:"center" };

// src/components/Admin.jsx
// מסך ניהול מינימלי שעובד קומפילטיבית ומדגים שימוש ב-getRounds/setRounds

import React, { useEffect, useMemo, useState } from "react";
import { getRounds, setRounds, getTeamCount, setTeamCount } from "../lib/storage";

export default function Admin() {
  const [rounds, setRoundsState] = useState([]);
  const [newRoundName, setNewRoundName] = useState("");
  const [teamCount, setTeamCountState] = useState(4);

  // טען נתונים מה-storage
  useEffect(() => {
    try {
      const r = getRounds();
      setRoundsState(Array.isArray(r) ? r : []);
    } catch (e) {
      setRoundsState([]);
    }
    try {
      setTeamCountState(getTeamCount());
    } catch (e) {
      setTeamCountState(4);
    }
  }, []);

  // שמירת מספר קבוצות
  const saveTeamCount = () => {
    const n = Number(teamCount);
    if (!Number.isFinite(n) || n <= 0) return alert("מספר קבוצות לא תקין");
    setTeamCount(n);
    alert("נשמר מספר הקבוצות");
  };

  // הוספת מחזור
  const addRound = () => {
    const name = (newRoundName || "").trim();
    if (!name) return;
    const next = [
      ...rounds,
      { id: Date.now(), name }
    ];
    setRounds(next);
    setRoundsState(next);
    setNewRoundName("");
  };

  // מחיקת מחזור
  const deleteRound = (id) => {
    const next = rounds.filter(r => r.id !== id);
    setRounds(next);
    setRoundsState(next);
  };

  // רשימה ממוינת להצגה
  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => (a.name || "").localeCompare(b.name || "", "he")),
    [rounds]
  );

  return (
    <div style={{maxWidth: 900, margin: "24px auto", padding: "0 12px", direction: "rtl"}}>
      <h1 style={{marginBottom: 16}}>מסך ניהול</h1>

      {/* מספר קבוצות */}
      <section style={{border:"1px solid #ddd", borderRadius:12, padding:16, marginBottom:24}}>
        <h2 style={{marginTop:0}}>מספר קבוצות</h2>
        <label style={{display:"inline-flex", alignItems:"center", gap:8}}>
          <span>מספר קבוצות:</span>
          <input
            type="number"
            min={1}
            value={teamCount}
            onChange={(e)=>setTeamCountState(e.target.value)}
            style={{width:100, padding:"6px 8px"}}
          />
        </label>
        <button onClick={saveTeamCount} style={{marginInlineStart:12, padding:"6px 12px"}}>
          שמור
        </button>
      </section>

      {/* ניהול מחזורים */}
      <section style={{border:"1px solid #ddd", borderRadius:12, padding:16}}>
        <h2 style={{marginTop:0}}>ניהול מחזורים</h2>

        <div style={{display:"flex", gap:8, marginBottom:12}}>
          <input
            type="text"
            placeholder="שם מחזור (למשל: מחזור 1)"
            value={newRoundName}
            onChange={(e)=>setNewRoundName(e.target.value)}
            style={{flex:1, padding:"6px 8px"}}
          />
          <button onClick={addRound} style={{padding:"6px 12px"}}>הוסף</button>
        </div>

        {sortedRounds.length === 0 ? (
          <p style={{marginTop:8, color:"#777"}}>אין מחזורים עדיין.</p>
        ) : (
          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={{textAlign:"right", borderBottom:"1px solid #eee", padding:"8px"}}>#</th>
                <th style={{textAlign:"right", borderBottom:"1px solid #eee", padding:"8px"}}>שם</th>
                <th style={{textAlign:"right", borderBottom:"1px solid #eee", padding:"8px"}}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {sortedRounds.map((r, idx)=>(
                <tr key={r.id}>
                  <td style={{borderBottom:"1px solid #f2f2f2", padding:"8px"}}>{idx+1}</td>
                  <td style={{borderBottom:"1px solid #f2f2f2", padding:"8px"}}>{r.name}</td>
                  <td style={{borderBottom:"1px solid #f2f2f2", padding:"8px"}}>
                    <button onClick={()=>deleteRound(r.id)} style={{padding:"4px 10px"}}>מחק</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

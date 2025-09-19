// src/components/Ranking.jsx
import React, { useMemo } from "react";
import { useStorage, sum } from "../lib/storage.js";

/**
 * מימוש בסיסי: טבלת שחקנים עם סכימת נקודות.
 * נק' לשער = 1, ניצחון = 3 (ניתן לשנות בהמשך), בונוס שבועי/חודשי לפי מתגים.
 * כאן יש מקום להרחיב לפי החישוב המדויק שהגדרת בגרסאות קודמות.
 */
export default function Ranking(){
  const { players, bonusWeek, bonusMonth } = useStorage();

  const rows = useMemo(()=>{
    return players.map(p => ({
      id:p.id, name:p.name, pos:p.pos,
      goals: Number(p.goals||0),
      wins: Number(p.wins||0),
      points: Number(p.goals||0)*1 + Number(p.wins||0)*3
        + (bonusWeek?5:0) + (bonusMonth?10:0)
    })).sort((a,b)=>b.points-a.points);
  },[players, bonusWeek, bonusMonth]);

  return (
    <section className="panel">
      <div className="panel-header"><h2>דירוג</h2></div>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>שם</th><th>עמדה</th><th>שערים</th><th>ניצחונות</th><th>נקודות</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id}>
                <td>{r.name}</td><td>{r.pos}</td>
                <td className="center">{r.goals}</td>
                <td className="center">{r.wins}</td>
                <td className="center">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

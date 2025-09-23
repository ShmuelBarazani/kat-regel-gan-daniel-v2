// src/components/Leaderboards.jsx
import React, { useMemo } from "react";
import { useApp } from "../store/playerStorage";

// תצוגה בלבד — מחשב ניקוד בסיסי משדות goals במחזור (שער=1) + בונוס שבועי (5) אם מופעל.
export default function Leaderboards() {
  const { state } = useApp();
  const { bonus } = state.settings;

  const table = useMemo(() => {
    const scores = new Map();
    for (const c of state.cycles) {
      // שערים לשחקנים
      for (const g of c.goals || []) {
        scores.set(g.playerId, (scores.get(g.playerId) || 0) + (g.goals || 0));
      }
      // בונוס שבועי (דמו)
      if (bonus) {
        const ids = new Set(c.teams.flatMap((t) => t.players.map((p) => p.id)));
        ids.forEach((id) => scores.set(id, (scores.get(id) || 0) + 5));
      }
    }
    const arr = [...scores.entries()].map(([id, score]) => ({ id, score }));
    arr.sort((a, b) => b.score - a.score);
    return arr;
  }, [state.cycles, bonus]);

  const nameById = (id) => state.players.find((p) => p.id === id)?.name || "לא ידוע";

  return (
    <div className="grid gap-4" dir="rtl">
      <div className="card">
        <div className="card-title">דירוג מצטבר</div>
        <table className="table">
          <thead><tr><th>#</th><th>שם</th><th>נקודות</th></tr></thead>
          <tbody>
            {table.map((r, idx) => (
              <tr key={r.id}><td>{idx + 1}</td><td>{nameById(r.id)}</td><td>{r.score}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

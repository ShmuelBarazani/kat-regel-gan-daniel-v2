// src/components/MatchdayResults.jsx
import React, { useState } from "react";

export default function MatchdayResults({ cycle, onChange }) {
  const [teams, setTeams] = useState(cycle.teams);
  const [goals, setGoals] = useState(cycle.goals || []); // [{playerId, goals}]

  const setTeamScore = (ti, goalsFor, goalsAgainst) => {
    const next = teams.map((t, i) => (i === ti ? { ...t, goalsFor, goalsAgainst } : t));
    setTeams(next);
    onChange && onChange({ ...cycle, teams: next, goals });
  };

  const setPlayerGoals = (playerId, val) => {
    const g = +val || 0;
    const next = goals.filter((x) => x.playerId !== playerId).concat(g ? [{ playerId, goals: g }] : []);
    setGoals(next);
    onChange && onChange({ ...cycle, teams, goals: next });
  };

  return (
    <div className="grid gap-4" dir="rtl">
      <div className="card">
        <div className="card-title">תוצאות קבוצות</div>
        <div className="grid md:grid-cols-2 gap-3">
          {teams.map((t, idx) => (
            <div key={t.id} className="p-3 rounded bg-slate-800/40">
              <div className="font-medium mb-2">{t.name}</div>
              <div className="flex items-center gap-2">
                <label className="grid gap-1">בעד
                  <input className="input" type="number" min="0" value={t.goalsFor || ""} onChange={(e) => setTeamScore(idx, +e.target.value, t.goalsAgainst || 0)} />
                </label>
                <label className="grid gap-1">נגד
                  <input className="input" type="number" min="0" value={t.goalsAgainst || ""} onChange={(e) => setTeamScore(idx, t.goalsFor || 0, +e.target.value)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">כובשי שערים</div>
        <div className="grid md:grid-cols-2 gap-2">
          {teams.flatMap((t) => t.players).map((p) => (
            <label key={p.id} className="flex items-center justify-between bg-slate-800/40 rounded p-2">
              <span>{p.name}</span>
              <input className="input w-24 ml-2" type="number" min="0" value={(goals.find((g) => g.playerId === p.id)?.goals) || ""} onChange={(e) => setPlayerGoals(p.id, e.target.value)} />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

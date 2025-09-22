import React, { useState, useEffect, useCallback } from "react";
import playersData from "../data/players.json";

export default function TeamMaker() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([[], [], [], []]);

  useEffect(() => {
    setPlayers(playersData);
  }, []);

  // פונקציה ליצירת מחזור חדש (בינתיים דמיונית – תשלים אלגוריתם חלוקה מאוחר יותר)
  const makeRound = useCallback(() => {
    const next = [...teams];
    setTeams(next);
  }, [teams]);

  return (
    <div className="teams-screen">
      <div className="toolbar">
        <div className="left">
          <label>
            מס׳ קבוצות{" "}
            <select defaultValue={4}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          <button className="primary" onClick={makeRound}>
            עשה מחזור
          </button>
        </div>
        <div className="right">
          <button className="ghost">PRINT PREVIEW</button>
        </div>
      </div>

      <div className="teams-grid">
        {teams.map((t, i) => (
          <div key={i} className="team-card">
            <div className="team-head">
              <span className="team-title">קבוצה {i + 1}</span>
              <span className="team-meta">
                {t.length} שחקנים | ממוצע 0.0 | סך 0
              </span>
            </div>
            <div className="team-body">
              {t.map((p, idx) => (
                <div key={idx} className="pill">
                  {p.name} <span>{p.rating}</span>
                  <button className="remove">הסר</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="players-list">
        <h3>רשימת השחקנים</h3>
        <p className="muted">גרור שחקן לכרטיס קבוצה, או חזרה לכאן להסרה.</p>
        <div className="table">
          <div className="row header">
            <div className="cell">משחק?</div>
            <div className="cell">שם</div>
            <div className="cell">עמדה</div>
            <div className="cell">ציון</div>
          </div>
          {players.map((p, idx) => (
            <div className="row" key={idx}>
              <div className="cell">
                <input type="checkbox" defaultChecked />
              </div>
              <div className="cell">{p.name}</div>
              <div className="cell">{p.pos}</div>
              <div className="cell">{p.rating}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

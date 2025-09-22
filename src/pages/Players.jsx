import React, { useState, useEffect } from "react";
import playersData from "../data/players.json";

export default function Players() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    setPlayers(playersData);
  }, []);

  return (
    <div className="players-list">
      <h2>רשימת השחקנים</h2>
      <div className="table">
        <div className="row header">
          <div className="cell">משחק?</div>
          <div className="cell">שם</div>
          <div className="cell">עמדה</div>
          <div className="cell">ציון</div>
          <div className="cell">חייב עם</div>
          <div className="cell">לא עם</div>
          <div className="cell">פעולות</div>
        </div>
        {players.map((p, idx) => (
          <div className="row" key={idx}>
            <div className="cell">
              <input type="checkbox" defaultChecked />
            </div>
            <div className="cell">{p.name}</div>
            <div className="cell">{p.pos}</div>
            <div className="cell">{p.rating}</div>
            <div className="cell">—</div>
            <div className="cell">—</div>
            <div className="cell actions">
              <button className="edit">ערוך</button>
              <button className="delete">מחק</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

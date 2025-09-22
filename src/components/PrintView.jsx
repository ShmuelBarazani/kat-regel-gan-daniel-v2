// src/components/PrintView.jsx
import React, { useEffect } from "react";
import "../styles/print.css"; // מחיל צבעי מערכת + 2x2 + עמוד אחד

function GoalsBoxes({ count = 12 }) {
  return (
    <div className="goals-boxes" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => <span key={i} className="gbox" />)}
    </div>
  );
}

function TeamSheet({ team, index }) {
  return (
    <div className="sheet" style={{ direction: "rtl" }}>
      <div className="sheet-head">
        <div className="title">קבוצה {index + 1}</div>
        <div className="meta">תאריך {new Date().toISOString().slice(0,10)}</div>
      </div>
      <div className="sheet-table">
        <div className="thead">
          <div className="th player">שחקן</div>
          <div className="th goals">שערים</div>
        </div>
        <div className="tbody">
          {team.players.map(p => (
            <div className="tr" key={p.id ?? p.name}>
              <div className="td player">{p.name}</div>
              <div className="td goals"><GoalsBoxes /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="result-row">
        <span>ניצחון</span><span className="square" />
        <span>תיקו</span><span className="square" />
        <span>הפסד</span><span className="square" />
      </div>
    </div>
  );
}

export default function PrintView({ teams, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const printIt = () => window.print();
  const four = teams.slice(0, 4); // עמוד אחד, 2x2

  return (
    <div className="print-modal">
      <div className="print-card" style={{ direction: "rtl" }}>
        <div className="print-toolbar">
          <div className="left">
            <button className="primary" onClick={printIt}>הדפס / PDF</button>
          </div>
          <button className="ghost" onClick={onClose}>סגור</button>
        </div>

        <div className="printable">
          <div className="sheets-grid">
            {four.map((t, i) => <TeamSheet key={i} team={t} index={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

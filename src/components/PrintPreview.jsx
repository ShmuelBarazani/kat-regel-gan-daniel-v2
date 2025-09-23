// src/components/PrintPreview.jsx
import React from "react";

export default function PrintPreview({ teams }) {
  return (
    <div className="print-page" dir="rtl">
      <h1 className="print-title">קבוצות — תצוגת הדפסה</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {teams.map((t) => (
          <div key={t.id} className="print-card">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">{t.name}</div>
              <div className="text-sm">ממוצע: {t.avg}</div>
            </div>
            <ul className="print-list">
              {t.players.map((p) => (
                <li key={p.id}>
                  <span className="n">{p.name}</span>
                  <span className="r">{p.rating}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

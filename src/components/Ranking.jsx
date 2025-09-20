// src/components/Ranking.jsx
import React from "react";

export default function Ranking(){
  return (
    <div className="container" dir="rtl">
      <div className="toolbar"><h3 style={{margin:0}}>דירוגים ותצוגות</h3></div>

      <div className="cards-grid">
        <section className="card">
          <h4>שערים למחזור</h4>
          <div className="list-scroll" style={{maxHeight:"45vh"}}>
            {/* הכנס כאן טבלת שערים עם גלילה פנימית */}
            <p>תצוגה לדוגמה…</p>
          </div>
        </section>

        <section className="card">
          <h4>מלך השערים – חודשי</h4>
          <div className="list-scroll" style={{maxHeight:"45vh"}}></div>
        </section>

        <section className="card">
          <h4>מלך השערים – שנתי</h4>
          <div className="list-scroll" style={{maxHeight:"45vh"}}></div>
        </section>
      </div>
    </div>
  );
}

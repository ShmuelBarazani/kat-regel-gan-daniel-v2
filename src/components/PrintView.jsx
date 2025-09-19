// src/components/PrintView.jsx
import React from "react";
import { useStorage } from "../lib/storage.js";

export default function PrintView(){
  const { players } = useStorage();
  return (
    <section className="panel print">
      <div className="panel-header">
        <h2>תצוגת הדפסה</h2>
        <div className="actions">
          <button className="btn" onClick={()=>window.print()}>הדפס</button>
        </div>
      </div>
      <div className="print-body">
        <ul className="print-list">
          {players.filter(p=>p.active).map(p=>(
            <li key={p.id}>{p.name} — {p.pos} — {Number(p.rating).toFixed(1)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// src/components/SavedCycles.jsx
import React from "react";
import { useStorage } from "../lib/storage.js";

export default function SavedCycles({ onOpen = ()=>{} }){
  const { cycles, setCycles } = useStorage();

  function remove(id){
    if(!confirm("למחוק מחזור?")) return;
    setCycles(prev => prev.filter(c => c.id !== id));
  }

  return (
    <section className="panel">
      <div className="panel-header"><h2>מחזורים שמורים</h2></div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>תאריך</th><th>קבוצות</th><th></th></tr></thead>
          <tbody>
            {cycles.length ? cycles.map(c=>(
              <tr key={c.id}>
                <td>{c.at}</td>
                <td>{c.teams?.length || 0}</td>
                <td className="center">
                  <button className="pill" onClick={()=>{ alert("פתיחת מחזור מיישמת לקומפוננטת הקבוצות – במידת הצורך אשחיל לך עדכון שמטעין אותו ישירות לשם."); onOpen(); }}>
                    פתח
                  </button>
                  <button className="pill warn" onClick={()=>remove(c.id)}>מחק</button>
                </td>
              </tr>
            )) : <tr><td className="center muted" colSpan={3}>אין מחזורים שמורים</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

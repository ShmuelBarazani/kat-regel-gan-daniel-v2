// src/components/MatchdayResults.jsx
import React from "react";
import { useStorage } from "../lib/storage.js";

export default function MatchdayResults(){
  const { players, setPlayers } = useStorage();

  function setVal(id, field, v){
    setPlayers(prev => prev.map(p => p.id===id ? { ...p, [field]: v } : p));
  }

  return (
    <section className="panel">
      <div className="panel-header"><h2>תוצאות – הזנת נתונים</h2></div>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>שם</th><th>שערים</th><th>ניצחון?</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p=>(
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="center">
                  <input className="inp" type="number" min={0} step={1}
                         value={Number(p.goals||0)}
                         onChange={e=>setVal(p.id,"goals",Number(e.target.value))}/>
                </td>
                <td className="center">
                  <input type="checkbox" checked={!!p.wins}
                         onChange={e=>setVal(p.id,"wins", e.target.checked ? 1 : 0)}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

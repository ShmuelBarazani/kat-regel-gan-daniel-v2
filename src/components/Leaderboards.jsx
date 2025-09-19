// src/components/Leaderboards.jsx
import React, { useMemo } from "react";
import { useStorage } from "../lib/storage.js";

export default function Leaderboards(){
  const { players } = useStorage();

  const topScorers = useMemo(()=>{
    return [...players].sort((a,b)=>(b.goals||0)-(a.goals||0)).slice(0,10);
  },[players]);

  const mostWins = useMemo(()=>{
    return [...players].sort((a,b)=>(b.wins||0)-(a.wins||0)).slice(0,10);
  },[players]);

  return (
    <section className="panel">
      <div className="panel-header"><h2>טבלאות מובילים</h2></div>
      <div className="boards">
        <div className="board">
          <h3>מלך השערים</h3>
          <ol>{topScorers.map(p=><li key={p.id}>{p.name} — {p.goals||0}</li>)}</ol>
        </div>
        <div className="board">
          <h3>הכי הרבה ניצחונות</h3>
          <ol>{mostWins.map(p=><li key={p.id}>{p.name} — {p.wins||0}</li>)}</ol>
        </div>
      </div>
    </section>
  );
}

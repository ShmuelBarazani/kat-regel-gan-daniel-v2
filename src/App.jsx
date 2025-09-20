// src/App.jsx
import React, { useState } from "react";
import Players from "./components/Players.jsx";
import Teams from "./components/Teams.jsx";
import Ranking from "./components/Ranking.jsx";
import SavedCycles from "./components/SavedCycles.jsx";

export default function App(){
  const [tab, setTab] = useState("teams");

  return (
    <div className="app-root" dir="rtl">
      <header className="site-header container">
        <h1 className="site-title">קטרגל גן-דניאל <span className="ball">⚽</span></h1>
        <nav className="tabs">
          <button className={tab==="players"?"tab active":"tab"} onClick={()=>setTab("players")}>שחקנים</button>
          <button className={tab==="teams"?"tab active":"tab"}   onClick={()=>setTab("teams")}>עשה כוחות / מחזור</button>
          <button className={tab==="ranking"?"tab active":"tab"} onClick={()=>setTab("ranking")}>דירוג</button>
          <button className={tab==="admin"?"tab active":"tab"}   onClick={()=>setTab("admin")}>מנהל</button>
        </nav>
      </header>

      <main className="container">
        {tab==="players" && <Players />}
        {tab==="teams"   && <Teams />}
        {tab==="ranking" && <Ranking />}
        {tab==="admin"   && <SavedCycles />}
      </main>
    </div>
  );
}

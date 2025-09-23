// src/App.jsx
import React, { useState } from "react";
import { AppProvider } from "./store/playerStorage";
import Players from "./pages/Players";
import TeamMaker from "./pages/TeamMaker";
import Ranking from "./pages/Ranking";
import Admin from "./pages/Admin";
import "./styles/styles.css";
import "./styles/print.css";

function Shell() {
  const [tab, setTab] = useState("teams");

  return (
    <>
      <header className="page header" dir="rtl">
        <div className="brand">
          <span className="logo" aria-hidden></span>
          <span>קטרגל־גן דניאל</span>
        </div>

        <nav className="pills">
          <button className={`btn btn-ghost ${tab==="players"?"pill--active":""}`} onClick={()=>setTab("players")}>שחקנים</button>
          <button className={`btn btn-ghost ${tab==="teams"?"pill--active":""}`} onClick={()=>setTab("teams")}>כוחות</button>
          <button className={`btn btn-ghost ${tab==="ranking"?"pill--active":""}`} onClick={()=>setTab("ranking")}>דירוג</button>
          <button className={`btn btn-ghost ${tab==="admin"?"pill--active":""}`} onClick={()=>setTab("admin")}>מנהל</button>
        </nav>
      </header>

      {tab==="players" && <Players/>}
      {tab==="teams" && <TeamMaker/>}
      {tab==="ranking" && <Ranking/>}
      {tab==="admin" && <Admin/>}
    </>
  );
}

export default function App(){
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

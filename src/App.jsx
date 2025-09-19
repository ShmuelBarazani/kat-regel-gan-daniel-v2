// src/App.jsx
import React, { useState } from "react";
import Teams from "./components/Teams.jsx";
import Players from "./components/Players.jsx";
import Ranking from "./components/Ranking.jsx";
import MatchdayResults from "./components/MatchdayResults.jsx";
import Leaderboards from "./components/Leaderboards.jsx";
import SavedCycles from "./components/SavedCycles.jsx";
import PrintView from "./components/PrintView.jsx";
import BonusToggle from "./components/BonusToggle.jsx";

function NavButton({ active, onClick, children }) {
  return (
    <button className={`nav-btn ${active ? "active" : ""}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState("teams"); // teams | players | ranking | results | leaders | saved | print

  return (
    <div dir="rtl" className="app-root">
      <header className="app-header">
        {/* כותרת האתר – בעברית + אייקון כדור */}
        <h1 className="site-title">
          <span className="ball" aria-hidden>⚽</span>
          קטרגל&nbsp;גן-דניאל
        </h1>

        <nav className="nav">
          <NavButton active={tab === "teams"} onClick={() => setTab("teams")}>קבוצות</NavButton>
          <NavButton active={tab === "players"} onClick={() => setTab("players")}>שחקנים</NavButton>
          <NavButton active={tab === "ranking"} onClick={() => setTab("ranking")}>דירוג</NavButton>
          <NavButton active={tab === "results"} onClick={() => setTab("results")}>תוצאות</NavButton>
          <NavButton active={tab === "leaders"} onClick={() => setTab("leaders")}>מצטיינים</NavButton>
          <NavButton active={tab === "saved"} onClick={() => setTab("saved")}>מחזורים שמורים</NavButton>
          <NavButton active={tab === "print"} onClick={() => setTab("print")}>תצוגת הדפסה</NavButton>
        </nav>
      </header>

      {/* בונוסים – רק במסכי שחקנים/דירוג */}
      {(tab === "players" || tab === "ranking") && (
        <div className="bonus-strip"><BonusToggle /></div>
      )}

      <main className="page">
        {tab === "teams" && <Teams />}
        {tab === "players" && <Players />}
        {tab === "ranking" && <Ranking />}
        {tab === "results" && <MatchdayResults />}
        {tab === "leaders" && <Leaderboards />}
        {tab === "saved" && <SavedCycles />}
        {tab === "print" && <PrintView />}
      </main>
    </div>
  );
}

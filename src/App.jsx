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
    <button
      className={`nav-btn ${active ? "active" : ""}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export default function App() {
  // כרטיסיות ניווט – בלי "עשה/קבע מחזור" ובלי בונוסים בראש
  const [tab, setTab] = useState("teams"); // teams | players | ranking | results | leaders | saved | print

  return (
    <div dir="rtl" className="app-root">
      {/* כותרת ראשית – נגדיל רק אותה (ראה styles.css: .site-title) */}
      <header className="app-header">
        <h1 className="site-title">KAT REGEL — GAN DANIEL V2</h1>

        {/* ניווט ראשי בלבד */}
        <nav className="nav">
          <NavButton active={tab === "teams"} onClick={() => setTab("teams")}>
            קבוצות
          </NavButton>
          <NavButton active={tab === "players"} onClick={() => setTab("players")}>
            שחקנים
          </NavButton>
          <NavButton active={tab === "ranking"} onClick={() => setTab("ranking")}>
            דירוג
          </NavButton>
          <NavButton active={tab === "results"} onClick={() => setTab("results")}>
            תוצאות
          </NavButton>
          <NavButton active={tab === "leaders"} onClick={() => setTab("leaders")}>
            מצטיינים
          </NavButton>
          <NavButton active={tab === "saved"} onClick={() => setTab("saved")}>
            מחזורים שמורים
          </NavButton>
          <NavButton active={tab === "print"} onClick={() => setTab("print")}>
            תצוגת הדפסה
          </NavButton>
        </nav>

        {/* שורה זו בכוונה ריקה – כאן בעבר הופיעו "עשה/קבע מחזור" והבונוסים.
            השארנו ריק כדי לא להציג אותם בראש הדף. */}
      </header>

      {/* בונוסים – מוצגים רק במסכי "שחקנים" ו-"דירוג" לפי דרישתך */}
      {(tab === "players" || tab === "ranking") && (
        <div className="bonus-strip">
          <BonusToggle />
        </div>
      )}

      {/* אזור התוכן */}
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

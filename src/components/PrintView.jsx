// src/App.jsx
import React, { useState } from "react";

// דפים
import Players from "./pages/Players";
import Teams from "./pages/Teams";         // חשוב: זה ה-wrapper שמעלה את TeamMaker
import Ranking from "./pages/Ranking";
import Admin from "./pages/Admin";

// נתוני שחקנים לדוגמה – אצלך מגיע מה-store/קובץ JSON
import playersData from "../data/players.json";

export default function App() {
  const [tab, setTab] = useState("teams"); // נפתח ישירות על "קבוצות"

  const tabs = [
    { id: "players", label: "שחקנים", comp: <Players /> },
    { id: "teams",   label: "קבוצות", comp: <Teams players={playersData} /> },
    { id: "ranking", label: "דירוג",   comp: <Ranking /> },
    { id: "admin",   label: "מנהל",    comp: <Admin /> },
  ];

  return (
    <div dir="rtl">
      <header className="topbar">
        <h1 className="title">קטרגל־גן דניאל ⚽</h1>
        <nav className="tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="container">
        {tabs.find(t => t.id === tab)?.comp}
      </main>

      {/* סטיילינג בסיסי (אפשר להוציא ל-CSS גלובלי שלך) */}
      <style>{`
        :root{ --bg:#0b1220; --ink:#e8eefc; --edge:#24324a; --accent:#2e7d32; }
        body { background: var(--bg); color: var(--ink); }
        .topbar{ display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid var(--edge); }
        .title{ margin:0; font-size:20px; }
        .tabs{ display:flex; gap:8px; }
        .tab{ background:transparent; border:1px solid var(--edge); color:var(--ink); padding:6px 10px; border-radius:12px; cursor:pointer; }
        .tab.active{ background:var(--accent); border-color:var(--accent); }
        .container{ padding:12px; }
      `}</style>
    </div>
  );
}

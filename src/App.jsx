// src/App.jsx
import React, { useState } from "react";
import Players from "./components/Players.jsx";
import Teams from "./components/Teams.jsx";
import Admin from "./components/Admin.jsx";
import Ranking from "./components/Ranking.jsx"; // אם אין – צור קובץ ריק עם export default ()=>null

const TABS = [
  { key: "players",  title: "שחקנים",         comp: Players },
  { key: "teams",    title: "עשה כוחות / מחזור", comp: Teams },
  { key: "ranking",  title: "דירוג",           comp: Ranking },
  { key: "admin",    title: "מנהל",            comp: Admin },
];

export default function App() {
  const [tab, setTab] = useState("teams");

  const Curr = TABS.find(t => t.key === tab)?.comp ?? Teams;

  return (
    <div className="app" dir="rtl">
      <nav className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab ${tab===t.key ? "active":""}`}
            onClick={() => setTab(t.key)}
          >
            {t.title}
          </button>
        ))}
      </nav>
      <main>
        <Curr />
      </main>
    </div>
  );
}

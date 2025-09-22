// src/App.jsx
import React, { useEffect, useState } from "react";
import "./styles/styles.css";
import "./styles/print.css";

import PlayersPage from "@/pages/Players";
import TeamMakerPage from "@/pages/TeamMaker";
import RankingPage from "@/pages/Ranking";
import AdminPage from "@/pages/Admin";

const TABS = [
  { key: "players", label: "שחקנים", component: PlayersPage },
  { key: "teammaker", label: "עשה כוחות / מחזור", component: TeamMakerPage },
  { key: "ranking", label: "דירוג", component: RankingPage },
  { key: "admin", label: "מנהל", component: AdminPage },
];

const TAB_KEY = "katregel.ui.activeTab.v2";

export default function App(){
  const [active, setActive] = useState(() => localStorage.getItem(TAB_KEY) || "players");

  useEffect(() => { localStorage.setItem(TAB_KEY, active); }, [active]);

  const ActiveComp = TABS.find(t => t.key === active)?.component ?? PlayersPage;

  return (
    <div dir="rtl">
      {/* בר עליון */}
      <header className="topbar">
        <div className="page flex items-center justify-between gap-3 py-3">
          <div className="app-title select-none">קטרגל גן־דניאל ⚽</div>
          <nav className="flex items-center gap-1 no-print" aria-label="ראשי">
            {TABS.map(t => (
              <button
                key={t.key}
                className="tab"
                aria-current={active===t.key ? "page" : undefined}
                onClick={() => setActive(t.key)}
                title={t.label}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* גוף הדף */}
      <main className="page">
        <ActiveComp />
      </main>
    </div>
  );
}

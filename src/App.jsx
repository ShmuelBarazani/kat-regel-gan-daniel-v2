// src/App.jsx
import React, { useState } from "react";
import { AppProvider } from "./store/playerStorage";
import Players from "./pages/Players";
import TeamMaker from "./pages/TeamMaker";
import Ranking from "./pages/Ranking";
import Admin from "./pages/Admin";
import "./styles/styles.css";
import "./styles/print.css";

function Tabs() {
  const [tab, setTab] = useState("players");
  return (
    <div>
      <header className="page" dir="rtl">
        <div className="text-center text-2xl mb-3">קטרגל גן-דניאל ⚽</div>
        <nav className="flex gap-2 justify-center mb-4 flex-wrap">
          <button className="btn" onClick={() => setTab("players")}>שחקנים</button>
          <button className="btn" onClick={() => setTab("teams")}>קבוצות</button>
          <button className="btn" onClick={() => setTab("ranking")}>דירוג</button>
          <button className="btn" onClick={() => setTab("admin")}>מנהל</button>
        </nav>
      </header>
      {tab === "players" && <Players />}
      {tab === "teams" && <TeamMaker />}
      {tab === "ranking" && <Ranking />}
      {tab === "admin" && <Admin />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Tabs />
    </AppProvider>
  );
}

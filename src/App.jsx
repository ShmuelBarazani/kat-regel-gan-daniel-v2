// src/App.jsx
import React, { useMemo, useState } from "react";
import Players from "./components/Players.jsx";
import Teams from "./components/Teams.jsx";
import Ranking from "./components/Ranking.jsx";
import MatchdayResults from "./components/MatchdayResults.jsx";
import Leaderboards from "./components/Leaderboards.jsx";
import SavedCycles from "./components/SavedCycles.jsx";
import PrintView from "./components/PrintView.jsx";
import BonusToggle from "./components/BonusToggle.jsx";
import { useStorage } from "./lib/storage.js";
import "./styles/styles.css";

const TABS = [
  { key: "teams", label: "עשה מחזור" },       // קבוצות מעל הטבלה
  { key: "setcycle", label: "קבע מחזור" },
  { key: "players", label: "שחקנים" },
  { key: "ranking", label: "דירוג" },
  { key: "results", label: "תוצאות" },
  { key: "leader", label: "טבלאות" },
  { key: "saved", label: "מחזורים שמורים" },
  { key: "print", label: "תצוגת הדפסה" },
];

export default function App() {
  const [tab, setTab] = useState("teams");
  const { hiddenRatings, setHiddenRatings } = useStorage();

  const header = useMemo(() => (
    <div className="topbar" dir="rtl">
      <div className="brand">
        <span className="logo" aria-hidden>⚽</span>
        קטרגל – גן דניאל
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={"tab" + (tab === t.key ? " active" : "")}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="actions">
        <button
          type="button"
          className={"pill" + (hiddenRatings ? " warn" : "")}
          onClick={() => setHiddenRatings(!hiddenRatings)}
          title="הסתר/הצג ציונים"
        >
          {hiddenRatings ? "הצג ציונים" : "הסתר ציונים"}
        </button>
        <BonusToggle />
      </div>
    </div>
  ), [tab, hiddenRatings, setHiddenRatings]);

  return (
    <div className="app" dir="rtl">
      {header}
      {tab === "teams" && <Teams />}
      {tab === "setcycle" && <Teams mode="set" />}
      {tab === "players" && <Players />}
      {tab === "ranking" && <Ranking />}
      {tab === "results" && <MatchdayResults />}
      {tab === "leader" && <Leaderboards />}
      {tab === "saved" && <SavedCycles onOpen={() => setTab("teams")} />}
      {tab === "print" && <PrintView />}
    </div>
  );
}

import React, { useMemo, useState } from "react";
import Players from "./components/Players";
import Teams from "./components/Teams";
import MatchdayResults from "./components/MatchdayResults";
import Ranking from "./components/Ranking";
import Leaderboards from "./components/Leaderboards";
import SavedCycles from "./components/SavedCycles";
import PrintView from "./components/PrintView";
import BonusToggle from "./components/BonusToggle";

const TABS = [
  { id: "players", label: "שחקנים" },
  { id: "teams", label: "קבוצות" },
  { id: "matchday", label: "תוצאות מחזור" },
  { id: "ranking", label: "דירוגים" },
  { id: "leaderboards", label: "טבלאות מובילים" },
  { id: "saved", label: "מחזורים שמורים" },
  { id: "print", label: "הדפסה" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("teams");
  const [bonusEnabled, setBonusEnabled] = useState(false);

  const title = useMemo(
    () => `KAT REGEL — GAN DANIEL V2${bonusEnabled ? " · בונוס פעיל" : ""}`,
    [bonusEnabled]
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-[Heebo]">
      {/* עליון */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-3 py-3 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight">{title}</h1>

          <div className="flex items-center gap-2">
            <BonusToggle value={bonusEnabled} onToggle={()=>setBonusEnabled(v=>!v)} />
            <button onClick={() => window.print()} className="btn" title="הדפס">🖨️ הדפס</button>
          </div>
        </div>

        {/* טאבים */}
        <nav className="mx-auto max-w-6xl px-2 pb-2">
          <ul className="flex flex-wrap gap-2">
            {TABS.map(tab => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-2xl text-sm border transition
                    ${activeTab === tab.id
                      ? "border-sky-400 bg-sky-500/10"
                      : "border-slate-700 hover:bg-slate-800"
                    }`}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* תוכן */}
      <main className="mx-auto max-w-6xl px-3 py-4">
        {activeTab === "players" && <Players />}
        {activeTab === "teams" && <Teams />}
        {activeTab === "matchday" && <MatchdayResults bonusEnabled={bonusEnabled} />}
        {activeTab === "ranking" && <Ranking />}
        {activeTab === "leaderboards" && <Leaderboards />}
        {activeTab === "saved" && <SavedCycles />}
        {activeTab === "print" && <PrintView />}
      </main>

      {/* תחתון */}
      <footer className="mt-8 border-t border-slate-800">
        <div className="mx-auto max-w-6xl px-3 py-4 text-xs text-slate-400">
          © {new Date().getFullYear()} Kat Regel · Gan Daniel — V2
        </div>
      </footer>
    </div>
  );
}

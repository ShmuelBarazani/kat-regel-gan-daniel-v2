// src/pages/Admin.jsx
import React from "react";
import { useAppStore } from "@/store/playerStorage";
import MatchdayResults from "@/components/MatchdayResults";
import SavedCycles from "@/components/SavedCycles";

export default function AdminPage() {
  const {
    players, current,
    setFixtureScore, setScorer, createFixturesFromTeams,
    saveSnapshot, openSnapshot, deleteCycle,
    cycles, exportAll, importAll
  } = useAppStore();

  // מיפוי שחקנים לפי קבוצה לצורך כובשי שערים
  const playersByTeam = {};
  current.teams.forEach(t => {
    playersByTeam[t.id] = t.playerIds.map(pid => {
      const p = players.find(x => x.id === pid);
      return { ...p, teamName: t.name };
    }).filter(Boolean);
  });

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h2 className="text-2xl">מנהל</h2>

      <button
        onClick={createFixturesFromTeams}
        className="px-4 py-2 rounded-xl bg-[#2575fc] text-white hover:opacity-90"
      >
        פתח מחזור (צור משחקים)
      </button>

      <MatchdayResults
        teams={current.teams}
        fixtures={current.fixtures}
        onChangeFixture={setFixtureScore}
        scorers={current.scorers}
        playersByTeam={playersByTeam}
        onChangeScorer={setScorer}
      />

      <SavedCycles
        cycles={cycles}
        onOpen={openSnapshot}
        onDelete={deleteCycle}
        onExportAll={() => {
          const blob = new Blob([exportAll()], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "katregel_export.json";
          a.click();
          URL.revokeObjectURL(url);
        }}
        onImportFile={(txt) => {
          try { importAll(txt); alert("ייבוא הושלם בהצלחה"); }
          catch (e) { alert("שגיאת ייבוא: " + e.message); }
        }}
      />

      <div className="text-sm text-[#9fb0cb]">
        ⚙️ כאן תוכל לשמור מחזור בשם ולייבא/לייצא נתונים.
      </div>
    </div>
  );
}

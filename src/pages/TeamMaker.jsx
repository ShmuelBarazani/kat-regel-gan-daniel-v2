// src/pages/TeamMaker.jsx
import React from "react";
import { useAppStore } from "@/store/playerStorage";

export default function TeamMakerPage() {
  const {
    players, current, teamStats, teamsBalanced,
    setTeams, movePlayer, toggleShowRatings
  } = useAppStore();

  const onDragStart = (e, playerId, fromTeamId) => {
    e.dataTransfer.setData("playerId", playerId);
    e.dataTransfer.setData("fromTeamId", fromTeamId || "");
  };
  const onDrop = (e, toTeamId) => {
    const playerId = e.dataTransfer.getData("playerId");
    const fromTeamId = e.dataTransfer.getData("fromTeamId");
    movePlayer(playerId, fromTeamId, toTeamId);
  };
  const allowDrop = (e) => e.preventDefault();

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h2 className="text-2xl">עשה כוחות / מחזור</h2>
      {!teamsBalanced && (
        <div className="text-[#ff5c7a]">⚠️ חלוקה לא מאוזנת! הפער בין הקבוצות גדול מ־1.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {current.teams.map((team, i) => {
          const stats = teamStats.find(t => t.id === team.id);
          return (
            <div
              key={team.id}
              className="rounded-2xl bg-[#0f1a2e] border border-[#24324a] p-3 flex flex-col"
              onDragOver={allowDrop}
              onDrop={(e) => onDrop(e, team.id)}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg">{team.name}</h3>
                <button
                  onClick={() => toggleShowRatings(team.id)}
                  className="text-xs text-[#9fb0cb] underline"
                >
                  {team.showRatings ? "הסתר ציונים" : "הצג ציונים"}
                </button>
              </div>
              <div className="text-sm text-[#9fb0cb] mb-2">
                שחקנים: {stats?.count ?? 0} | ממוצע: {stats?.avg ?? 0} | סך: {stats?.sum ?? 0}
              </div>
              <div className="flex-1 overflow-auto space-y-1">
                {team.playerIds.map(pid => {
                  const p = players.find(x => x.id === pid);
                  if (!p) return null;
                  return (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, p.id, team.id)}
                      className="rounded-xl bg-[#0b1220] border border-[#24324a] px-2 py-1 flex justify-between cursor-grab"
                    >
                      <span>{p.name}</span>
                      {team.showRatings && <span className="text-xs text-[#9fb0cb]">{p.rating}</span>}
                    </div>
                  );
                })}
                {team.playerIds.length === 0 && (
                  <div className="text-xs text-[#9fb0cb]">אין שחקנים.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-[#0f1a2e] border border-[#24324a] p-3">
        <h3 className="text-lg mb-2">רשימת שחקנים זמינים</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[50vh] overflow-auto">
          {players.filter(p => !current.teams.some(t => t.playerIds.includes(p.id)) && p.plays).map(p => (
            <div
              key={p.id}
              draggable
              onDragStart={(e) => onDragStart(e, p.id, null)}
              className="rounded-xl bg-[#0b1220] border border-[#24324a] px-2 py-1 flex justify-between cursor-grab"
            >
              <span>{p.name}</span>
              <span className="text-xs text-[#9fb0cb]">{p.rating}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

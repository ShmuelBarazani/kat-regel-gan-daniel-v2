// src/pages/TeamMaker.jsx
import React, { useMemo, useState } from "react";
import { useAppStore } from "@/store/playerStorage.jsx";
import { computeTeamStats, isBalanced } from "@/logic/balance";
import PrintPreview from "@/components/PrintPreview";

export default function TeamMakerPage() {
  const {
    players, current, setTeams, movePlayer, toggleShowRatings,
    createFixturesFromTeams, saveSnapshot
  } = useAppStore();

  const [teamsCount, setTeamsCount] = useState(current.teams.length || 4);
  const [showPrint, setShowPrint] = useState(false);

  const availablePlayers = useMemo(() => players.filter((p) => p.plays), [players]);
  const assignedIds = new Set(current.teams.flatMap((t) => t.playerIds));
  const unassigned = availablePlayers.filter((p) => !assignedIds.has(p.id));

  const totals = {
    total: availablePlayers.length,
    assigned: availablePlayers.length - unassigned.length,
    free: unassigned.length,
  };

  const teamStats = useMemo(() => computeTeamStats(current.teams, players), [current.teams, players]);
  const balanced = useMemo(() => isBalanced(current.teams), [current.teams]);

  const handleChangeTeamsCount = (n) => {
    const num = Number(n);
    setTeamsCount(num);
    const existing = current.teams;
    const next = Array.from({ length: num }).map((_, i) => existing[i] ?? {
      id: crypto.randomUUID(),
      name: `קבוצה ${i + 1}`,
      playerIds: [],
      showRatings: true,
    });
    setTeams(next);
  };

  const toggleAllRatings = () => {
    const anyShown = current.teams.some((t) => t.showRatings);
    const next = current.teams.map((t) => ({ ...t, showRatings: !anyShown }));
    setTeams(next);
  };

  // random helper
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // עשה כוחות (רנדומלי בכל לחיצה)
  const autoDistribute = () => {
    const n = teamsCount;
    if (n < 2) return;

    const pool = shuffle(availablePlayers).sort((a,b) => b.rating - a.rating); // ערבוב + דירוג
    const teams = Array.from({ length: n }).map((_, i) => ({
      id: current.teams[i]?.id ?? crypto.randomUUID(),
      name: `קבוצה ${i + 1}`,
      playerIds: [],
      showRatings: current.teams[i]?.showRatings ?? true,
    }));

    const sums = Array(n).fill(0);
    const sizes = Array(n).fill(0);

    pool.forEach((p) => {
      // נשמור על כלל ±1: נכניס תחילה לקבוצות בעלות הגודל הנמוך ביותר
      const minSize = Math.min(...sizes);
      const candidates = [];
      for (let i = 0; i < n; i++) if (sizes[i] === minSize) candidates.push(i);
      // מבין המועמדות נבחר את זו עם סך הניקוד הנמוך
      candidates.sort((i, j) => sums[i] - sums[j]);
      const idx = candidates[Math.floor(Math.random() * Math.min(2, candidates.length))] ?? candidates[0]; // טיפה רנדום
      teams[idx].playerIds.push(p.id);
      sums[idx] += Number(p.rating) || 0;
      sizes[idx] += 1;
    });

    setTeams(teams);
  };

  const onCreateFixtures = () => {
    createFixturesFromTeams();
    // שמור גם Snapshot כדי שה”מחזור“ יופיע במסך המנהל
    saveSnapshot(`מחזור ${new Date().toLocaleDateString("he-IL")}`);
  };

  const printView = () => setShowPrint(true);

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h2 className="text-2xl">קבוצות</h2>
        <div className="text-sm text-[#9fb0cb]">
          שחקנים זמינים: <b>{totals.total}</b> · משובצים: <b>{totals.assigned}</b> · פנויים: <b>{totals.free}</b>
        </div>
      </div>

      {/* סרגל פעולות */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          <span>מס׳ קבוצות:</span>
          <select
            value={teamsCount}
            onChange={(e) => handleChangeTeamsCount(e.target.value)}
            className="rounded-lg bg-[#0b1220] border border-[#24324a] px-2 py-1"
          >
            {[2,3,4,5,6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <button onClick={autoDistribute} className="px-3 py-2 rounded-xl bg-[#27c463] text-[#0b1220] hover:opacity-90">
          עשה כוחות
        </button>
        <button onClick={onCreateFixtures} className="px-3 py-2 rounded-xl bg-[#2575fc] text-white hover:opacity-90">
          קבע מחזור
        </button>
        <button onClick={printView} className="px-3 py-2 rounded-xl border border-[#24324a] hover:bg-white/5">
          תצוגת הדפסה
        </button>
        <button onClick={toggleAllRatings} className="px-3 py-2 rounded-xl border border-[#24324a] hover:bg-white/5">
          {current.teams.some((t) => t.showRatings) ? "הסתר ציונים" : "הצג ציונים"}
        </button>
        {!balanced && <span className="text-[#ff5c7a]">⚠ חלוקה לא מאוזנת (כלל ±1)</span>}
      </div>

      {/* כרטיסי קבוצות */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {current.teams.map((team, i) => {
          const stats = teamStats.find((t) => t.id === team.id);
          return (
            <div
              key={team.id}
              className="rounded-2xl bg-[#0f1a2e] border border-[#24324a] p-3 flex flex-col print-card"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const playerId = e.dataTransfer.getData("playerId");
                const fromTeamId = e.dataTransfer.getData("fromTeamId");
                movePlayer(playerId, fromTeamId, team.id);
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg">קבוצה {i + 1}</h3>
                <span className="text-xs text-[#9fb0cb]">
                  שחקנים: {stats?.count ?? 0} · ממוצע: {stats?.avg ?? 0} · סך: {stats?.sum ?? 0}
                </span>
              </div>

              <div className="flex-1 overflow-auto space-y-1 min-h-[120px]">
                {team.playerIds.map((pid) => {
                  const p = players.find((x) => x.id === pid);
                  if (!p) return null;
                  return (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("playerId", p.id);
                        e.dataTransfer.setData("fromTeamId", team.id);
                      }}
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

      {/* שחקנים זמינים */}
      <div className="rounded-2xl bg-[#0f1a2e] border border-[#24324a] p-3">
        <h3 className="text-lg mb-2">רשימת שחקנים זמינים</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[50vh] overflow-auto">
          {unassigned.map((p) => (
            <div
              key={p.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("playerId", p.id);
                e.dataTransfer.setData("fromTeamId", "");
              }}
              className="rounded-xl bg-[#0b1220] border border-[#24324a] px-2 py-1 flex justify-between cursor-grab"
              title={p.name}
            >
              <span className="truncate">{p.name}</span>
              <span className="text-xs text-[#9fb0cb]">{p.rating}</span>
            </div>
          ))}
          {unassigned.length === 0 && (
            <div className="text-sm text-[#9fb0cb]">אין שחקנים זמינים.</div>
          )}
        </div>
      </div>

      {showPrint && (
        <PrintPreview
          teams={current.teams}
          players={players}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

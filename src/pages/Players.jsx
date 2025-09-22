// src/pages/Players.jsx
import React, { useState } from "react";
import { useAppStore } from "@/store/playerStorage";
import PlayerFormModal from "@/components/PlayerFormModal";

export default function PlayersPage() {
  const {
    sortedPlayers,
    addPlayer, updatePlayer, deletePlayer,
    togglePlayerPlays,
    sortBy, ui
  } = useAppStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);

  const openAdd = () => { setEditPlayer(null); setModalOpen(true); };
  const openEdit = (p) => { setEditPlayer(p); setModalOpen(true); };

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl">שחקנים</h2>
        <button
          onClick={openAdd}
          className="px-4 py-2 rounded-xl bg-[#27c463] text-[#0b1220] hover:opacity-90"
        >
          הוסף שחקן +
        </button>
      </div>

      <div className="overflow-auto max-h-[70vh] border border-[#24324a] rounded-xl">
        <table className="w-full border-separate border-spacing-y-1">
          <thead className="sticky top-0 bg-[#0f1a2e]">
            <tr>
              <Th onClick={() => sortBy("plays")} active={ui.sortBy==="plays"}>משחק?</Th>
              <Th onClick={() => sortBy("name")} active={ui.sortBy==="name"}>שם</Th>
              <Th onClick={() => sortBy("pos")} active={ui.sortBy==="pos"}>עמדה</Th>
              <Th onClick={() => sortBy("rating")} active={ui.sortBy==="rating"}>ציון</Th>
              <Th>חייב עם</Th>
              <Th>לא עם</Th>
              <Th>פעולות</Th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map(p => (
              <tr key={p.id}>
                <td className="px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={p.plays}
                    onChange={e => togglePlayerPlays(p.id, e.target.checked)}
                  />
                </td>
                <td className="px-2 py-1">{p.name}</td>
                <td className="px-2 py-1">{p.pos}</td>
                <td className="px-2 py-1 text-center">{p.rating}</td>
                <td className="px-2 py-1 text-sm text-[#9fb0cb]">{p.mustWith?.join(", ")}</td>
                <td className="px-2 py-1 text-sm text-[#9fb0cb]">{p.avoidWith?.join(", ")}</td>
                <td className="px-2 py-1">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="px-2 py-1 text-sm rounded-lg border border-[#24324a] hover:bg-white/5">ערוך</button>
                    <button
                      onClick={() => { if(confirm(`למחוק את ${p.name}?`)) deletePlayer(p.id); }}
                      className="px-2 py-1 text-sm rounded-lg border border-[#ff5c7a] text-[#ff5c7a] hover:bg-[#ff5c7a]/10"
                    >מחק</button>
                  </div>
                </td>
              </tr>
            ))}
            {sortedPlayers.length === 0 && (
              <tr><td colSpan={7} className="text-center text-sm text-[#9fb0cb] py-4">אין שחקנים.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PlayerFormModal
        open={modalOpen}
        initial={editPlayer}
        onClose={() => setModalOpen(false)}
        onSubmit={(pl) => {
          if (editPlayer) updatePlayer(pl);
          else addPlayer(pl);
          setModalOpen(false);
        }}
        existingNames={sortedPlayers.map(p => p.name)}
      />
    </div>
  );
}

function Th({ children, onClick, active }) {
  return (
    <th
      onClick={onClick}
      className={`px-2 py-1 cursor-pointer select-none text-sm ${active ? "text-[#27c463]" : "text-[#9fb0cb]"}`}
    >
      {children}
    </th>
  );
}

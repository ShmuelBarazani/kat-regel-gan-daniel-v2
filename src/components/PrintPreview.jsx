import React from "react";

export default function PrintPreview({ teams, players, onClose }) {
  const byId = new Map(players.map((p) => [p.id, p]));

  const GoalBoxes = ({ count = 10 }) => (
    <span style={{ display: "inline-grid", gridTemplateColumns: "repeat(10, 1em)", gap: "4px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ display: "inline-block", width: "1em", height: "1em", border: "1px solid #000" }} />
      ))}
    </span>
  );

  const exportAndPrint = () => window.print();

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 flex flex-col" dir="rtl">
      <div className="no-print p-3 flex gap-2">
        <button onClick={exportAndPrint} className="px-3 py-2 rounded-xl bg-[#27c463] text-[#0b1220]">ייצוא / הדפס PDF</button>
        <button onClick={onClose} className="px-3 py-2 rounded-xl border border-white/30 text-white">סגור</button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="print-wrap">
          {teams.map((t, idx) => (
            <div key={t.id} className="print-card" style={{ pageBreakInside: "avoid" }}>
              <div className="print-header">
                <div>{new Date().toISOString().split("T")[0]} :תאריך</div>
                <div>קבוצה {idx + 1}</div>
              </div>

              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: "40%" }}>שחקן</th>
                    <th>שערים</th>
                  </tr>
                </thead>
                <tbody>
                  {t.playerIds.map((pid) => {
                    const p = byId.get(pid);
                    if (!p) return null;
                    return (
                      <tr key={pid}>
                        <td>{p.name}</td>
                        <td><GoalBoxes /></td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={2} style={{ height: "8px" }} />
                  </tr>
                  <tr>
                    <td>ניצחון</td>
                    <td><GoalBoxes count={6} /></td>
                  </tr>
                  <tr>
                    <td>תיקו</td>
                    <td><GoalBoxes count={6} /></td>
                  </tr>
                  <tr>
                    <td>הפסד</td>
                    <td><GoalBoxes count={6} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* CSS פנימי לתצוגה/הדפסה */}
      <style>{`
        @media screen {
          .print-wrap {
            display:grid;
            grid-template-columns: repeat(2, minmax(320px, 1fr));
            gap: 16px;
          }
          .print-card {
            background:#fff; color:#000;
            border:1px solid #000; border-radius:8px; padding:12px;
          }
          .print-header {
            display:flex; justify-content:space-between; align-items:center;
            font-weight:700; margin-bottom:8px;
          }
          .print-table { width:100%; border-collapse:collapse; }
          .print-table th, .print-table td { border:1px solid #000; padding:6px 8px; }
        }
        @media print {
          *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
          body{ background:#fff !important; color:#000 !important; }
          .no-print{ display:none !important; }
          .print-wrap {
            display:grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10mm;
          }
          .print-card {
            background:#fff !important; color:#000 !important;
            border:1px solid #000 !important; border-radius:0 !important; padding:6mm;
            break-inside:avoid;
          }
          .print-header { display:flex; justify-content:space-between; font-weight:700; margin-bottom:4mm; }
          .print-table { width:100%; border-collapse:collapse; }
          .print-table th, .print-table td { border:1px solid #000 !important; padding:3mm 4mm !important; }
          @page{ size:A4 landscape; margin:10mm; }
        }
      `}</style>
    </div>
  );
}

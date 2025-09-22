import React, { useEffect, useRef } from "react";

const rtl = { direction: "rtl" };

function GoalsBoxes({ count = 12 }) {
  return (
    <div className="goals-boxes" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="gbox" />
      ))}
    </div>
  );
}

function TeamSheet({ team, index }) {
  return (
    <div className="sheet" style={rtl}>
      <div className="sheet-head">
        <div className="title">קבוצה {index + 1}</div>
        <div className="meta">תאריך {new Date().toISOString().slice(0, 10)}</div>
      </div>

      <div className="sheet-table">
        <div className="thead">
          <div className="th player">שחקן</div>
          <div className="th goals">שערים</div>
        </div>
        <div className="tbody">
          {/* מציג רק שחקנים קיימים - בלי שורות ריקות */}
          {team.players.map((p) => (
            <div className="tr" key={p.id ?? p.name}>
              <div className="td player">{p.name}</div>
              <div className="td goals">
                <GoalsBoxes />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="result-row">
        <span>ניצחון</span>
        <span className="square" />
        <span>תיקו</span>
        <span className="square" />
        <span>הפסד</span>
        <span className="square" />
      </div>
    </div>
  );
}

export default function PrintView({ teams, onClose }) {
  const printableRef = useRef(null);

  const handlePrint = () => {
    // מציג חלון הדפסה שבו רק תוכן ה־printable נראה (עמוד יחיד 2×2)
    window.print();
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // מדפיסים רק 4 קבוצות ראשונות בעמוד אחד (2×2)
  const four = teams.slice(0, 4);

  return (
    <div className="print-modal">
      <div className="print-card" style={rtl}>
        <div className="print-toolbar">
          <div className="left">
            <button className="primary" onClick={handlePrint}>
              הדפס / PDF
            </button>
          </div>
          <button className="ghost" onClick={onClose}>
            סגור
          </button>
        </div>

        <div className="printable" ref={printableRef}>
          <div className="sheets-grid">
            {four.map((t, i) => (
              <TeamSheet key={i} team={t} index={i} />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        :root {
          --bg: #0b1220;
          --card: #0f1a2e;
          --ink: #e8eefc;
          --muted: #9fb0cb;
          --edge: #24324a;
          --accent: #2e7d32;
        }
        .print-modal {
          position: fixed;
          inset: 0;
          background: rgba(7, 10, 18, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .print-card {
          width: min(1180px, 95vw);
          background: var(--bg);
          color: var(--ink);
          border: 1px solid var(--edge);
          border-radius: 16px;
          padding: 12px;
        }
        .print-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }
        .primary {
          background: var(--accent);
          color: var(--ink);
          border: none;
          padding: 8px 12px;
          border-radius: 12px;
          cursor: pointer;
        }
        .ghost {
          background: transparent;
          border: 1px solid var(--edge);
          color: var(--ink);
          padding: 8px 12px;
          border-radius: 12px;
          cursor: pointer;
        }

        .printable {
          background: var(--bg);
          padding: 6px;
        }
        .sheets-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 10px;
        }

        .sheet {
          background: var(--card);
          border: 1px solid var(--edge);
          border-radius: 12px;
          padding: 10px;
          break-inside: avoid;
        }
        .sheet-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .sheet-head .title {
          font-weight: 700;
        }
        .sheet-head .meta {
          color: var(--muted);
          font-size: 12px;
        }

        .sheet-table {
          border: 1px solid var(--edge);
          border-radius: 10px;
          overflow: hidden;
        }
        .thead,
        .tr {
          display: grid;
          grid-template-columns: 1fr 220px;
        }
        .thead {
          background: #132239;
          color: var(--ink);
          font-weight: 600;
        }
        .th,
        .td {
          padding: 8px 10px;
          border-bottom: 1px solid #1a2940;
        }
        .tbody .tr:last-child .td {
          border-bottom: none;
        }

        .goals-boxes {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 4px;
        }
        .gbox {
          display: block;
          width: 14px;
          height: 14px;
          border: 1px solid var(--edge);
          border-radius: 3px;
          background: #0b1628;
        }

        .result-row {
          display: grid;
          grid-template-columns: repeat(6, auto);
          gap: 10px;
          margin-top: 10px;
          align-items: center;
          color: var(--ink);
        }
        .square {
          width: 16px;
          height: 16px;
          border: 1px solid var(--edge);
          border-radius: 3px;
          display: inline-block;
        }

        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        @media print {
          /* מציג רק את תוכן המודאל בעמוד ההדפסה */
          body * {
            visibility: hidden !important;
          }
          .printable,
          .printable * {
            visibility: visible !important;
          }
          .printable {
            position: fixed;
            inset: 0 0 0 0;
            margin: 0 !important;
            padding: 0 !important;
          }
          .sheets-grid {
            gap: 8px;
          }
          .sheet {
            transform: scale(0.98);
            transform-origin: center;
            page-break-inside: avoid;
          }
          /* עוצר שבירות – עמוד יחיד עם 4 כרטיסים */
          html,
          body {
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}

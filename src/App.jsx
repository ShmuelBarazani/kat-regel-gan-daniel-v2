import React, { useMemo, useState } from "react";

/**
 * Kat Regel – Gan Daniel V2
 * שלד ראשי עם טאבים: שחקנים / קבוצות / תוצאות מחזור / דירוגים / טבלאות מובילים / מחזורים שמורים / הדפסה
 * את הקומפוננטים עצמם ניצור בקבצים נפרדים ב-src/components (בשלב הבא).
 */

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
  const [activeTab, setActiveTab] = useState("teams"); // ברירת־מחדל: מסך הקבוצות
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
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight">
            {title}
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBonusEnabled(v => !v)}
              className={`px-3 py-2 rounded-2xl text-sm border transition
                ${bonusEnabled
                  ? "border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                  : "border-slate-700 hover:bg-slate-800"
                }`}
              title="הפעל/בטל בונוס"
            >
              {bonusEnabled ? "בונוס: פעיל" : "בונוס: כבוי"}
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-2xl text-sm border border-slate-700 hover:bg-slate-800"
              title="הדפס"
            >
              🖨️ הדפס
            </button>
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
        {activeTab === "players" && (
          <Placeholder title="שחקנים">
            כאן נטען את הקובץ: <code>src/components/Players.jsx</code>
          </Placeholder>
        )}

        {activeTab === "teams" && (
          <Placeholder title="קבוצות">
            כאן נטען את הקובץ: <code>src/components/Teams.jsx</code>
            <br />
            * בגרסה המלאה נציג יצירת קבוצות, גרירה בין קבוצות, שמירת מחזור וכד׳.
          </Placeholder>
        )}

        {activeTab === "matchday" && (
          <Placeholder title="תוצאות מחזור">
            כאן נטען את הקובץ: <code>src/components/MatchdayResults.jsx</code>
          </Placeholder>
        )}

        {activeTab === "ranking" && (
          <Placeholder title="דירוגים">
            כאן נטען את הקובץ: <code>src/components/Ranking.jsx</code>
            <br />
            * כולל דירוג שבועי/חודשי, וניקוד (1 נק׳ לשער, 3 נק׳ לניצחון + בונוס לפי ההגדרות שלך).
          </Placeholder>
        )}

        {activeTab === "leaderboards" && (
          <Placeholder title="טבלאות מובילים">
            כאן נטען את הקובץ: <code>src/components/Leaderboards.jsx</code>
            <br />
            * לוחות כמו “אליפות החודש”, “מלך השערים” (חודשי/שנתי) וכו׳.
          </Placeholder>
        )}

        {activeTab === "saved" && (
          <Placeholder title="מחזורים שמורים">
            כאן נטען את הקובץ: <code>src/components/SavedCycles.jsx</code>
            <br />
            * כולל סימון/מחיקה, “סמן הכל/בטל”, וכפתור מחיקה לכל שורה.
          </Placeholder>
        )}

        {activeTab === "print" && (
          <Placeholder title="תצוגת הדפסה">
            כאן נטען את הקובץ: <code>src/components/PrintView.jsx</code>
            <br />
            * ההדפסה תכבד את CSS ההדפסה (A4 נוף, גבולות שחורים, ללא שכפול).
          </Placeholder>
        )}
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

function Placeholder({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-base sm:text-lg font-semibold mb-2">{title}</h2>
      <div className="text-sm text-slate-300 leading-6">{children}</div>
      <div className="mt-4 text-xs text-slate-400">
        (בשלב הבא ניצור את הקובץ הרלוונטי תחת <code>src/components</code> ונחבר אותו לכאן)
      </div>
    </section>
  );
}

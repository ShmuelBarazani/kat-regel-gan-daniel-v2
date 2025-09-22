import React from "react";

/**
 * Leaderboards
 * props:
 * - monthlyTop: Array<{ name, goals, points }>
 * - yearlyTop: Array<{ name, goals, points }>
 * - monthChampions: Array<{ month, champion, points }>
 * - sessions: Array<{ date, winner, points }>
 * - title?: string
 */
export default function Leaderboards({
  monthlyTop = [],
  yearlyTop = [],
  monthChampions = [],
  sessions = [],
  title = "לוחות דירוג",
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" dir="rtl">
      <header className="lg:col-span-2 mb-1">
        <h2 className="text-xl">{title}</h2>
      </header>

      <Card title="מלך השערים — חודשי">
        <SimpleTable
          headers={["#", "שחקן", "שערים", "נק'"]}
          rows={monthlyTop.map((r, i) => [i + 1, r.name, r.goals, r.points])}
          emptyText="אין נתונים לחודש הנוכחי"
        />
      </Card>

      <Card title="מלך השערים — שנתי">
        <SimpleTable
          headers={["#", "שחקן", "שערים", "נק'"]}
          rows={yearlyTop.map((r, i) => [i + 1, r.name, r.goals, r.points])}
          emptyText="אין נתונים לשנה הנוכחית"
        />
      </Card>

      <Card title="אלופי חודשים">
        <SimpleTable
          headers={["חודש", "אלוף", "נק'"]}
          rows={monthChampions.map((x) => [x.month, x.champion, x.points])}
          emptyText="אין עדיין אלופי חודשים"
        />
      </Card>

      <Card title="סשנים אחרונים">
        <SimpleTable
          headers={["תאריך", "מנצח", "נק'"]}
          rows={sessions.map((s) => [s.date, s.winner, s.points])}
          emptyText="אין היסטוריית סשנים"
        />
      </Card>
    </section>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl bg-[#0f1a2e] text-[#e8eefc] border border-[#24324a] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SimpleTable({ headers, rows, emptyText }) {
  return (
    <div className="overflow-auto max-h-[52vh]">
      <table className="w-full border-separate border-spacing-y-2">
        <thead className="sticky top-0 bg-[#0f1a2e]">
          <tr>
            {headers.map((h, idx) => (
              <th
                key={idx}
                className="text-right font-normal text-sm text-[#9fb0cb] pb-2"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="text-sm text-[#9fb0cb] py-4" colSpan={headers.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="rounded-xl">
                {r.map((cell, j) => (
                  <td
                    key={j}
                    className="bg-[#0b1220] border border-[#24324a] px-3 py-2 rounded-xl text-sm"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

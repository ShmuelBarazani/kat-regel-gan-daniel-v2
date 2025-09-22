import React from "react";

/**
 * MatchdayResults
 * props:
 * - teams: Array<{ id, name }>
 * - fixtures: Array<{ id, homeId, awayId, scoreHome, scoreAway }>
 * - onChangeFixture: (fixtureId, patch) => void
 * - scorers: Record<playerId, number>
 * - playersByTeam: Record<teamId, Array<{ id, name }>>
 * - onChangeScorer: (playerId, goals) => void
 */
export default function MatchdayResults({
  teams = [],
  fixtures = [],
  onChangeFixture,
  scorers = {},
  playersByTeam = {},
  onChangeScorer,
}) {
  const teamName = (id) => teams.find((t) => t.id === id)?.name ?? "—";

  return (
    <section className="grid grid-cols-1 xl:grid-cols-2 gap-4" dir="rtl">
      <div className="rounded-2xl bg-[#0f1a2e] border border-[#24324a] p-4">
        <h3 className="text-lg mb-3">תוצאות משחקים</h3>
        <div className="overflow-auto">
          <table className="w-full border-separate border-spacing-y-2">
            <thead className="sticky top-0 bg-[#0f1a2e]">
              <tr>
                <th className="text-right text-sm text-[#9fb0cb] font-normal">בית</th>
                <th />
                <th className="text-right text-sm text-[#9fb0cb] font-normal">חוץ</th>
                <th className="text-right text-sm text-[#9fb0cb] font-normal">תוצ׳</th>
              </tr>
            </thead>
            <tbody>
              {fixtures.map((fx) => (
                <tr key={fx.id}>
                  <td className="bg-[#0b1220] border border-[#24324a] rounded-xl px-3 py-2 text-sm">
                    {teamName(fx.homeId)}
                  </td>
                  <td className="text-center text-[#9fb0cb]">—</td>
                  <td className="bg-[#0b1220] border border-[#24324a] rounded-xl px-3 py-2 text-sm">
                    {teamName(fx.awayId)}
                  </td>
                  <td className="bg-[#0b1220] border border-[#24324a] rounded-xl px-2 py-1 text-sm">
                    <div className="flex items-center gap-2">
                      <NumberInput
                        value={fx.scoreHome}
                        onChange={(v) => onChangeFixture?.(fx.id, { scoreHome: v })}
                      />
                      <span>–</span>
                      <NumberInput
                        value={fx.scoreAway}
                        onChange={(v) => onChangeFixture?.(fx.id, { scoreAway: v })}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {fixtures.length === 0 && (
                <tr>
                  <td className="text-sm text-[#9fb0cb] py-2" colSpan={4}>
                    אין משחקים למחזור זה.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-[#0f1a2e] border border-[#24324a] p-4">
        <h3 className="text-lg mb-3">כובשי שערים</h3>
        <div className="space-y-4">
          {Object.entries(playersByTeam).map(([teamId, plist]) => (
            <div key={teamId}>
              <div className="text-sm text-[#9fb0cb] mb-2">
                {plist?.length ? `קבוצה: ${plist[0]?.teamName ?? ""}` : "קבוצה"}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {plist.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-[#0b1220] border border-[#24324a] rounded-xl px-3 py-2"
                    title={p.name}
                  >
                    <span className="truncate text-sm">{p.name}</span>
                    <NumberInput
                      min={0}
                      max={20}
                      value={Number(scorers[p.id] ?? 0)}
                      onChange={(v) => onChangeScorer?.(p.id, v)}
                    />
                  </div>
                ))}
                {(!plist || plist.length === 0) && (
                  <div className="text-sm text-[#9fb0cb]">אין שחקנים בקבוצה.</div>
                )}
              </div>
            </div>
          ))}
          {Object.keys(playersByTeam).length === 0 && (
            <div className="text-sm text-[#9fb0cb]">לא נטענו קבוצות/שחקנים.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function NumberInput({ value, onChange, min = 0, max = 99 }) {
  const safe = (n) => {
    const v = Number(n);
    if (Number.isNaN(v)) return 0;
    return Math.max(min, Math.min(max, v));
    }
  return (
    <input
      type="number"
      className="w-16 text-center rounded-lg bg-[#091223] border border-[#24324a] px-2 py-1 outline-none focus:ring-2 focus:ring-[#2575fc]"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      onChange={(e) => onChange?.(safe(e.target.value))}
    />
  );
}

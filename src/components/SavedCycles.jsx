import React, { useRef } from "react";

/**
 * SavedCycles
 * props:
 * - cycles: Array<{ id, name, dateISO }>
 * - onOpen: (id) => void
 * - onDelete: (id) => void
 * - onExportAll?: () => void
 * - onImportFile?: (jsonString) => void
 */
export default function SavedCycles({
  cycles = [],
  onOpen,
  onDelete,
  onExportAll,
  onImportFile,
}) {
  const fileRef = useRef(null);

  const importJson = async (file) => {
    if (!file) return;
    const txt = await file.text();
    onImportFile?.(txt);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="rounded-2xl bg-[#0f1a2e] text-[#e8eefc] border border-[#24324a] p-4" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg">מחזורים שמורים</h3>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-xl border border-[#24324a] hover:bg-white/5"
            onClick={onExportAll}
            title="ייצוא כל הנתונים לקובץ JSON"
          >
            ייצוא JSON
          </button>
          <label className="px-3 py-1.5 rounded-xl border border-[#24324a] hover:bg-white/5 cursor-pointer">
            ייבוא JSON
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => importJson(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      <div className="overflow-auto max-h-[56vh]">
        <table className="w-full border-separate border-spacing-y-2">
          <thead className="sticky top-0 bg-[#0f1a2e]">
            <tr>
              <th className="text-right font-normal text-sm text-[#9fb0cb] pb-2">שם מחזור</th>
              <th className="text-right font-normal text-sm text-[#9fb0cb] pb-2">תאריך</th>
              <th className="text-right font-normal text-sm text-[#9fb0cb] pb-2">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {cycles.length === 0 && (
              <tr>
                <td className="text-sm text-[#9fb0cb] py-2" colSpan={3}>
                  אין מחזורים שמורים.
                </td>
              </tr>
            )}
            {cycles.map((c) => (
              <tr key={c.id}>
                <td className="bg-[#0b1220] border border-[#24324a] rounded-xl px-3 py-2 text-sm">
                  {c.name}
                </td>
                <td className="bg-[#0b1220] border border-[#24324a] rounded-xl px-3 py-2 text-sm">
                  {formatDate(c.dateISO)}
                </td>
                <td className="bg-[#0b1220] border border-[#24324a] rounded-xl px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 rounded-lg bg-[#27c463] text-[#0b1220] hover:opacity-90"
                      onClick={() => onOpen?.(c.id)}
                    >
                      פתח
                    </button>
                    <button
                      className="px-3 py-1 rounded-lg border border-[#24324a] hover:bg-white/5"
                      onClick={() => {
                        if (confirm(`למחוק את "${c.name}"? הפעולה בלתי הפיכה.`)) {
                          onDelete?.(c.id);
                        }
                      }}
                    >
                      מחק
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

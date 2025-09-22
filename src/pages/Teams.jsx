// pages/Teams.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ========= עזרי אחסון ========= */
const LS_KEYS = {
  PLAYERS: "players",          // מגיע ממסך "שחקנים"
  DRAFT: "teams_draft_v1",     // טיוטת מחזור אחרונה
  UI: "teams_ui_state_v1",     // מצב UI (הסתר ציונים וכד')
};

function loadPlayers() {
  try {
    const raw = localStorage.getItem(LS_KEYS.PLAYERS);
    const arr = JSON.parse(raw || "[]");
    // ננרמל שדות בסיסיים ונשאיר רק השחקנים המסומנים כ"משחק?"
    return arr
      .map((p, idx) => ({
        id: p.id ?? `${p.name}-${idx}`,
        name: p.name?.trim() || "ללא שם",
        pos: p.pos || "MF",
        rating: typeof p.rating === "number" ? p.rating : parseFloat(p.rating) || 0,
        mustWith: Array.isArray(p.mustWith) ? p.mustWith : [],
        notWith: Array.isArray(p.notWith) ? p.notWith : [],
        active: p.active !== false, // ברירת מחדל: משחק
      }))
      .filter((p) => p.active);
  } catch {
    return [];
  }
}

function saveDraft(draft) {
  localStorage.setItem(LS_KEYS.DRAFT, JSON.stringify(draft));
}

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS.DRAFT) || "null");
  } catch {
    return null;
  }
}

function loadUiState() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS.UI) || "null") || { hideRatingsInCards: false, teamsCount: 4 };
  } catch {
    return { hideRatingsInCards: false, teamsCount: 4 };
  }
}

function saveUiState(ui) {
  localStorage.setItem(LS_KEYS.UI, JSON.stringify(ui));
}

/* ========= עזרי לוגיקה ========= */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initialEmptyTeams(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `קבוצה ${i + 1}`,
    players: [],
  }));
}

function teamStats(team) {
  const cnt = team.players.length;
  const sum = team.players.reduce((s, p) => s + (p.rating || 0), 0);
  const avg = cnt ? (sum / cnt) : 0;
  return { count: cnt, sum, avg: Math.round(avg * 10) / 10 };
}

function sizeTargetBuckets(playersCount, teamsCount) {
  // חלוקת גדלים מאוזנת ±1
  const base = Math.floor(playersCount / teamsCount);
  const extra = playersCount % teamsCount;
  return Array.from({ length: teamsCount }, (_, i) => base + (i < extra ? 1 : 0));
}

function violatesNotWith(team, player) {
  // חסימת "לא־עם": אם בקבוצה יש מישהו מרשימת notWith של השחקן – נחסום
  if (!player?.notWith?.length) return false;
  const namesInTeam = new Set(team.players.map((p) => p.name));
  return player.notWith.some((n) => namesInTeam.has(n));
}

function mustWithWarning(teams) {
  // מייצר רשימת אזהרות "חייב־עם" אם זוגות לא יחד
  const warnings = [];
  const nameToTeam = new Map();
  teams.forEach((t, ti) => t.players.forEach((p) => nameToTeam.set(p.name, ti)));

  teams.forEach((t) => {
    t.players.forEach((p) => {
      (p.mustWith || []).forEach((m) => {
        const t1 = nameToTeam.get(p.name);
        const t2 = nameToTeam.get(m);
        if (t2 !== undefined && t1 !== t2) {
          warnings.push(`${p.name} חייב לשחק עם ${m} (כעת מופרדים)`);
        }
      });
    });
  });

  return Array.from(new Set(warnings));
}

function canDropIntoTeam(team, player, targetMaxSize) {
  if (team.players.length >= targetMaxSize) return false;
  if (violatesNotWith(team, player)) return false;
  return true;
}

/* ========= חלוקה אקראית עם שמירה על חסימות ואיזון ========= */
function buildRandomTeams(players, teamsCount) {
  const targets = sizeTargetBuckets(players.length, teamsCount);
  const teams = initialEmptyTeams(teamsCount);

  const randomized = shuffle(players);
  // גרידי: נעבור על שחקנים ונשבץ היכן שאפשר בלי להפר את notWith ובטווח הגודל
  randomized.forEach((p) => {
    // סדר עדיפות: קבוצות שעדיין "חסרות" ביחס ליעד
    const order = teams
      .map((t, i) => ({ i, t, need: targets[i] - t.players.length }))
      .filter((x) => x.need > 0)
      .sort((a, b) => b.need - a.need);

    let placed = false;
    for (const o of order) {
      if (canDropIntoTeam(o.t, p, targets[o.i])) {
        o.t.players.push(p);
        placed = true;
        break;
      }
    }

    // אם לא הצלחנו (בגלל notWith), נכניס למקום הראשון עם מקום פנוי – גם אם יפר איזון, כדי לא לאבד שחקן
    if (!placed) {
      const idx = teams.findIndex((t, i) => t.players.length < targets[i]);
      if (idx >= 0) teams[idx].players.push(p);
      else teams[0].players.push(p);
    }
  });

  return teams;
}

/* ========= קומפוננטת מסך ========= */
export default function TeamsPage() {
  const [players, setPlayers] = useState([]);
  const [teamsCount, setTeamsCount] = useState(4);
  const [teams, setTeams] = useState(initialEmptyTeams(4));
  const [hideRatingsInCards, setHideRatingsInCards] = useState(false);
  const [hoverWarn, setHoverWarn] = useState(null); // טקסט אזהרה על Drop לא חוקי

  // דרג/דרופ – מצביע על שחקן שנגרר
  const [dragging, setDragging] = useState(null);

  // טעינת נתונים ראשונית
  useEffect(() => {
    const basePlayers = loadPlayers();
    setPlayers(basePlayers);

    const ui = loadUiState();
    setHideRatingsInCards(!!ui.hideRatingsInCards);
    setTeamsCount(ui.teamsCount || 4);

    // אם יש טיוטה – נטען (לא אוטומטי "עשה כוחות")
    const draft = loadDraft();
    if (draft && draft.teamsCount) {
      setTeams(draft.teams || initialEmptyTeams(draft.teamsCount));
      setTeamsCount(draft.teamsCount);
    } else {
      setTeams(initialEmptyTeams(ui.teamsCount || 4));
    }
  }, []);

  // מס’ פעילים
  const activeCount = useMemo(() => players.length, [players]);

  // יעדי גודל
  const targetBuckets = useMemo(
    () => sizeTargetBuckets(activeCount, teamsCount),
    [activeCount, teamsCount]
  );

  // חישוב אזהרות "חייב־עם"
  const mustWithAlerts = useMemo(() => mustWithWarning(teams), [teams]);

  /* ====== פעולות עיקריות ====== */
  function handleMakeTeams() {
    const fresh = buildRandomTeams(players, teamsCount);
    setTeams(fresh);
  }

  function handleSaveDraft() {
    const payload = {
      savedAt: new Date().toISOString(),
      teamsCount,
      teams,
    };
    saveDraft(payload);
    alert("הטיוטה נשמרה (localStorage).");
  }

  function handleClearTeams() {
    setTeams(initialEmptyTeams(teamsCount));
  }

  function onToggleHideRatingsCards() {
    const next = !hideRatingsInCards;
    setHideRatingsInCards(next);
    saveUiState({ hideRatingsInCards: next, teamsCount });
  }

  function onChangeTeamsCount(n) {
    const num = Math.max(2, Math.min(8, Number(n) || 4));
    setTeamsCount(num);
    saveUiState({ hideRatingsInCards, teamsCount: num });
    setTeams(initialEmptyTeams(num)); // ריקון כשהמשתמש משנה מס’ קבוצות
  }

  /* ====== Drag & Drop ====== */
  function onDragStartFromTable(p) {
    setDragging({ from: "table", player: p });
  }
  function onDragStartFromTeam(teamIdx, pIdx) {
    setDragging({ from: "team", teamIdx, pIdx, player: teams[teamIdx].players[pIdx] });
  }
  function onDragEnd() {
    setDragging(null);
    setHoverWarn(null);
  }

  function onTeamDragOver(e, teamIdx) {
    e.preventDefault();
    if (!dragging) return;
    const t = teams[teamIdx];
    const targetMax = targetBuckets[teamIdx];

    if (!canDropIntoTeam(t, dragging.player, targetMax)) {
      setHoverWarn("אי אפשר לשבץ כאן (חסימת 'לא־עם' או שהקבוצה מלאה)");
    } else {
      setHoverWarn(null);
    }
  }

  function onTeamDrop(e, teamIdx) {
    e.preventDefault();
    if (!dragging) return;

    const t = teams[teamIdx];
    const targetMax = targetBuckets[teamIdx];
    if (!canDropIntoTeam(t, dragging.player, targetMax)) return onDragEnd();

    const next = teams.map((x) => ({ ...x, players: [...x.players] }));

    if (dragging.from === "team") {
      // הוצאה מקבוצה ישנה
      next[dragging.teamIdx].players.splice(dragging.pIdx, 1);
    }
    // הכנסת שחקן לקבוצה החדשה
    next[teamIdx].players.push(dragging.player);
    setTeams(next);
    onDragEnd();
  }

  function onTableDragOver(e) {
    e.preventDefault();
  }
  function onTableDrop(e) {
    e.preventDefault();
    if (!dragging || dragging.from !== "team") return;
    // מחזירים לטבלה (כלומר, הסרה מהקבוצה)
    const next = teams.map((x) => ({ ...x, players: [...x.players] }));
    next[dragging.teamIdx].players.splice(dragging.pIdx, 1);
    setTeams(next);
    onDragEnd();
  }

  function removeFromTeam(teamIdx, pIdx) {
    const next = teams.map((x) => ({ ...x, players: [...x.players] }));
    next[teamIdx].players.splice(pIdx, 1);
    setTeams(next);
  }

  /* ====== UI ====== */
  return (
    <div className="page teams-page" style={{ padding: "16px 12px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}>קטרגל־גן דניאל ⚽</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>מס׳ קבוצות</span>
            <select
              value={teamsCount}
              onChange={(e) => onChangeTeamsCount(e.target.value)}
              className="pill"
              style={{ padding: "6px 10px", borderRadius: 999 }}
            >
              {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>

          <button className="btn" onClick={handleMakeTeams}>עשה כוחות</button>
          <button className="btn ghost" onClick={handleClearTeams}>איפוס</button>
          <button className="btn" onClick={handleSaveDraft}>שמור מחזור (טיוטה)</button>

          <label className="pill" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999 }}>
            <input
              type="checkbox"
              checked={hideRatingsInCards}
              onChange={onToggleHideRatingsCards}
            />
            <span>הסתר ציונים (בכרטיסים בלבד)</span>
          </label>
        </div>
      </header>

      <section aria-label="כרטיסי הקבוצות" style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 8px 0", opacity: 0.9 }}>קבוצות למחזור</h2>

        {hoverWarn && (
          <div className="warn" style={{ margin: "6px 0 10px", padding: "8px 12px", borderRadius: 8, border: "1px dashed var(--edge, #334)", background: "var(--card, #0f1a2e)" }}>
            {hoverWarn}
          </div>
        )}

        {mustWithAlerts.length > 0 && (
          <div className="warn" style={{ margin: "6px 0 10px", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--warn, #ff5c7a)", background: "rgba(255,92,122,0.08)" }}>
            {mustWithAlerts.map((w, i) => <div key={i}>⚠️ {w}</div>)}
          </div>
        )}

        <div
          className="teams-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {teams.map((t, ti) => {
            const stats = teamStats(t);
            const target = targetBuckets[ti] ?? 0;
            const full = t.players.length >= target;
            return (
              <div
                key={t.id}
                className={`card team-card ${full ? "full" : ""}`}
                onDragOver={(e) => onTeamDragOver(e, ti)}
                onDrop={(e) => onTeamDrop(e, ti)}
                style={{
                  border: "1px solid var(--edge, #24324a)",
                  background: "var(--card, #0f1a2e)",
                  borderRadius: 14,
                  padding: 12,
                  minHeight: 140,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    ממוצע {stats.avg} | סכ״כ {stats.sum.toFixed(1)} | {stats.count}/{target}
                  </div>
                </div>

                <ul style={{ listStyle: "disc", paddingInlineStart: 20, margin: 0 }}>
                  {t.players.map((p, pi) => (
                    <li
                      key={p.id}
                      draggable
                      onDragStart={() => onDragStartFromTeam(ti, pi)}
                      onDragEnd={onDragEnd}
                      title="גרור החוצה כדי להחזיר לטבלת השחקנים"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "6px 8px",
                        borderRadius: 8,
                        margin: "4px 0",
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ opacity: 0.9 }}>{p.name}</span>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>({p.pos})</span>
                        {!hideRatingsInCards && (
                          <span className="badge" style={{ fontSize: 12, opacity: 0.9 }}>ציון {p.rating}</span>
                        )}
                      </div>
                      <button className="btn tiny ghost" onClick={() => removeFromTeam(ti, pi)}>הסר</button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label="טבלת השחקנים" style={{ marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 style={{ margin: "0 0 8px 0", opacity: 0.9 }}>רשימת השחקנים</h2>
          <small style={{ opacity: 0.8 }}>גרור שחקן מהטבלה לכרטיס קבוצה, או גרור משם חזרה לכאן.</small>
        </div>

        <div
          className="table-wrap"
          onDragOver={onTableDragOver}
          onDrop={onTableDrop}
          style={{
            overflow: "auto",
            maxHeight: 420,
            border: "1px solid var(--edge, #24324a)",
            borderRadius: 12,
          }}
        >
          <table className="players-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--card, #0f1a2e)", zIndex: 1 }}>
              <tr>
                <th style={th}>משחק?</th>
                <th style={th}>שם</th>
                <th style={th}>עמדה</th>
                <th style={th}>ציון</th>
                <th style={th}>חייב־עם</th>
                <th style={th}>לא־עם</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                // נסמן אם כרגע נמצא באחת הקבוצות
                const inTeam = teams.some((t) => t.players.some((x) => x.id === p.id));
                return (
                  <tr key={p.id}>
                    <td style={tdCenter}>
                      <input type="checkbox" checked={!inTeam} readOnly />
                    </td>
                    <td
                      style={{ ...td, cursor: "grab", userSelect: "none" }}
                      draggable
                      onDragStart={() => onDragStartFromTable(p)}
                      onDragEnd={onDragEnd}
                      title="גרור אל אחת הקבוצות"
                    >
                      {p.name}
                    </td>
                    <td style={td}>{p.pos}</td>
                    <td style={td}>{p.rating}</td>
                    <td style={tdSmall}>{p.mustWith?.length ? p.mustWith.join(", ") : "—"}</td>
                    <td style={tdSmall}>{p.notWith?.length ? p.notWith.join(", ") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ========= סגנונות עזר קטנים (לא מחליפים את ה־CSS הקיים אצלך) ========= */
const th = { textAlign: "right", padding: "10px 12px", borderBottom: "1px solid var(--edge, #24324a)", whiteSpace: "nowrap" };
const td = { textAlign: "right", padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" };
const tdSmall = { ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const tdCenter = { ...td, textAlign: "center" };

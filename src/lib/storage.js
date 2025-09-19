// src/lib/storage.js
import { useEffect, useState } from "react";

// JSON עם הציונים האמיתיים – יושב בשורש הפרויקט: /data/players.json
// הקובץ הזה נכנס לבאנדל, אז אפשר לייבא אותו ישירות.
import DATA_PLAYERS from "../../data/players.json";

const LS = {
  players: "katregel_players_v3",
  cycles:  "katregel_cycles_v3",
  ui:      "katregel_ui_v3",
};

const PUBLIC_JSON = "/players.json"; // אם קיים ב-public נטען קודם

export function useStorage() {
  const [players, setPlayers] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [ui, setUi] = useState({
    hiddenRatings: false,
    bonusWeek: false,
    bonusMonth: false,
  });

  // טעינה ראשונית
  useEffect(() => {
    (async () => {
      try {
        const pLS = safeParse(localStorage.getItem(LS.players));
        const cLS = safeParse(localStorage.getItem(LS.cycles)) || [];
        const uLS = safeParse(localStorage.getItem(LS.ui));

        if (Array.isArray(cLS)) setCycles(cLS);
        if (uLS) setUi(uLS);

        // 1) אם יש players ב-LS אבל הציונים לא “אמיתיים” → נדלג וניטען מחדש
        if (Array.isArray(pLS) && pLS.length) {
          const mapped = pLS.map(toPlayer);
          if (hasDiverseRatings(mapped)) {
            setPlayers(mapped);
            return;
          }
        }

        // 2) טעינה חכמה: public → ואם לא טוב/אין ציונים אמיתיים → data/players.json
        const smart = await fetchPlayersSmart();
        setPlayers(smart);
      } catch {
        // נפילה אחרונה: data/players.json
        setPlayers(mapPlayers(DATA_PLAYERS));
      }
    })();
  }, []);

  // שמירות
  useEffect(() => {
    localStorage.setItem(LS.players, JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem(LS.cycles, JSON.stringify(cycles));
  }, [cycles]);

  useEffect(() => {
    localStorage.setItem(LS.ui, JSON.stringify(ui));
  }, [ui]);

  return {
    players, setPlayers,
    cycles, setCycles,
    hiddenRatings: ui.hiddenRatings,
    setHi

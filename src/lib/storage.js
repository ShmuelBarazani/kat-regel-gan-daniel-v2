// src/lib/storage.js
export const KEYS = {
  PLAYERS: 'katregel_players_v2',
  TEAMS:   'katregel_last_teams_v2',
  ROUNDS:  'katregel_rounds_v2',
};

const read = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// Players
export const getPlayers = (fallback = []) => read(KEYS.PLAYERS, fallback);
export const setPlayers = (players) => write(KEYS.PLAYERS, players);

// Last teams state (for “עשה כוחות” חזרה למסך)
export const getTeamsState = () => read(KEYS.TEAMS, { teamCount: 4, groups: [] });
export const setTeamsState = (state) => write(KEYS.TEAMS, state);

// Saved rounds
export const getRounds = () => read(KEYS.ROUNDS, []);
export const setRounds = (rounds) => write(KEYS.ROUNDS, rounds);
export const addRound = (round) => {
  const list = getRounds();
  list.unshift(round);
  setRounds(list);
};

// Helpers
export const countActive = (players) => players.filter(p => !!p.play).length;

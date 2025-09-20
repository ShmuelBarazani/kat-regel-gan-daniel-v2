import React, { createContext, useEffect, useMemo, useState } from "react";
import PlayersPage from "./pages/Players.jsx";
import TeamsPage from "./pages/Teams.jsx";
import RankingPage from "./pages/Ranking.jsx";
import AdminPage from "./pages/Admin.jsx";

export const AppCtx = createContext(null);

const css = {
  page:{minHeight:"100vh",background:"#0b131f",color:"#dbeafe"},
  wrap:{maxWidth:1320,margin:"0 auto",padding:16,display:"flex",flexDirection:"column",gap:12},
  title:{textAlign:"center",fontSize:28,margin:"6px 0"},
  tabs:{display:"flex",justifyContent:"center",gap:8,marginBottom:6,flexWrap:"wrap"},
  pill:(on)=>({padding:"8px 12px",borderRadius:999,border:"1px solid #2a425f",cursor:"pointer",
               background:on?"#1d2a4a":"transparent",color:"#a7f3d0"}),
  bar:{display:"flex",justifyContent:"space-between",alignItems:"center"},
  card:{background:"#0f172a",border:"1px solid #1d2a4a",borderRadius:12},
  body:{padding:12},
  counter:{fontSize:13,color:"#93c5fd"}
};

const LS = {
  players: "tm_players_v2",
  teams:   "tm_current_teams_v2",
  sessions:"tm_sessions_v2",
  ui:      "tm_ui_v2",
};

export default function App(){
  const [tab,setTab]=useState("players");

  // שחקנים
  const [players,setPlayers]=useState(()=>{
    const s=localStorage.getItem(LS.players);
    if(s) try{return JSON.parse(s)}catch{}
    return [];
  });
  useEffect(()=>localStorage.setItem(LS.players,JSON.stringify(players)),[players]);

  // כוחות נוכחיים
  const [teams,setTeams]=useState(()=>{
    const s=localStorage.getItem(LS.teams);
    if(s) try{return JSON.parse(s)}catch{}
    return [];
  });
  useEffect(()=>localStorage.setItem(LS.teams,JSON.stringify(teams)),[teams]);

  // מחזורים (טיוטות+מפורסמים)
  const [sessions,setSessions]=useState(()=>{
    const s=localStorage.getItem(LS.sessions);
    if(s) try{return JSON.parse(s)}catch{}
    return [];
  });
  useEffect(()=>localStorage.setItem(LS.sessions,JSON.stringify(sessions)),[sessions]);

  // UI קטן
  const [ui,setUi]=useState(()=>{
    const s=localStorage.getItem(LS.ui);
    if(s) try{return JSON.parse(s)}catch{}
    return {showRatings:true};
  });
  useEffect(()=>localStorage.setItem(LS.ui,JSON.stringify(ui)),[ui]);

  const ctx = useMemo(()=>({
    players,setPlayers,
    teams,setTeams,
    sessions,setSessions,
    ui,setUi
  }),[players,teams,sessions,ui]);

  return (
    <div style={css.page}>
      <div style={css.wrap}>
        <h1 style={css.title}>קטרגל גן-דניאל ⚽</h1>

        <nav style={css.tabs}>
          <button style={css.pill(tab==="players")} onClick={()=>setTab("players")}>שחקנים</button>
          <button style={css.pill(tab==="teams")}   onClick={()=>setTab("teams")}>עשה כוחות / מחזור</button>
          <button style={css.pill(tab==="ranking")} onClick={()=>setTab("ranking")}>דירוג</button>
          <button style={css.pill(tab==="admin")}   onClick={()=>setTab("admin")}>מנהל</button>
        </nav>

        <AppCtx.Provider value={ctx}>
          {tab==="players" && <PlayersPage />}
          {tab==="teams"   && <TeamsPage />}
          {tab==="ranking" && <RankingPage />}
          {tab==="admin"   && <AdminPage />}
        </AppCtx.Provider>
      </div>
    </div>
  );
}

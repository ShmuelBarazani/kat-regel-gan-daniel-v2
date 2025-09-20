import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import TopNav from "./components/TopNav.jsx";

// מסכים שאתה כבר מחזיק (הדבקת אותם בשיחות הקודמות)
import Players from "./pages/Players.jsx";
import DoForces from "./pages/DoForces.jsx";

export default function App() {
  return (
    <div dir="rtl" style={{minHeight:"100vh", background:"#0a101b", color:"#e8eefc"}}>
      {/* Header */}
      <header style={{maxWidth:1180, margin:"20px auto 12px", padding:"0 12px"}}>
        <h1 style={{margin:0, fontSize:32, display:"flex", alignItems:"center", gap:10}}>
          <span role="img" aria-label="soccer">⚽</span> קטרגל-גן דניאל
        </h1>
        <TopNav />
      </header>

      {/* תוכן הדפים */}
      <main style={{maxWidth:1180, margin:"0 auto 40px", padding:"0 12px"}}>
        <Routes>
          {/* דף ברירת מחדל → שחקנים */}
          <Route path="/" element={<Navigate to="/players" replace />} />
          <Route path="/players" element={<Players />} />
          <Route path="/round"   element={<DoForces />} />
          {/* ליתר ביטחון: לא נמצא */}
          <Route path="*" element={<Navigate to="/players" replace />} />
        </Routes>
      </main>

      {/* סטייל בסיסי לכפתורים/טאבים (כהה-ירוק כפי שביקשת) */}
      <style>{`
        .btn{padding:7px 12px;border-radius:999px;border:1px solid #1e3b2f;background:#0e201a;color:#e8eefc;cursor:pointer}
        .btn:hover{filter:brightness(1.08)}
        .btn.primary{background:#1f6f43;border-color:#1f6f43}
        .btn.danger{background:#ff5c7a;border-color:#ff5c7a;color:white}
        .chip{background:#0f1a2e;border:1px solid #24324a;color:#e8eefc;border-radius:999px;padding:6px 10px}

        /* ניווט עליון */
        .tabs{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
        .tab{padding:8px 14px;border-radius:999px;border:1px solid #1e3b2f;background:#0e201a;color:#e8eefc;text-decoration:none}
        .tab:hover{filter:brightness(1.08)}
        .tab.active{background:#1f6f43;border-color:#1f6f43}
        input, select{background:#0b1220;color:#e8eefc;border:1px solid #24324a;border-radius:10px;padding:6px}
        .card{background:#0f1a2e;border:1px solid #24324a;border-radius:16px;padding:12px}
      `}</style>
    </div>
  );
}

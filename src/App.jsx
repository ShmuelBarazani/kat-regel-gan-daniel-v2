// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";

// מסכים (ודא שקבצים אלו קיימים במסלול הזה בדיוק)
import Players from "./pages/Players.jsx";
import DoForces from "./pages/DoForces.jsx";   // ← מסך עשה כוחות / מחזור
import Ranking from "./pages/Ranking.jsx";
import Admin from "./pages/Admin.jsx";

import "./styles.css";

// רכיב טאבים עליון
function Tabs() {
  const { pathname } = useLocation();
  const Tab = ({ to, children }) => (
    <Link to={to} className={`pill-tab ${pathname === to ? "active" : ""}`}>
      {children}
    </Link>
  );

  return (
    <nav className="tabs" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Tab to="/players">שחקנים</Tab>
      <Tab to="/forces">עשה כוחות / מחזור</Tab>
      <Tab to="/ranking">דירוג</Tab>
      <Tab to="/admin">מנהל</Tab>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="page-wrap" style={{ padding: "16px 12px" }}>
        <header className="site-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>קטרגל־גן דניאל ⚽</h1>
          <Tabs />
        </header>

        <main>
          <Routes>
            {/* ברירת מחדל: נוחתים למסך השחקנים */}
            <Route path="/" element={<Players />} />
            <Route path="/players" element={<Players />} />
            <Route path="/forces" element={<DoForces />} />   {/* ← חשוב: מפנה ל-DoForces.jsx */}
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

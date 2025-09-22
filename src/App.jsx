// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Players from "./pages/Players";
import TeamMaker from "./pages/TeamMaker";
import Ranking from "./pages/Ranking";
import Admin from "./pages/Admin";
import "./styles.css";   // ✅ זה מה שמביא את העיצוב של מסך הקבוצות
import "./print.css";    // ✅ לעיצוב Print Preview

export default function App() {
  return (
    <Router>
      <div className="app">
        <header className="header">
          <h1>קטרגל גן-דניאל ⚽</h1>
          <nav>
            <Link to="/players">שחקנים</Link>
            <Link to="/teams">עשה כוחות / מחזור</Link>
            <Link to="/ranking">דירוג</Link>
            <Link to="/admin">מנהל</Link>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/players" element={<Players />} />
            <Route path="/teams" element={<TeamMaker />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<TeamMaker />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

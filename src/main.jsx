// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// אם יש לך קובץ CSS כללי, השאר את הייבוא הזה/התאם את הנתיב:
import "./styles/styles.css";

const el = document.getElementById("root");
createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

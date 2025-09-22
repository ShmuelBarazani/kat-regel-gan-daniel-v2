// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// כאן ייבוא ה-CSS במקום אחד בלבד
import "./styles.css"; 
// אם הקובץ שלך נמצא בתוך תיקייה src/styles/styles.css:
// שנה לשורה: import "./styles/styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

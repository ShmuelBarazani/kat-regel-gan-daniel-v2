// src/pages/Teams.jsx
// עטיפה שמרנדרת את TeamMaker — כך שגם אם ניווט פונה ל-"Teams" נטען את המסך הנכון

import React from "react";
import TeamMaker from "./TeamMaker";

export default function TeamsPage(props) {
  return <TeamMaker {...props} />;
}

// src/pages/Ranking.jsx
import React from "react";
import Leaderboards from "@/components/Leaderboards";

export default function RankingPage() {
  // TODO: בעתיד להביא נתוני דירוג מחושבים
  const dummyMonthly = [];
  const dummyYearly = [];
  const dummyMonthChamps = [];
  const dummySessions = [];

  return (
    <div className="p-4" dir="rtl">
      <h2 className="text-2xl mb-4">דירוגים</h2>
      <Leaderboards
        monthlyTop={dummyMonthly}
        yearlyTop={dummyYearly}
        monthChampions={dummyMonthChamps}
        sessions={dummySessions}
      />
    </div>
  );
}

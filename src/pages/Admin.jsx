import React from "react";

const KEY = "katregel.roundDrafts.v1";

export default function Admin(){
  const drafts = JSON.parse(localStorage.getItem(KEY) || "[]");
  return (
    <div>
      <h2 style={{margin:"0 0 10px"}}>טיוטות מחזורים</h2>
      {drafts.length===0 && <div className="card">אין טיוטות שמורות.</div>}

      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:12}}>
        {drafts.map((d,i)=>(
          <div key={i} className="card">
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:8}}>
              <b>{new Date(d.ts).toLocaleString()}</b>
              <span style={{color:"#9fb0cb"}}>{d.totals.teamsCount} קבוצות · {d.totals.active} שחקנים</span>
            </div>

            {d.teams.map((t,idx)=>(
              <div key={idx} style={{marginBottom:8}}>
                <b>{t.name}</b>
                <ul style={{listStyle:"none", padding:0, margin:"4px 0 0"}}>
                  {t.players.map(p=>(
                    <li key={p.id}
                        style={{display:"flex", justifyContent:"space-between", borderTop:"1px dashed #24324a", padding:"3px 0"}}>
                      <span>{p.name} ({p.pos})</span>
                      <span>{p.rating}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

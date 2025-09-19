import React, { useEffect, useMemo, useState } from "react";

const POSITIONS = ["GK","DF","MF","FW"];
const RATINGS = Array.from({length:19},(_,i)=> (1 + i*0.5).toFixed(1));

const LS_KEY = "krgd_v2_players";

export default function Players(){
  const [players,setPlayers]=useState([]);
  const [form,setForm]=useState({name:"",pos:"MF",rating:"6.0"});

  useEffect(()=>{
    const saved = localStorage.getItem(LS_KEY);
    if(saved) setPlayers(JSON.parse(saved));
  },[]);
  useEffect(()=>{
    localStorage.setItem(LS_KEY, JSON.stringify(players));
  },[players]);

  const addPlayer=()=>{
    const name=form.name.trim();
    if(!name) return;
    setPlayers(p=>[...p,{id:crypto.randomUUID(), name, pos:form.pos, rating:+form.rating}]);
    setForm({name:"",pos:"MF",rating:"6.0"});
  };
  const removePlayer=(id)=> setPlayers(p=>p.filter(x=>x.id!==id));

  const avg = useMemo(()=>{
    if(!players.length) return 0;
    return (players.reduce((s,x)=>s+x.rating,0)/players.length).toFixed(2);
  },[players]);

  return (
    <div className="grid gap-4">
      <div className="card">
        <div className="card-title">הוספת שחקן</div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
          <input className="input" placeholder="שם שחקן" value={form.name}
                 onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          <select className="input" value={form.pos} onChange={e=>setForm(f=>({...f,pos:e.target.value}))}>
            {POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select className="input" value={form.rating} onChange={e=>setForm(f=>({...f,rating:e.target.value}))}>
            {RATINGS.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <button className="btn btn-success" onClick={addPlayer}>הוסף</button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <div className="card-title">סגל שחקנים</div>
          <div className="tag good">ממוצע דירוג: {avg}</div>
        </div>
        <table className="table text-sm">
          <thead>
            <tr>
              <th>שם</th><th>תפקיד</th><th>דירוג</th><th className="text-left">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p=>(
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.pos}</td>
                <td>{p.rating}</td>
                <td className="text-left">
                  <button className="btn btn-danger" onClick={()=>removePlayer(p.id)}>מחק</button>
                </td>
              </tr>
            ))}
            {!players.length && (
              <tr><td colSpan={4} className="text-center text-slate-400 py-8">אין שחקנים עדיין</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

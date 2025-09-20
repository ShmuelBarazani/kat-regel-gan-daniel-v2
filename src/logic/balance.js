// יוטיל
export const avg = (arr=[]) => (arr.length?arr.reduce((s,x)=>s+x,0)/arr.length:0);
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const rdm = () => Math.random();

// חלוקה לקומפוננטים של "חייב-עם" (דו-כיווני)
function componentsWithMust(players){
  const id2i=new Map(players.map((p,i)=>[p.id,i]));
  const parent = players.map((_,i)=>i);
  const find = x => parent[x]===x?x:(parent[x]=find(parent[x]));
  const unite = (a,b)=>{a=find(a);b=find(b);if(a!==b) parent[Math.max(a,b)]=Math.min(a,b);};

  players.forEach((p,i)=>{
    const two = new Set([...(p.prefer||[])]);
    players.forEach(q=>{ if((q.prefer||[]).includes(p.id)) two.add(q.id); });
    two.forEach(id => id2i.has(id)&&unite(i,id2i.get(id)));
  });

  const by=new Map();
  players.forEach((p,i)=>{const r=find(i); if(!by.has(r)) by.set(r,[]); by.get(r).push(p)});
  return [...by.values()];
}

// בדיקת קונפליקטים "לא-עם"
const makeAvoidMap = ps => new Map(ps.map(p=>[p.id,new Set(p.avoid||[])]) );
const willConflict = (team,comp,avoid) =>
  comp.some(m => team.some(tp => avoid.get(m.id).has(tp.id) || avoid.get(tp.id).has(m.id)));

// עלות איזון: ממוצעים קרובים + גדלים קרובים
function metric(teams, targetSize, targetSum){
  const avgs = teams.map(t => t.size? t.sum/t.size : 0);
  const m = avg(avgs);
  const varAvg = avg(avgs.map(x => (x-m)*(x-m)));
  const sizeDev = avg(teams.map(t => Math.abs(t.size-targetSize)));
  return varAvg + 0.15*sizeDev + 1e-9*Math.random();
}

// בדיקת כלל הגודל: שוויון ולכל היותר ±1 אם אין חלוקה שווה
function sizesOk(sizes){
  const mn=Math.min(...sizes), mx=Math.max(...sizes);
  return (mx-mn)<=1;
}

// == האלגוריתם הראשי ==
export function balanceTeams(allPlayers, k){
  const players = allPlayers.map(p=>({...p, r: clamp(Number(p.r||5),1,10)}));
  const totalR = players.reduce((s,p)=>s+p.r,0);
  const targetSum = totalR/k;
  const targetSize = players.length/k;

  const comps = componentsWithMust(players)
    .map(m=>({members:m, sum:m.reduce((s,x)=>s+x.r,0), size:m.length, avg:avg(m.map(x=>x.r))}))
    .sort((a,b)=> b.avg-a.avg || b.size-a.size);

  // אם קומפוננטה עולה על צפיפות מותרת
  if (comps.some(c => c.size > Math.ceil(targetSize)))
    throw new Error("אי אפשר ליצור כוחות חוקיים: יחידת 'חייב-עם' גדולה מדי.");

  const avoid = makeAvoidMap(players);
  const teams = Array.from({length:k},(_,i)=>({name:`קבוצה ${i+1}`, players:[], sum:0, size:0}));

  // הצבה גרידית תוך כיבוד "לא-עם"
  for (const c of comps){
    let best=-1, bestCost=Infinity;
    for (let i=0;i<k;i++){
      const t=teams[i];
      if (willConflict(t.players,c.members,avoid)) continue;
      const sz = t.size + c.size;
      const sizes = teams.map(x=>x.size);
      sizes[i]=sz;
      if (!sizesOk(sizes)) continue;
      const cost = Math.abs((t.sum+c.sum)-targetSum) + 0.9*Math.abs(sz-targetSize);
      if (cost<bestCost){best=i; bestCost=cost;}
    }
    if (best<0) {
      // אין יעד בלי קונפליקט – בוחרים הקטן ביותר ומתקננים אח"כ
      best = teams.map((t,i)=>[i,t.size]).sort((a,b)=>a[1]-b[1])[0][0];
    }
    const t=teams[best];
    t.players.push(...c.members); t.sum+=c.sum; t.size+=c.size;
  }

  // שיפורים מקומיים ע"י החלפות בין קבוצות (בלי לשבור "לא-עם")
  let improved=true, iter=0;
  while(improved && iter<100){
    iter++; improved=false;
    const base = metric(teams, targetSize, targetSum);
    outer: for(let a=0;a<k;a++){
      for(let b=a+1;b<k;b++){
        const A=teams[a], B=teams[b];
        for(const pa of A.players){
          for(const pb of B.players){
            // לא מחליפים שגורם קונפליקט
            const A2 = A.players.filter(x=>x!==pa).concat(pb);
            const B2 = B.players.filter(x=>x!==pb).concat(pa);
            if (willConflict(A2,[pb],avoid) || willConflict(B2,[pa],avoid)) continue;

            const sizes = teams.map(t=>t.size);
            sizes[a]=A.size; sizes[b]=B.size; // unchanged sizes
            const newTeams = teams.map(t=>({...t}));
            newTeams[a] = { ...A, players:A2, sum: A.sum - pa.r + pb.r, size:A.size };
            newTeams[b] = { ...B, players:B2, sum: B.sum - pb.r + pa.r, size:B.size };
            const score = metric(newTeams, targetSize, targetSum);
            if (score + 1e-9 < base){
              teams[a] = newTeams[a];
              teams[b] = newTeams[b];
              improved=true; break outer;
            }
          }
        }
      }
    }
  }

  teams.forEach(t=>{
    t.players.sort((a,b)=>b.r-a.r);
    t.sum = t.players.reduce((s,x)=>s+x.r,0);
    t.size = t.players.length;
  });

  // בדיקת כלל הגודל בסוף
  if (!sizesOk(teams.map(t=>t.size)))
    throw new Error("חלוקה אינה עומדת בכלל הגודל (שוויון/±1).");

  return teams.map(t=>({ name:t.name, players:[...t.players] }));
}

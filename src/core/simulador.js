"use strict";
/* SIMULADOR.JS — interpretador Fanuc/Macro B (execNC) usado no preview 3D
   de macros/fichas e na importação de .NC. Sem dependências de outros módulos. */

/* ============================================================
   IMPORTAÇÃO DE .NC — interpretador Fanuc / Macro B
   Simula o programa e devolve os segmentos do caminho da
   ferramenta (rápido G0 vs corte G1/G2/G3) para o preview 3D.
   ============================================================ */
const IMPORTS = [];               // {uid, nome, segs, visivel, hex, avisos}
const CORES_IMP = [0x6ea8fe, 0xff8fab, 0xffd166, 0x9ef01a, 0xf0625a, 0xffffff];

function execNC(texto){
  const avisos=[];
  const segs=[];                  // {ax,ay,az, bx,by,bz, rapid}
  /* ---- pré-processamento ---- */
  const brutas = texto.split(/\r?\n/);
  const stmts=[]; const labels={};
  for(let i=0;i<brutas.length;i++){
    let l=brutas[i];
    l=l.replace(/\(.*?\)/g,"").replace(/;.*$/,"");
    l=l.toUpperCase().replace(/\s+/g,"");
    if(!l || l==="%" ) continue;
    if(/^O\d+$/.test(l)) continue;
    if(/^<.*>$/.test(l)) continue;
    const m=l.match(/^N(\d+)/);
    if(m){ labels[+m[1]]=stmts.length; l=l.slice(m[0].length); if(!l) { stmts.push(""); continue; } }
    stmts.push(l);
  }

  /* ---- avaliador de expressões ---- */
  const vars={};
  const FN={SIN:x=>Math.sin(x*Math.PI/180),COS:x=>Math.cos(x*Math.PI/180),
    TAN:x=>Math.tan(x*Math.PI/180),ASIN:x=>Math.asin(x)*180/Math.PI,
    ACOS:x=>Math.acos(x)*180/Math.PI,ATAN:x=>Math.atan(x)*180/Math.PI,
    SQRT:Math.sqrt,ABS:Math.abs,ROUND:Math.round,FIX:Math.floor,FUP:Math.ceil,
    LN:Math.log,EXP:Math.exp};
  function evalExpr(s){
    let p=0;
    function ws(){ /* já sem espaços */ }
    function achaFecha(str,i0){ let n=0;
      for(let i=i0;i<str.length;i++){ if(str[i]==="[")n++; if(str[i]==="]"){n--; if(n===0)return i;} }
      return -1; }
    function primario(){
      if(s[p]==="["){ const f=achaFecha(s,p); const v=evalExpr(s.slice(p+1,f)); p=f+1; return v; }
      if(s[p]==="#"){
        p++;
        if(s[p]==="["){ const f=achaFecha(s,p); const idx=evalExpr(s.slice(p+1,f)); p=f+1; return vars[Math.round(idx)]||0; }
        let n=""; while(/\d/.test(s[p])) n+=s[p++];
        return vars[+n]||0;
      }
      for(const fn in FN){
        if(s.startsWith(fn,p) && s[p+fn.length]==="["){
          p+=fn.length; const f=achaFecha(s,p);
          const v=FN[fn](evalExpr(s.slice(p+1,f))); p=f+1; return v;
        }
      }
      let n=""; while(/[\d.]/.test(s[p])) n+=s[p++];
      return parseFloat(n)||0;
    }
    function unario(){ if(s[p]==="-"){p++; return -unario();} if(s[p]==="+"){p++; return unario();} return primario(); }
    function termo(){ let v=unario();
      for(;;){ if(s[p]==="*"){p++; v*=unario();}
        else if(s[p]==="/"){p++; const d=unario(); v = d===0?0:v/d;}
        else if(s.startsWith("MOD",p)){p+=3; v%=unario();}
        else break; }
      return v; }
    function soma(){ let v=termo();
      for(;;){ if(s[p]==="+"){p++; v+=termo();} else if(s[p]==="-"){p++; v-=termo();} else break; }
      return v; }
    return soma();
  }
  function evalCond(cond){
    const m=cond.match(/(EQ|NE|GT|GE|LT|LE)/);
    if(!m) return evalExpr(cond)!==0;
    const a=evalExpr(cond.slice(0,m.index)), b=evalExpr(cond.slice(m.index+2));
    switch(m[1]){case"EQ":return a===b;case"NE":return a!==b;case"GT":return a>b;
      case"GE":return a>=b;case"LT":return a<b;case"LE":return a<=b;}
  }
  function achaFechaTop(str,i0){ let n=0;
    for(let i=i0;i<str.length;i++){ if(str[i]==="[")n++; if(str[i]==="]"){n--; if(n===0)return i;} }
    return -1; }

  /* ---- estado da máquina ---- */
  let pos={x:0,y:0,z:0};
  let motion=0, abs=true, mirrorX=null;
  let ciclo=null, g98=true, zInicial=0;
  let parado=false, execs=0;
  const MAXE=400000, MAXS=160000;

  function alvo(w){
    const t={...pos};
    ["x","y","z"].forEach(k=>{
      const K=k.toUpperCase();
      if(w[K]!==undefined) t[k]= abs ? w[K] : pos[k]+w[K];
    });
    return t;
  }
  function mx(x){ return mirrorX===null ? x : 2*mirrorX - x; }
  function seg(a,b,rapid){
    if(segs.length>=MAXS) return;
    segs.push({ax:mx(a.x),ay:a.y,az:a.z, bx:mx(b.x),by:b.y,bz:b.z, rapid});
  }
  function arco(w,cw){
    const fim=alvo(w);
    let cx,cy;
    if(w.R!==undefined && (w.X!==undefined||w.Y!==undefined)){
      const dx=fim.x-pos.x, dy=fim.y-pos.y, q=Math.hypot(dx,dy);
      const r=Math.abs(w.R);
      if(q===0||q>2*r+1e-6){ seg(pos,fim,false); pos=fim; return; }
      const h=Math.sqrt(Math.max(0,r*r-q*q/4));
      const sgn=(cw?1:-1)*(w.R<0?-1:1);
      cx=pos.x+dx/2 - sgn*h*dy/q;
      cy=pos.y+dy/2 + sgn*h*dx/q;
    } else {
      cx=pos.x+(w.I||0); cy=pos.y+(w.J||0);
    }
    const r=Math.hypot(pos.x-cx,pos.y-cy);
    let a0=Math.atan2(pos.y-cy,pos.x-cx);
    let a1=Math.atan2(fim.y-cy,fim.x-cx);
    let da=a1-a0;
    if(cw){ if(da>=-1e-9) da-=2*Math.PI; } else { if(da<=1e-9) da+=2*Math.PI; }
    if(Math.abs(fim.x-pos.x)<1e-9 && Math.abs(fim.y-pos.y)<1e-9) da = cw?-2*Math.PI:2*Math.PI;
    const passos=Math.max(4, Math.ceil(Math.abs(da)/(Math.PI/36)));
    let ant={...pos};
    for(let i=1;i<=passos;i++){
      const a=a0+da*i/passos;
      const pt={x:cx+r*Math.cos(a), y:cy+r*Math.sin(a), z:pos.z+(fim.z-pos.z)*i/passos};
      seg(ant,pt,false); ant=pt;
    }
    pos=fim;
  }

  /* ---- execução ---- */
  let pc=0;
  while(pc<stmts.length && !parado){
    if(++execs>MAXE){ avisos.push("Simulação interrompida: limite de execução atingido (laço infinito?)."); break; }
    const l=stmts[pc]; pc++;
    if(!l) continue;

    let m;
    if((m=l.match(/^#(\d+)=(.+)$/))){ vars[+m[1]]=evalExpr(m[2]); continue; }
    if(l.startsWith("IF[")){
      const f=achaFechaTop(l,2);
      if(f<0){ avisos.push("IF malformado: "+l); continue; }
      const cond=l.slice(3,f), resto=l.slice(f+1);
      if(!evalCond(cond)) continue;
      if((m=resto.match(/^GOTO(\d+)/))){ const d=labels[+m[1]]; if(d===undefined){avisos.push("GOTO"+m[1]+" sem rótulo N"+m[1]);} else pc=d; continue; }
      if((m=resto.match(/^THEN#(\d+)=(.+)$/))){ vars[+m[1]]=evalExpr(m[2]); continue; }
      avisos.push("IF não suportado: "+l); continue;
    }
    if((m=l.match(/^GOTO(\d+)/))){ const d=labels[+m[1]]; if(d===undefined){avisos.push("GOTO"+m[1]+" sem rótulo N"+m[1]); } else pc=d; continue; }
    if(l.startsWith("WHILE")){ avisos.push("WHILE/DO não suportado — trecho ignorado."); continue; }

    /* linha de palavras (G/M/X/Y/Z...) */
    const w={}; const gs=[]; const ms=[];
    let i=0, ok=true;
    while(i<l.length){
      const letra=l[i];
      if(!/[A-Z]/.test(letra)){ ok=false; break; }
      i++;
      let neg=false;
      if(l[i]==="-"){ neg=true; i++; }
      let val;
      if(l[i]==="["){ const f=achaFechaTop(l,i); if(f<0){ok=false;break;} val=evalExpr(l.slice(i+1,f)); i=f+1; }
      else if(l[i]==="#"){ let j=i+1, n=""; while(/\d/.test(l[j])) n+=l[j++]; val=vars[+n]||0; i=j; }
      else { let j=i, n=""; while(/[\d.]/.test(l[j])) n+=l[j++]; if(!n){ok=false;break;} val=parseFloat(n); i=j; }
      if(neg) val=-val;
      if(letra==="G") gs.push(val);
      else if(letra==="M") ms.push(val);
      else w[letra]=val;
    }
    if(!ok){ avisos.push("Linha ignorada: "+l); continue; }

    let g53=false, defineCiclo=null;
    gs.forEach(g=>{
      if(g===0||g===1||g===2||g===3) motion=g;
      else if(g===90) abs=true;
      else if(g===91) abs=false;
      else if(g===98) g98=true;
      else if(g===99) g98=false;
      else if(g===80) ciclo=null;
      else if(g===81||g===82||g===83||g===73||g===85||g===86) defineCiclo=g;
      else if(g===53) g53=true;
      else if(g===51.1){ mirrorX = w.X!==undefined ? w.X : 0; }
      else if(g===50.1){ mirrorX=null; }
      /* G40/41/42, G43/44/49, G54-59, G17-19, G94/95: sem efeito no caminho */
    });
    if(ms.includes(30)||ms.includes(2)){ parado=true; }
    if(g53) continue;                       // coordenadas de máquina: fora do preview

    if(defineCiclo!==null){
      ciclo={z:w.Z!==undefined?w.Z:pos.z, r:w.R!==undefined?w.R:pos.z};
      zInicial=pos.z;
    }
    if(ciclo){
      if(w.X!==undefined||w.Y!==undefined||defineCiclo!==null){
        const xy=alvo({X:w.X,Y:w.Y});
        const topo={x:xy.x,y:xy.y,z:pos.z};
        seg(pos,topo,true);
        const nR={x:xy.x,y:xy.y,z:ciclo.r};
        const nZ={x:xy.x,y:xy.y,z:ciclo.z};
        seg(topo,nR,true); seg(nR,nZ,false);
        const volta={x:xy.x,y:xy.y,z: g98?zInicial:ciclo.r};
        seg(nZ,volta,true);
        pos=volta;
      }
      continue;
    }

    if(w.X!==undefined||w.Y!==undefined||w.Z!==undefined){
      if(motion===2||motion===3){ arco(w, motion===2); }
      else { const t=alvo(w); seg(pos,t,motion===0); pos=t; }
    }
  }
  if(segs.length>=MAXS) avisos.push("Caminho truncado (programa muito longo para o preview).");
  return {segs, avisos};
}

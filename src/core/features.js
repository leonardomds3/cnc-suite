"use strict";
/* FEATURES.JS — deriva parâmetros de operação a partir de entidades do CAD 2D
   (cad2d.js). Puro, sem DOM: recebe um array de entidades já lido por quem chama
   e devolve dados prontos para DEFS[...].gerar()/warn()/volume(). Sem dependências. */

const FEATURES = {
  /* [{x, y, dia}] a partir das entidades circle, na ordem recebida — a ordem de
     seleção no CAD 2D vira a ordem de furação do programa. */
  furos(entidades){
    return (entidades||[]).filter(e=>e && e.type==="circle").map(e=>({x:e.x, y:e.y, dia:e.r*2}));
  },
  /* Cadeia fechada (retas/arcos) + sentido de usinagem — Etapa 9 (INSTRUCAO-CAD-CAM.md).
     Percorre as entidades recebidas (ignora circle/dim) ligando-as pelos extremos e
     devolve {segmentos, sentido:'CCW'} sempre no sentido anti-horário — a operação
     Contorno (operacoes.js) conta com essa normalização para decidir G41/G42 sem
     precisar olhar o sentido em que o usuário desenhou. Cada segmento carrega
     {tipo:'line'|'arc', a, b, [cx,cy,r,invertido]}: `a`/`b` já na ordem de percurso;
     `invertido` (só em arco) indica se o arco original (sempre a0→a1 anti-horário,
     ver cad2d.js) está sendo percorrido ao contrário (G2, horário) ou não (G3).
     Devolve null quando as entidades não fecham uma cadeia única (a operação usa
     isso para avisar "selecione uma cadeia fechada"). */
  contorno(entidades){
    const EPS=1e-4;
    const perto=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y)<EPS;
    const brutos=(entidades||[]).filter(e=>e&&(e.type==="line"||e.type==="arc"));
    if(brutos.length<2) return null;
    const segOf=e=>{
      if(e.type==="line") return {tipo:"line", a:{x:e.x,y:e.y}, b:{x:e.x2,y:e.y2}};
      const a0=e.a0*Math.PI/180, a1=e.a1*Math.PI/180;
      return {tipo:"arc", cx:e.x, cy:e.y, r:e.r, invertido:false,
        a:{x:e.x+e.r*Math.cos(a0), y:e.y+e.r*Math.sin(a0)},
        b:{x:e.x+e.r*Math.cos(a1), y:e.y+e.r*Math.sin(a1)}};
    };
    const inverte=s=>s.tipo==="arc" ? {...s, a:s.b, b:s.a, invertido:!s.invertido} : {tipo:"line", a:s.b, b:s.a};
    const restantes=brutos.map(segOf);
    const cadeia=[restantes.shift()];
    while(restantes.length){
      const fim=cadeia[cadeia.length-1].b;
      const idx=restantes.findIndex(s=>perto(s.a,fim)||perto(s.b,fim));
      if(idx<0) return null;
      const s=restantes.splice(idx,1)[0];
      cadeia.push(perto(s.a,fim) ? s : inverte(s));
    }
    if(!perto(cadeia[cadeia.length-1].b, cadeia[0].a)) return null;
    let area=0;
    cadeia.forEach((s,i)=>{const n=cadeia[(i+1)%cadeia.length];area+=s.a.x*n.a.y - n.a.x*s.a.y;});
    const ordenada = area<0 ? cadeia.slice().reverse().map(inverte) : cadeia;
    return {segmentos:ordenada, sentido:"CCW"};
  },
  /* Bounding box das entidades — para o faceamento (Etapa 5) apontar a área a
     usinar a partir do desenho em vez de campos digitados. */
  limites(entidades){
    const pts=[];
    (entidades||[]).forEach(e=>{
      if(!e) return;
      if(e.type==="circle"||e.type==="arc") pts.push({x:e.x-e.r,y:e.y-e.r},{x:e.x+e.r,y:e.y+e.r});
      else if(e.type==="line") pts.push({x:e.x,y:e.y},{x:e.x2,y:e.y2});
    });
    if(!pts.length) return null;
    const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
    const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
    return {minX, maxX, minY, maxY, largura:maxX-minX, altura:maxY-minY};
  }
};

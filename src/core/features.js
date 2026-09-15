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
  /* Cadeia fechada (retas/arcos) + sentido de usinagem — Etapa 5 (contorno).
     Ainda não implementado: nenhum bloco nativo consome isto por enquanto. */
  contorno(entidades){
    return null;
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

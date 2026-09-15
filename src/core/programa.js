"use strict";
/* PROGRAMA.JS — estado da sequência de blocos (SEQ/SELECIONADO/UID), leitura
   de config (cfg) e montagem final do G-code. Depende de: $ (global do HTML
   host), num/fnum/noAcc (formato.js) e DEFS (operacoes.js/macros.js/fichas.js). */

/* ---------- estado ---------- */
let SEQ = [];        // [{uid, tipo, aberto, p:{...}}]
let SELECIONADO = null;
let UID = 1;

function cfg(){
  return {
    nome: ($("g-nome").value||"MONTAGEM1").trim().toUpperCase().replace(/\s+/g,"_"),
    seg:  num($("g-seg").value,25),
    bx:   num($("g-bx").value,200), by: num($("g-by").value,140), bz: num($("g-bz").value,50),
    g53:  $("g-g53").checked
  };
}

/* ---------- campos comuns ---------- */
const F_TROCA = [
  {k:"t",  l:"T (ferramenta)", d:1, s:1},
  {k:"td", l:"Ø fresa/broca",  d:10, s:0.5, u:"mm"},
  {k:"ts", l:"S (rotação)",    d:3000, s:100, u:"rpm"},
  {k:"th", l:"H (comp.)",      d:1, s:1},
  {k:"tdd",l:"D (raio)",       d:1, s:1},
];

/* ============================================================
   MONTAGEM DO PROGRAMA
   ============================================================ */

function gerarPrograma(){
  const c=cfg();
  const L=[];
  L.push("%");
  L.push(`<${c.nome}>`);
  L.push("(X - CENTRO / Y - CENTRO / Z - FACE SUPERIOR)");
  L.push("G90G17G40G80");
  L.push(`#26=${fnum(c.seg)}(Z DE SEGURANCA)`);
  let ant=null;   // ferramenta ativa {t,ts,th,tdd}
  SEQ.forEach((b,i)=>{
    const D=DEFS[b.tipo];
    const nb=(i+1)*100;
    const dLocal = b.p.td;   // cada bloco tem a própria ferramenta
    L.push("");
    L.push(`(===== BLOCO ${i+1} - ${noAcc(D.nome)} =====)`);
    const mudouT = !ant || ant.t!==b.p.t || ant.th!==b.p.th || ant.tdd!==b.p.tdd;
    if(mudouT){
      if(ant){ L.push(`G0Z[#26]`); L.push("M5M9"); }
      L.push(`T${fnum(b.p.t)}(FERRAMENTA ${fnum(b.p.td)})`);
      L.push("M6");
      L.push("G54");
      L.push(`S${fnum(b.p.ts)}M3M8`);
      L.push(`G0G43Z[#26]H${fnum(b.p.th)}D${fnum(b.p.tdd)}`);
    } else if(ant.ts!==b.p.ts){
      L.push(`S${fnum(b.p.ts)}M3M8(NOVA ROTACAO)`);
    }
    ant={t:b.p.t, ts:b.p.ts, th:b.p.th, tdd:b.p.tdd};
    L.push(...D.gerar(b.p,c,nb,dLocal));
    L.push(`G0Z[#26]`);
  });
  L.push("");
  L.push("M5M9");
  if(c.g53) L.push("G53Y300");
  L.push("M30");
  L.push("%");
  return L.join("\n");
}

// Confere os rotulos efetivamente emitidos, com a base real de cada bloco.
// Apenas informa a colisao: nao altera nem bloqueia o programa.
function avisosRotulosDuplicados(c){
  const rotulos=new Map();
  SEQ.forEach((b,i)=>{
    DEFS[b.tipo].gerar(b.p,c,(i+1)*100,b.p.td).forEach((linha,j)=>{
      const codigo=linha.replace(/\([^)]*(?:\)|$)|;.*$/g,"")
        .replace(/\s+/g,"").toUpperCase();
      const m=codigo.match(/^N(\d+)(?![\d.])/);
      if(!m) return;
      const n=m[1].replace(/^0+(?=\d)/,"");
      if(!rotulos.has(n)) rotulos.set(n,[]);
      rotulos.get(n).push(`bloco ${i+1}, linha ${j+1}`);
    });
  });
  const avisos=[];
  rotulos.forEach((locais,n)=>{
    if(locais.length>1) avisos.push(`Rótulo N${n} repetido: ${locais.join("; ")}. Revise os rótulos e os GOTO correspondentes antes de usar o programa.`);
  });
  return avisos;
}

function coletarWarns(){
  const c=cfg(); const out=[];
  if(SEQ.length===0) return out;
  SEQ.forEach((b,i)=>{
    const D=DEFS[b.tipo];
    const dLocal = b.p.td;
    if(!(dLocal>0)) out.push(`Bloco ${i+1} (${D.nome}): informe o Ø da ferramenta deste bloco.`);
    if(!(b.p.t>0)) out.push(`Bloco ${i+1} (${D.nome}): informe o T da ferramenta deste bloco.`);
    (D.warn(b.p,c,dLocal)||[]).forEach(w=>out.push(`Bloco ${i+1} (${D.nome}): ${w}`));
    /* regras gerais de corte (skill cnc-programming) */
    if(b.p.ap!==undefined && dLocal>0 && b.p.ap > dLocal*1.5)
      out.push(`Bloco ${i+1} (${D.nome}): passo Z (${b.p.ap}) acima de 1,5× o Ø da fresa (${dLocal}) — reduza o ap ou aumente a ferramenta.`);
    if(b.p.fz!==undefined && b.p.f!==undefined && b.p.f>0 && b.p.fz > b.p.f*0.55)
      out.push(`Bloco ${i+1} (${D.nome}): F de mergulho (${b.p.fz}) acima de 50% do F de corte (${b.p.f}) — recomendado 30–50%.`);
  });
  out.push(...avisosRotulosDuplicados(c));
  return out;
}

"use strict";
/* CORTE.JS — parâmetros de corte por material (Vc/fz) e helpers puros do
   modal "Cadastrar macro". Depende de: tokensDoCodigo (macros.js). */

/* ============================================================
   CALCULADORA DE PARÂMETROS DE CORTE (skill cnc-programming)
   Vc (m/min) e fz (mm/dente) típicos por material — faixa média.
   RPM = Vc*1000/(π*Ø)   ·   F = fz * z * RPM
   ============================================================ */
const MATERIAIS={
  alu:  {nome:"Alumínio",           vc:220, fz:0.12},
  acoB: {nome:"Aço baixo carbono",  vc:90,  fz:0.08},
  acoM: {nome:"Aço médio carbono",  vc:60,  fz:0.06},
  inox: {nome:"Aço inox",           vc:45,  fz:0.045},
  fofo: {nome:"Ferro fundido",      vc:80,  fz:0.11},
  latao:{nome:"Latão / bronze",     vc:150, fz:0.10},
  plast:{nome:"Plástico / nylon",   vc:350, fz:0.15},
};
function calcularSF(materialId, diametro, dentes){
  const m=MATERIAIS[materialId];
  const d=diametro, z=Math.max(1,dentes);
  if(!(d>0)) return null;
  const rpm=Math.round(m.vc*1000/(Math.PI*d));
  const f=Math.round(m.fz*z*rpm/10)*10;
  const mergulho=Math.round(f*0.4/10)*10;
  return {material:m, rpm, f, mergulho};
}

/* ============================================================
   MODAL "CADASTRAR MACRO" — funções puras (parsing/validação)
   A leitura dos campos do DOM e a montagem do HTML das linhas
   continuam em cada arquivo; aqui só entra o que recebe valores
   por parâmetro e devolve resultado, sem tocar o DOM.
   ============================================================ */
function varsDeclaradasNoCodigo(cod){
  const decl=new Set();
  cod.split(/\r?\n/).forEach(l=>{
    l=l.trim().replace(/^N\d+/,"");
    const m=l.match(/^#(\d+)=(.*)$/);
    if(m && !m[2].includes("#"+m[1])) decl.add(+m[1]);
  });
  return decl;
}
function verificarTokensMacro(cod, chaves){
  const toks=tokensDoCodigo(cod);
  const faltam=toks.filter(t=>!chaves.includes(t));
  const sobram=chaves.filter(k=>!toks.includes(k));
  return {faltam, sobram};
}
function sincronizarVarsMacro(cod, mvarsAtual){
  const usadas=new Set();
  (cod.match(/#\d+/g)||[]).forEach(u=>usadas.add(+u.slice(1)));
  const declaradas=varsDeclaradasNoCodigo(cod);
  const vars={...mvarsAtual};
  usadas.forEach(n=>{ if(!(n in vars)) vars[n]={v:"0", inc:false, passo:1, com:""}; });
  Object.keys(vars).forEach(n=>{ if(!usadas.has(+n)) delete vars[n]; });
  return {vars, usadas:[...usadas].sort((a,b)=>a-b), declaradas};
}
const CODIGO_MODELO =
`(MEU MACRO)
#23={cx}(CENTRO X)
#24={cy}(CENTRO Y)
#1={ap}(PASSO Z)
#2=0(Z ATUAL)
#4={prof}(PROFUNDIDADE)
N10#2=#2+#1
IF[#2GT#4]THEN#2=#4
G0Z2.
G0X[#23]Y[#24]
G1Z-[#2]F{fz}
(SEU CICLO AQUI)
G0Z2.
IF[#2LT#4]GOTO10`;

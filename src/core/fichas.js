"use strict";
/* FICHAS.JS — interpretador de estratégias em JSON (dado, não código).
   Depende de: fnum (formato.js), DEFS (operacoes.js), execNC (simulador.js), SEQ (programa.js). */

/* ============================================================
   INTERPRETADOR DE ESTRATÉGIAS (fichas JSON)
   A estratégia é DADO, não código: a ficha JSON descreve
   inputs, derivadas, avisos e template, e o interpretador
   executa a ficha sempre igual (estrategias_canal.json é o
   formato de referência). Fluxo fixo em 5 passos:
   1. ler inputs · 2. calcular derivadas na ordem declarada ·
   3. avaliar avisos (nunca bloqueiam) · 4. resolver
   placeholders {chave} com fnum() · 5. emitir as linhas.
   Fornecidos pelo motor: diam (Ø da ferramenta) e nb (base dos
   rótulos N). #26 (Z de segurança) já existe no cabeçalho do
   programa — a ficha só o usa, nunca define.
   ============================================================ */
let ESTRATEGIAS = {};

/* Avaliador das expressões das fichas: aritmética com os nomes
   do contexto (inputs/derivadas/diam/nb), comparadores para os
   avisos e as funções TAN()/ATAN() em GRAUS (mesma convenção do
   FN do execNC). Sem eval() — JSON editável pelo usuário não pode
   virar JS executável. Mesma descida recursiva do evalExpr do execNC. */
const FN_FICHA={
  TAN:x=>Math.tan(x*Math.PI/180),
  ATAN:x=>Math.atan(x)*180/Math.PI,
  SQRT:Math.sqrt,
};
function avaliarExpr(expr, ctx){
  const s=String(expr).replace(/\s+/g,"");
  let p=0;
  function primario(){
    if(s[p]==="("){ p++; const v=soma(); if(s[p]!==")") throw new Error(`falta ")" em "${expr}"`); p++; return v; }
    if(/[\d.]/.test(s[p]||"")){ let n=""; while(/[\d.]/.test(s[p]||"")) n+=s[p++];
      const v=parseFloat(n); if(isNaN(v)) throw new Error(`número inválido em "${expr}"`); return v; }
    if(/[a-zA-Z_]/.test(s[p]||"")){ let n=""; while(/[a-zA-Z0-9_]/.test(s[p]||"")) n+=s[p++];
      if(s[p]==="("){
        if(!FN_FICHA[n]) throw new Error(`função desconhecida "${n}" em "${expr}"`);
        p++; const v=soma(); if(s[p]!==")") throw new Error(`falta ")" em "${n}(...)" de "${expr}"`); p++;
        return FN_FICHA[n](v);
      }
      if(!(n in ctx)) throw new Error(`nome desconhecido "${n}" em "${expr}"`);
      return ctx[n]; }
    throw new Error(`símbolo inesperado "${s[p]||"(fim)"}" em "${expr}"`);
  }
  function unario(){ if(s[p]==="-"){p++; return -unario();} if(s[p]==="+"){p++; return unario();} return primario(); }
  function termo(){ let v=unario();
    for(;;){ if(s[p]==="*"){p++; v*=unario();}
      else if(s[p]==="/"){p++; const d=unario(); v = d===0?0:v/d;}
      else break; }
    return v; }
  function soma(){ let v=termo();
    for(;;){ if(s[p]==="+"){p++; v+=termo();} else if(s[p]==="-"){p++; v-=termo();} else break; }
    return v; }
  function comparacao(){ const a=soma();
    for(const op of ["<=",">=","==","!=","<",">"]){
      if(s.startsWith(op,p)){ p+=op.length; const b=soma();
        switch(op){case"<=":return a<=b?1:0;case">=":return a>=b?1:0;
          case"==":return a===b?1:0;case"!=":return a!==b?1:0;
          case"<":return a<b?1:0;case">":return a>b?1:0;} } }
    return a; }
  const v=comparacao();
  if(p<s.length) throw new Error(`sobrou "${s.slice(p)}" em "${expr}"`);
  return v;
}

/* Executa a ficha e devolve {linhas, avisos, ctx}. O ctx (inputs +
   derivadas resolvidas) alimenta os campos exibidos ("saidas") nos
   apps. Erro de ficha (nome errado, expressão malformada) vira
   aviso e a linha mantém o placeholder — nunca derruba a geração. */
function interpretarEstrategia(est, p, c, nb, d){
  const avisos=[];
  /* 1. inputs */
  const ctx={diam:d, nb:nb};
  (est.inputs||[]).forEach(inp=>{
    let v = p[inp.k]!==undefined ? p[inp.k] : inp.d;
    /* seletor: o <select> dos apps grava string — coage pra número */
    if(inp.sel && typeof v==="string" && v!=="" && !isNaN(+v)) v=+v;
    ctx[inp.k]=v;
  });
  /* 2. derivadas, na ordem declarada no JSON — string simples ou
     lista de casos condicionais {quando, expr} */
  Object.entries(est.derivadas||{}).forEach(([k,ex])=>{
    try{ ctx[k]=Array.isArray(ex) ? derivadaPorCasos(k,ex,ctx,avisos) : avaliarExpr(ex,ctx); }
    catch(e){ avisos.push(`derivada "${k}": ${e.message}`); ctx[k]=0; }
  });
  /* 3. avisos — só informam, nunca bloqueiam; "quando" opcional
     limita o aviso a um modo do seletor */
  (est.avisos||[]).forEach(a=>{
    try{
      if(a.quando!==undefined && !avaliarExpr(a.quando,ctx)) return;
      if(avaliarExpr(a.se,ctx)) avisos.push(a.msg);
    }
    catch(e){ avisos.push(`aviso "${a.se}": ${e.message}`); }
  });
  /* 4+5. resolver placeholders e emitir na ordem do template.
     Linha pode ser objeto {quando, l}: só sai se o "quando" der
     verdadeiro (liga/desliga de trecho, ex.: espelhamento G51.1).
     Erro no "quando" omite a linha e vira aviso — na dúvida é
     mais seguro não emitir. */
  const linhas=[];
  (est.template||[]).forEach(l=>{
    let txt=l;
    if(typeof l==="object" && l!==null){
      try{ if(l.quando!==undefined && !avaliarExpr(l.quando,ctx)) return; }
      catch(e){ avisos.push(`linha condicional (${l.quando}): ${e.message}`); return; }
      txt=l.l!==undefined?l.l:"";
    }
    linhas.push(String(txt).replace(/\{([^{}]+)\}/g,(m,ex)=>{
      try{ return fnum(avaliarExpr(ex,ctx)); }
      catch(e){ avisos.push(`placeholder {${ex}}: ${e.message}`); return m; }
    }));
  });
  return {linhas, avisos, ctx};
}

/* Derivada condicional: lista de casos {quando, expr} avaliados na
   ordem — vence o primeiro cujo "quando" der verdadeiro; caso sem
   "quando" é o padrão. Nenhum caso casando vira aviso e vale 0. */
function derivadaPorCasos(k, casos, ctx, avisos){
  for(const c of casos){
    if(c.quando===undefined || avaliarExpr(c.quando,ctx)) return avaliarExpr(c.expr,ctx);
  }
  avisos.push(`derivada "${k}": nenhum caso casou`);
  return 0;
}

/* Embrulha uma ficha numa entrada DEFS normal — mesma mecânica
   do registrarCustom. O preview 3D é o caminho simulado pelo
   execNC, como nas macros personalizadas. */
function registrarEstrategia(id, est){
  ESTRATEGIAS[id]=est;
  const cor=est.cor||"#4dd0e1";
  let hex=parseInt(cor.replace("#",""),16); if(isNaN(hex)) hex=0x4dd0e1;
  DEFS[id]={
    nome:est.nome||id,
    sub:est.familia?`estratégia · ${est.familia}`:"estratégia JSON",
    cor, hex,
    params:(est.inputs||[]).map(i=>{
      const f={k:i.k,l:i.l||i.k,d:i.d,s:i.s||1,u:i.u||""};
      if(i.sel) f.sel=i.sel;           /* seletor da ficha (dropdown) */
      if(i.quando!==undefined) f.quando=i.quando; /* campo condicional */
      return f;
    }),
    warn(p,c,d){ return interpretarEstrategia(est,p,c,100,d).avisos; },
    gerar(p,c,nb,d){ return interpretarEstrategia(est,p,c,nb,d).linhas; },
    volume(p,c,d){
      const linhas=[`#26=${fnum(c.seg)}`,"G0Z2."].concat(this.gerar(p,c,100,d));
      const res=execNC(linhas.join("\n"));
      if(!res.segs.length) return null;
      const grp=new THREE.Group();
      const feed=[],rapid=[];
      res.segs.forEach(s=>{
        (s.rapid?rapid:feed).push(s.ax,s.az,-s.ay, s.bx,s.bz,-s.by);
      });
      function linha(arr,corHex,op){
        if(!arr.length) return;
        const g=new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(arr,3));
        grp.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:corHex,transparent:true,opacity:op})));
      }
      linha(feed, hex, 0.95);
      linha(rapid, 0x5a6572, 0.3);
      return grp;
    }
  };
}
function removerEstrategia(id){
  delete ESTRATEGIAS[id]; delete DEFS[id];
  SEQ=SEQ.filter(b=>b.tipo!==id);
}

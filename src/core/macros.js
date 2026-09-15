"use strict";
/* MACROS.JS — macros Macro B cruas cadastradas pelo usuário (CUSTOM[id]).
   Depende de: fnum/noAcc (formato.js), DEFS/SEQ (operacoes.js/programa.js), execNC (simulador.js). */

/* ============================================================
   MACROS PERSONALIZADOS (cadastrados pelo usuário)
   CUSTOM[id] = {nome, sub, corIdx, params:[{k,l,d,s,u}], codigo}
   Ao registrar, vira uma DEF normal: tokens {chave} são
   substituídos, rótulos N10–N99 e GOTOs são renumerados com nb,
   e o volume 3D é o caminho da ferramenta simulado pelo
   interpretador (execNC).
   ============================================================ */
let CUSTOM = {};
let CUSTOM_SEQ = 1;
const CORES_FAM = [
  {css:"var(--amber)",  hex:0xffb02e},
  {css:"var(--green)",  hex:0x3ecf8e},
  {css:"var(--cyan)",   hex:0x4dd0e1},
  {css:"var(--violet)", hex:0xb388ff},
  {css:"var(--blue)",   hex:0x6ea8fe},
  {css:"var(--red)",    hex:0xf0625a},
];

function tokensDoCodigo(cod){
  const t=new Set();
  (cod.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)||[]).forEach(m=>t.add(m.slice(1,-1)));
  t.delete("DIAM"); t.delete("RF");
  return [...t];
}


function registrarCustom(id, raw){
  CUSTOM[id]=raw;
  const cor=CORES_FAM[raw.corIdx % CORES_FAM.length];
  DEFS[id]={
    nome:raw.nome, sub:raw.sub||"macro personalizado", cor:cor.css, hex:cor.hex,
    params:raw.params.map(p=>({k:p.k,l:p.l,d:p.d,s:p.s||1,u:p.u||""})),
    warn(p,c,d){
      const w=[];
      const semParam=tokensDoCodigo(raw.codigo).filter(t=>!(t in p));
      if(semParam.length) w.push("Tokens sem parâmetro cadastrado: {"+semParam.join("} {")+"}.");
      if(raw.vars) Object.keys(raw.vars).forEach(n=>{
        if(raw.vars[n].inc && !raw.codigo.includes("#"+n+"=#"+n+"+"))
          w.push(`Variável #${n} marcada com incremento, mas o código não tem #${n}=#${n}+...`);
      });
      return w;
    },
    gerar(p,c,nb,d){
      const decl=[];
      if(raw.vars){
        const noCod=(function(){
          const s=new Set();
          raw.codigo.split(/\r?\n/).forEach(l=>{
            l=l.trim().replace(/^N\d+/,"");
            const m=l.match(/^#(\d+)=(.*)$/);
            if(m && !m[2].includes("#"+m[1])) s.add(+m[1]);
          });
          return s;
        })();
        Object.keys(raw.vars).map(Number).sort((a,b)=>a-b).forEach(n=>{
          if(noCod.has(n)) return;
          const v=raw.vars[n];
          let val=String(v.v??"0").trim()||"0";
          val=val.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,(m,k)=>{
            if(k==="DIAM") return fnum(d);
            if(k==="RF")   return fnum(d/2);
            return (k in p) ? fnum(p[k]) : m;
          });
          decl.push(`#${n}=${val}${v.com?`(${noAcc(v.com)})`:""}`);
        });
      }
      return decl.concat(raw.codigo.split(/\r?\n/)
        .map(l=>l.trim())
        .filter(l=>l.length)
        .map(l=>{
          l=l.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,(m,k)=>{
            if(k==="DIAM") return fnum(d);
            if(k==="RF")   return fnum(d/2);
            return (k in p) ? fnum(p[k]) : m;
          });
          // Renumera apenas codigo; preserva comentarios e rotulos longos.
          let inicio=true;
          l=l.split(/(\([^)]*(?:\)|$)|;.*$)/).map((trecho,i)=>{
            if(i%2) return trecho;
            if(inicio) trecho=trecho.replace(/^(\s*)N(\d{1,2})(?![\d.])/,
              (m,esp,n)=>esp+"N"+(nb+ +n));
            if(trecho.trim()) inicio=false;
            return trecho.replace(/GOTO(\d{1,2})\b/g,(m,n)=>"GOTO"+(nb+ +n));
          }).join("");
          return l;
        }));
    },
    volume(p,c,d){
      const linhas=["G0Z2."].concat(this.gerar(p,c,100,d));
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
      linha(feed, cor.hex, 0.95);
      linha(rapid, 0x5a6572, 0.3);
      return grp;
    }
  };
}
function removerCustom(id){
  delete CUSTOM[id]; delete DEFS[id];
  SEQ=SEQ.filter(b=>b.tipo!==id);
}

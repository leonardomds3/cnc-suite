"use strict";
/* FORMATO.JS — helpers puros de formatação numérica/texto usados por todo o
   motor (Macro B usa vírgula decimal americana e rótulos sem acento). Sem dependências. */

function num(v,d=0){ const n=parseFloat(v); return isNaN(n)?d:n; }
function fnum(n){ return (Math.round(n*1000)/1000).toString(); }            // p/ atribuição de variável
function fx(n){ let s=(Math.round(n*1000)/1000).toString(); if(!s.includes(".")) s+="."; return s; } // p/ coordenada
function noAcc(s){
  return s.normalize("NFD").replace(/[̀-ͯ]/g,"")
          .replace(/ç/gi,"C").toUpperCase().replace(/[^A-Z0-9 \-\+\.\/=:#]/g,"");
}

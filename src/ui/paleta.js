"use strict";
/* paleta.js — paleta de operações do Montador (botões que adicionam blocos à pilha).
   Depende de globais definidos no <script> principal de montador_macro_cnc_2.html,
   carregados antes deste arquivo: $, ORDEM/DEFS/CUSTOM/ESTRATEGIAS (core), F_TROCA,
   SEQ, UID, SELECIONADO, toast(), renderPilha(), refresh(), abrirEditor() (modal-macro.js). */

/* ============================================================
   UI — PALETA
   ============================================================ */
function renderPaleta(){
  const el=$("paleta");
  el.innerHTML="";
  ORDEM.concat(Object.keys(ESTRATEGIAS), Object.keys(CUSTOM)).forEach(t=>{
    const D=DEFS[t];
    if(!D) return;
    const b=document.createElement("button");
    b.className="pal"; b.style.setProperty("--c",D.cor);
    const custom=!!CUSTOM[t];
    b.innerHTML=`<span class="plus">+</span>${D.nome}<small>${D.sub||""}</small>${custom?`<span class="edit" data-edit="${t}" title="Editar macro">✎</span>`:""}`;
    b.addEventListener("click",e=>{
      const ed=e.target.closest("[data-edit]");
      if(ed){ e.stopPropagation(); abrirEditor(ed.dataset.edit); return; }
      addBloco(t);
    });
    el.appendChild(b);
  });
}
renderPaleta();

function addBloco(tipo, extra){
  const D=DEFS[tipo];
  const p={};
  D.params.forEach(f=>p[f.k]=f.d);
  F_TROCA.forEach(f=>p[f.k]=f.d);
  SEQ.forEach(b=>b.aberto=false);
  const bloco={uid:UID++, tipo, aberto:true, p};
  /* Etapa 3 (INSTRUCAO-CAD-CAM.md): geo = ids de entidades do CAD 2D que
     ancoram a operação — usado pelo botão "Criar furação" (cad2d.js). */
  if(extra?.geo?.length) bloco.geo=extra.geo;
  SEQ.push(bloco);
  SELECIONADO=SEQ[SEQ.length-1].uid;
  renderPilha(); refresh();
  toast(D.nome+" adicionado");
}

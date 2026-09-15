"use strict";
/* pilha.js — pilha de blocos do Montador: renderização dos cards de operação, campos
   condicionais/saídas de ficha, edição, reordenar/duplicar/remover, salvar/abrir/limpar
   montagem e copiar/baixar o G-code gerado.
   Depende de globais definidos no <script> principal de montador_macro_cnc_2.html,
   carregados antes deste arquivo: $, num/fnum, avaliarExpr/interpretarEstrategia/ESTRATEGIAS
   (fichas.js), cfg(), DEFS/CUSTOM/CUSTOM_SEQ/registrarCustom/removerCustom (core), F_TROCA,
   SEQ, UID, SELECIONADO, toast(), refresh(), refreshDebounced(), refresh3DSelecao()
   (preview3d.js), renderPaleta() (paleta.js), DESENHO2D/DESENHO_ID (desenho2d.js) e
   `library` (elemento do shell, definido no <script> principal). */

/* ============================================================
   UI — PILHA
   ============================================================ */
/* ---------- campos condicionais e exibidos (fichas) ---------- */
/* contexto pro "quando": valores do bloco com string numérica
   coagida pra número (o <select> grava string) */
function ctxDoBloco(p){
  const c={};
  for(const k in p){ const v=p[k]; c[k]=(typeof v==="string" && v!=="" && !isNaN(+v)) ? +v : v; }
  return c;
}
function campoVisivel(f, ctx){
  if(f.quando===undefined) return true;
  try{ return !!avaliarExpr(f.quando, ctx); }
  catch(e){ return true; } /* condição quebrada nunca esconde campo */
}
/* saída = mostrador readonly de uma derivada (ctx do interpretador) */
function saidaHTML(sd, ctx){
  const v = ctx && ctx[sd.k]!==undefined ? fnum(ctx[sd.k]) : "—";
  return `<div class="field saida"><label>${sd.l||sd.k}</label>
    <div class="inrow">
      <input type="text" readonly tabindex="-1" value="${v}" data-out="${sd.k}">
      ${sd.u?`<span class="unit">${sd.u}</span>`:""}
    </div></div>`;
}
function atualizarSaidas(b){
  const est=ESTRATEGIAS[b.tipo];
  if(!est || !est.saidas) return;
  const ctx=interpretarEstrategia(est, b.p, cfg(), 100, b.p.td).ctx;
  document.querySelectorAll(`.bloco[data-uid="${b.uid}"] [data-out]`).forEach(el=>{
    const k=el.dataset.out;
    el.value = ctx && ctx[k]!==undefined ? fnum(ctx[k]) : "—";
  });
}

function campoHTML(f,val,uid){
  if(f.sel){
    return `<div class="field" style="grid-column:1/-1"><label>${f.l}</label>
      <div class="inrow"><select data-uid="${uid}" data-k="${f.k}">
        ${f.sel.map(o=>`<option value="${o.v}"${String(o.v)===String(val)?" selected":""}>${o.t}</option>`).join("")}
      </select></div></div>`;
  }
  if(f.chk){
    return `<label class="chk" style="grid-column:1/-1"><input type="checkbox" data-uid="${uid}" data-k="${f.k}"${val?" checked":""}> ${f.l}</label>`;
  }
  return `<div class="field"><label>${f.l}</label>
    <div class="inrow">
      <input type="number" step="${f.s||1}" value="${val}" data-uid="${uid}" data-k="${f.k}">
      ${f.u?`<span class="unit">${f.u}</span>`:""}
    </div></div>`;
}

function renderPilha(){
  const el=$("pilha");
  $("qtd").textContent = SEQ.length ? `· ${SEQ.length} bloco${SEQ.length>1?"s":""}` : "";
  if(!SEQ.length){
    el.innerHTML=`<div class="vazio">Pilha vazia.<br>Toque numa peça acima para começar a montar.</div>`;
  } else {
    el.innerHTML="";
    SEQ.forEach((b,i)=>{
      const D=DEFS[b.tipo];
      const ctxB=ctxDoBloco(b.p);
      const est=ESTRATEGIAS[b.tipo];
      let confHTML="";
      if(est && Array.isArray(est.saidas)){
        const vis=est.saidas.filter(sd=>campoVisivel(sd,ctxB));
        if(vis.length){
          const ctxI=interpretarEstrategia(est, b.p, cfg(), 100, b.p.td).ctx;
          confHTML=`<div class="sub">Conferência</div><div class="grid3">${vis.map(sd=>saidaHTML(sd,ctxI)).join("")}</div>`;
        }
      }
      const div=document.createElement("div");
      div.className="bloco"+(b.aberto?"":" fechado")+(SELECIONADO===b.uid?" sel":"");
      div.style.setProperty("--c",D.cor);
      div.dataset.uid=b.uid;
      div.innerHTML=`
        <div class="bhead">
          <div class="bnum">${i+1}</div>
          <div class="btit">${D.nome}<small>${D.sub}</small></div>
          <div class="bacts">
            <button class="ib" data-a="up"   title="Subir">▲</button>
            <button class="ib" data-a="down" title="Descer">▼</button>
            <button class="ib" data-a="dup"  title="Duplicar">⧉</button>
            <button class="ib del" data-a="del" title="Remover">✕</button>
          </div>
        </div>
        <div class="bbody">
          <div class="grid3">${D.params.filter(f=>campoVisivel(f,ctxB)).map(f=>campoHTML(f,b.p[f.k],b.uid)).join("")}</div>${confHTML}
          <div class="sub">Ferramenta deste bloco</div>
          <div class="grid3">
            ${F_TROCA.map(f=>campoHTML(f,b.p[f.k],b.uid)).join("")}
          </div>
        </div>`;
      el.appendChild(div);
    });
  }
  // ex-camada "inspetor": painel de detalhe da operação selecionada
  const holder=$('inspector-fields');holder.replaceChildren();
  const selected=SEQ.find(b=>b.uid===SELECIONADO);
  $('inspector-title').textContent=selected?DEFS[selected.tipo].nome:'Selecione uma operação';
  if(selected){const card=$('pilha').querySelector(`[data-uid="${selected.uid}"]`);const proxy=document.createElement('div');proxy.className='bloco';proxy.dataset.uid=selected.uid;proxy.append(card.querySelector('.bbody'));holder.append(proxy);}
  else holder.textContent='Adicione uma operação para definir ferramenta, medidas e parâmetros de corte.';
  $('pilha').querySelectorAll('.bhead').forEach(head=>{const title=head.querySelector('.btit');title.tabIndex=0;title.setAttribute('role','button');title.setAttribute('aria-label','Selecionar '+title.textContent);title.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();head.click();}});});
  holder.querySelectorAll('.field').forEach((field,i)=>{const input=field.querySelector('input,select');const label=field.querySelector('label');if(input&&label){input.id='operation-field-'+i;label.htmlFor=input.id;}});
  const empty=$('pilha').querySelector('.vazio');if(empty)empty.textContent='Nenhuma operação. Use Adicionar operação para começar.';
  if(SEQ.length)library.open=false;
  // ex-camada "desenho 2D": aviso de fileira vinculada no inspetor
  const linked=SEQ.find(x=>x.uid===SELECIONADO);
  if(linked?.desenho2D?.origem===DESENHO_ID){const info=document.createElement('div');info.className='linked-operation';info.textContent=`Fileira ${linked.desenho2D.fileira+1} vinculada ao desenho 2D. Alterações de posição aqui serão substituídas ao confirmar o desenho. Revise ferramenta e condições de corte.`;$('inspector-fields').prepend(info);}
}

document.querySelector(".wrap").addEventListener("click",e=>{
  const btn=e.target.closest(".ib");
  const head=e.target.closest(".bhead");
  const card=e.target.closest(".bloco");
  if(!card) return;
  const uid=+card.dataset.uid;
  const i=SEQ.findIndex(b=>b.uid===uid);
  if(btn){
    const a=btn.dataset.a;
    if(a==="del"){ SEQ.splice(i,1); if(SELECIONADO===uid) SELECIONADO=null; }
    if(a==="up"   && i>0){ [SEQ[i-1],SEQ[i]]=[SEQ[i],SEQ[i-1]]; }
    if(a==="down" && i<SEQ.length-1){ [SEQ[i+1],SEQ[i]]=[SEQ[i],SEQ[i+1]]; }
    if(a==="dup"){ const c=JSON.parse(JSON.stringify(SEQ[i])); c.uid=UID++; c.aberto=false; delete c.desenho2D; SEQ.splice(i+1,0,c); }
    renderPilha(); refresh(); return;
  }
  if(head){
    SEQ[i].aberto=!SEQ[i].aberto;
    SELECIONADO = uid;
    renderPilha(); refresh3DSelecao();
  }
});

function onEditPilha(e){
  const inp=e.target;
  if(!inp.dataset || !inp.dataset.uid) return;
  const b=SEQ.find(x=>x.uid===+inp.dataset.uid);
  if(!b) return;
  if(inp.tagName==="SELECT"){
    b.p[inp.dataset.k]=inp.value;
  } else if(inp.type==="checkbox"){
    b.p[inp.dataset.k]=inp.checked;
  } else {
    b.p[inp.dataset.k]=num(inp.value, b.p[inp.dataset.k]);
  }
  if(ESTRATEGIAS[b.tipo]){
    if(inp.tagName==="SELECT") renderPilha(); /* seletor decide quais campos aparecem */
    else atualizarSaidas(b);                  /* mostradores seguem a digitação, sem rebuild e sem roubar o foco */
  }
  refreshDebounced();
}
document.querySelector(".wrap").addEventListener("input",onEditPilha);
document.querySelector(".wrap").addEventListener("change",onEditPilha);

/* ---------- salvar / abrir / limpar ---------- */
$("salvarM").addEventListener("click",()=>{
  const data={cfg:{}, seq:SEQ, custom:CUSTOM, desenho2D:DESENHO2D.salvar()};
  ["nome","seg","bx","by","bz","cdiam"].forEach(k=>data.cfg[k]=$("g-"+k).value);
  data.cfg.g53=$("g-g53").checked;
  data.cfg.mat=$("g-mat").value;
  data.cfg.z=$("g-z").value;
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:"application/json"}));
  a.download=(cfg().nome||"MONTAGEM")+".json"; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  toast("Montagem salva");
});
$("abrirM").addEventListener("click",()=>$("fileM").click());
$("fileM").addEventListener("change",e=>{
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{ try{
      const d=JSON.parse(r.result);
      if(d.cfg){ Object.keys(d.cfg).forEach(k=>{
        const el=$("g-"+k); if(!el) return;
        if(k==="g53") el.checked=!!d.cfg[k]; else el.value=d.cfg[k];
      }); }
      Object.keys(CUSTOM).forEach(removerCustom);
      if(d.custom){
        Object.keys(d.custom).forEach(id=>{
          registrarCustom(id, d.custom[id]);
          const n=+id.replace(/\D/g,"");
          if(n>=CUSTOM_SEQ) CUSTOM_SEQ=n+1;
        });
      }
      renderPaleta();
      SEQ=(d.seq||[]).filter(b=>DEFS[b.tipo]).map(b=>{
        const nb={...b, uid:UID++, p:{...(b.p||{})}};
        DEFS[b.tipo].params.forEach(f=>{ if(!(f.k in nb.p)) nb.p[f.k]=f.d; });
        F_TROCA.forEach(f=>{ if(!(f.k in nb.p)) nb.p[f.k]=f.d; });
        return nb;
      });
      SELECIONADO=null;
      DESENHO2D.carregar(d.desenho2D);
      renderPilha(); refresh();
      toast("Montagem carregada");
    }catch(err){ toast("Arquivo inválido"); } };
  r.readAsText(f);
  e.target.value="";
});
$("limparM").addEventListener("click",()=>{
  if(!SEQ.length) return;
  SEQ=[]; SELECIONADO=null; renderPilha(); refresh();
  toast("Pilha limpa");
});

/* ---------- copiar / baixar ---------- */
$("copiar").addEventListener("click",async ()=>{
  try{ await navigator.clipboard.writeText($("saida").textContent); toast("Código copiado"); }
  catch(e){
    const ta=document.createElement("textarea");
    ta.value=$("saida").textContent; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy"); ta.remove();
    toast("Código copiado");
  }
});
$("baixar").addEventListener("click",()=>{
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([$("saida").textContent],{type:"text/plain"}));
  a.download=cfg().nome+".NC"; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  toast("Arquivo .NC baixado");
});

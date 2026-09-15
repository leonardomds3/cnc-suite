"use strict";
/* modal-macro.js — modal "Cadastrar/editar macro" do Montador: formulário de parâmetros,
   checagem de tokens/variáveis # do código colado e persistência via registrarCustom/removerCustom.
   Depende de globais definidos no <script> principal de montador_macro_cnc_2.html,
   carregados antes deste arquivo: $, num/fnum, tokensDoCodigo/varsDeclaradasNoCodigo/
   CODIGO_MODELO (corte.js), CORES_FAM/CUSTOM/CUSTOM_SEQ/registrarCustom/removerCustom
   (macros.js), DEFS, SEQ, toast(), refresh(), renderPaleta() (paleta.js), renderPilha()
   (pilha.js). */

/* ============================================================
   EDITOR DE MACROS PERSONALIZADOS
   ============================================================ */
let EDITANDO=null;   // id do macro em edição (null = novo)
let COR_SEL=0;

function corPickRender(){
  const el=$("m-cores"); el.innerHTML="";
  CORES_FAM.forEach((c,i)=>{
    const b=document.createElement("button");
    b.style.setProperty("--c",c.css);
    b.className = i===COR_SEL ? "on":"";
    b.addEventListener("click",()=>{ COR_SEL=i; corPickRender(); });
    el.appendChild(b);
  });
}
function paramRow(p){
  const div=document.createElement("div");
  div.className="prow";
  div.innerHTML=`
    <input type="text" data-pk="k" value="${p.k||""}" placeholder="prof">
    <input type="text" data-pk="l" value="${p.l||""}" placeholder="Profundidade">
    <input type="number" data-pk="d" value="${p.d!==undefined?p.d:""}" placeholder="10">
    <input type="number" data-pk="s" value="${p.s!==undefined?p.s:1}" step="0.1">
    <input type="text" data-pk="u" value="${p.u||""}" placeholder="mm">
    <button class="ib del" title="Remover">✕</button>`;
  div.querySelector(".ib").addEventListener("click",()=>{ div.remove(); checarTokens(); });
  $("m-params").appendChild(div);
}
function lerParams(){
  return [...document.querySelectorAll("#m-params .prow")].map(r=>{
    const g=k=>r.querySelector(`[data-pk="${k}"]`).value;
    return {k:g("k").trim(), l:g("l").trim()||g("k").trim(), d:num(g("d"),0), s:num(g("s"),1)||1, u:g("u").trim()};
  }).filter(p=>/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p.k));
}
function checarTokens(){
  const toks=tokensDoCodigo($("m-codigo").value);
  const chaves=lerParams().map(p=>p.k);
  const faltam=toks.filter(t=>!chaves.includes(t));
  const sobram=chaves.filter(k=>!toks.includes(k));
  let msg="";
  if(faltam.length) msg+="⚠ Tokens no código sem parâmetro: {"+faltam.join("} {")+"}   ";
  if(sobram.length) msg+="· Parâmetros sem uso no código: "+sobram.join(", ");
  $("m-check").textContent=msg;
}
/* ---- painel de variáveis # ---- */
let MVARS={};   // n -> {v, inc, passo, com}
function escanearVars(){
  const cod=$("m-codigo").value;
  const ns=new Set();
  (cod.match(/#\d+/g)||[]).forEach(u=>ns.add(+u.slice(1)));
  const decl=varsDeclaradasNoCodigo(cod);
  ns.forEach(n=>{ if(!(n in MVARS)) MVARS[n]={v:"0", inc:false, passo:1, com:""}; });
  Object.keys(MVARS).forEach(n=>{ if(!ns.has(+n)) delete MVARS[n]; });
  const el=$("m-vars"); el.innerHTML="";
  [...ns].sort((a,b)=>a-b).forEach(n=>{
    const row=document.createElement("div");
    if(decl.has(n)){
      row.className="vrow ok";
      row.innerHTML=`<b>#${n}</b><span class="vok">✓ declarada no código</span>`;
    } else {
      const v=MVARS[n];
      row.className="vrow";
      row.innerHTML=`<b>#${n}</b>
        <input type="text" data-vn="${n}" data-vk="v" value="${v.v}" placeholder="0 ou {chave}" title="Valor inicial de #${n}">
        <label class="chk"><input type="checkbox" data-vn="${n}" data-vk="inc"${v.inc?" checked":""}>incr.</label>
        <input type="number" data-vn="${n}" data-vk="passo" value="${v.passo}" step="0.1"${v.inc?"":" disabled"} title="Passo do incremento">
        <input type="text" data-vn="${n}" data-vk="com" value="${v.com}" placeholder="comentário" title="Comentário da declaração">
        <button type="button" class="ib" data-vins="${n}"${v.inc?"":" disabled"} title="Inserir #${n}=#${n}+passo no cursor">＋</button>`;
    }
    el.appendChild(row);
  });
}
$("m-vars").addEventListener("input",e=>{
  const inp=e.target;
  if(!inp.dataset || inp.dataset.vn===undefined) return;
  const v=MVARS[+inp.dataset.vn]; if(!v) return;
  const k=inp.dataset.vk;
  if(k==="inc"){ v.inc=inp.checked; escanearVars(); }
  else if(k==="passo") v.passo=num(inp.value,1);
  else v[k]=inp.value;
});
$("m-vars").addEventListener("click",e=>{
  const b=e.target.closest("[data-vins]");
  if(!b) return;
  const n=+b.dataset.vins, v=MVARS[n]; if(!v) return;
  const ta=$("m-codigo");
  const pos=ta.selectionStart!==undefined?ta.selectionStart:ta.value.length;
  const linha=`#${n}=#${n}+${fnum(v.passo)}`;
  const antes=ta.value.slice(0,pos), depois=ta.value.slice(pos);
  const quebraA = antes.endsWith("\n")||antes==="" ? "" : "\n";
  ta.value=antes+quebraA+linha+(depois.startsWith("\n")?"":"\n")+depois;
  ta.dispatchEvent(new Event("input",{bubbles:true}));
  toast(`#${n}=#${n}+${fnum(v.passo)} inserido`);
});
$("m-codigo").addEventListener("input",()=>{ checarTokens(); escanearVars(); });
$("m-params").addEventListener("input",checarTokens);
$("m-addparam").addEventListener("click",()=>{ paramRow({}); checarTokens(); });

function abrirEditor(id){
  EDITANDO=id||null;
  $("m-titulo").textContent = id ? "Editar macro" : "Cadastrar macro";
  $("m-excluir").style.display = id ? "" : "none";
  $("m-params").innerHTML="";
  if(id){
    const r=CUSTOM[id];
    $("m-nome").value=r.nome; $("m-sub").value=r.sub||"";
    COR_SEL=r.corIdx||0;
    r.params.forEach(paramRow);
    $("m-codigo").value=r.codigo;
  } else {
    $("m-nome").value=""; $("m-sub").value="";
    COR_SEL=CUSTOM_SEQ % CORES_FAM.length;
    [{k:"cx",l:"Centro X",d:0,s:1,u:"mm"},
     {k:"cy",l:"Centro Y",d:0,s:1,u:"mm"},
     {k:"ap",l:"Passo Z",d:1,s:0.1,u:"mm"},
     {k:"prof",l:"Profundidade",d:10,s:0.5,u:"mm"},
     {k:"fz",l:"F de mergulho",d:150,s:10,u:"mm/min"}].forEach(paramRow);
    $("m-codigo").value=CODIGO_MODELO;
  }
  MVARS = (id && CUSTOM[id].vars) ? JSON.parse(JSON.stringify(CUSTOM[id].vars)) : {};
  corPickRender(); checarTokens(); escanearVars();
  $("modalMacro").classList.add("aberto");
}
function fecharEditor(){ $("modalMacro").classList.remove("aberto"); }

$("novoMacro").addEventListener("click",()=>abrirEditor(null));
$("m-cancelar").addEventListener("click",fecharEditor);
$("modalMacro").addEventListener("click",e=>{ if(e.target.id==="modalMacro") fecharEditor(); });

$("m-salvar").addEventListener("click",()=>{
  const nome=$("m-nome").value.trim();
  if(!nome){ toast("Dê um nome ao macro"); return; }
  const codigo=$("m-codigo").value;
  if(!codigo.trim()){ toast("O código está vazio"); return; }
  const raw={nome, sub:$("m-sub").value.trim(), corIdx:COR_SEL, params:lerParams(), codigo, vars:JSON.parse(JSON.stringify(MVARS))};
  const id = EDITANDO || ("cst"+(CUSTOM_SEQ++));
  registrarCustom(id, raw);
  if(EDITANDO){
    SEQ.forEach(b=>{ if(b.tipo===id){
      DEFS[id].params.forEach(f=>{ if(!(f.k in b.p)) b.p[f.k]=f.d; });
    }});
  }
  fecharEditor(); renderPaleta(); renderPilha(); refresh();
  toast(EDITANDO ? "Macro atualizado" : `Macro "${nome}" cadastrado`);
  EDITANDO=null;
});
$("m-excluir").addEventListener("click",()=>{
  if(!EDITANDO) return;
  const n=SEQ.filter(b=>b.tipo===EDITANDO).length;
  removerCustom(EDITANDO);
  fecharEditor(); renderPaleta(); renderPilha(); refresh();
  toast("Macro excluído"+(n?` (${n} bloco${n>1?"s":""} removido${n>1?"s":""} da pilha)`:""));
  EDITANDO=null;
});

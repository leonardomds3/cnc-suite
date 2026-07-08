"use strict";
/* ============================================================
   ENGINE.JS — motor de usinagem Fanuc Macro B
   Compartilhado por estudio_cnc.html e montador_macro_cnc_2.html.

   Script classico (sem type="module") de proposito: imports de
   modulo ES sao bloqueados por CORS ao abrir um arquivo via
   file://, e os dois HTMLs precisam continuar abrindo com
   duplo clique, sem servidor.

   Nao depende de DOM, exceto cfg() (le os campos fixos de
   Programa/Material pelo id) — e nao depende de Three.js,
   exceto dentro de DEFS[id].volume(), que so e chamado pelo
   preview 3D de cada HTML (mesma degradacao graciosa que ja
   existia via TEM3D).
   ============================================================ */

/* ---------- helpers puros ---------- */
function num(v,d=0){ const n=parseFloat(v); return isNaN(n)?d:n; }
function fnum(n){ return (Math.round(n*1000)/1000).toString(); }            // p/ atribuição de variável
function fx(n){ let s=(Math.round(n*1000)/1000).toString(); if(!s.includes(".")) s+="."; return s; } // p/ coordenada
function noAcc(s){
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
          .replace(/ç/gi,"C").toUpperCase().replace(/[^A-Z0-9 \-\+\.\/=:#]/g,"");
}

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
   DEFINIÇÃO DOS BLOCOS
   Cada bloco: nome, cor, params, warn(), gerar(), volume()
   Variáveis-macro reutilizadas entre blocos (execução sequencial):
   #1 passo Z · #2 Z atual · #4 prof · #5/#6 meias-medidas úteis
   #12 passe lateral · #13 direção · #15 contador/offset
   #23/#24 centro X/Y · #26 Z segurança (global) · #30/#31 posição furo
   Rótulos N exclusivos por bloco: N{(i+1)*100 + 10,20,30...}
   ============================================================ */

const DEFS = {

  /* ---------------- FACEAMENTO ---------------- */
  face:{
    nome:"Faceamento", sub:"zigue-zague XY", cor:"var(--amber)", hex:0xffb02e,
    params:[
      {k:"sobre",l:"Sobremetal total",d:1,s:0.1,u:"mm"},
      {k:"ap",l:"Passo Z (ap)",d:0.5,s:0.1,u:"mm"},
      {k:"ae",l:"Passe lateral (ae)",d:7,s:0.5,u:"mm"},
      {k:"cx2",l:"Área X",d:220,s:5,u:"mm"},
      {k:"cy2",l:"Área Y",d:150,s:5,u:"mm"},
      {k:"f",l:"Avanço F",d:800,s:50,u:"mm/min"},
      {k:"est",l:"Estratégia",sel:[
        {v:"zig",t:"Zigue-zague (vai-e-vem)"},
        {v:"uma",t:"Uma direção só (concordante, retorna por cima)"},
      ],d:"zig"},
    ],
    warn(p,c,d){ const w=[];
      if(p.ae>d*0.95) w.push("Passe lateral maior que 95% do Ø da fresa: pode sobrar crista.");
      if(p.cx2<c.bx||p.cy2<c.by) w.push("Área de faceamento menor que o bloco de material.");
      return w; },
    gerar(p,c,nb,d){
      const L=[];
      L.push(`#1=${fnum(p.ap)}(PASSO Z)`);
      L.push(`#2=0(Z ATUAL)`);
      L.push(`#4=${fnum(p.sobre)}(SOBREMETAL TOTAL)`);
      L.push(`#6=${fnum(p.cy2/2)}(MEIO Y)`);
      L.push(`#16=0-#6(Y FINAL)`);
      L.push(`#7=${fnum(p.cx2/2+d)}(X DE APROXIMACAO - FORA DA PECA)`);
      L.push(`#12=${fnum(p.ae)}(PASSE LATERAL)`);
      if(p.est==="uma"){
        L.push(`N${nb+10}#2=#2+#1`);
        L.push(`IF[#2GT#4]THEN#2=#4`);
        L.push(`#15=#6(Y ATUAL)`);
        L.push(`N${nb+20}G0Z2.`);
        L.push(`G0X-[#7]Y[#15]`);
        L.push(`G0Z[0.5-#2]`);
        L.push(`G1Z-[#2]F${fnum(p.f/2)}`);
        L.push(`G1X[#7]F${fnum(p.f)}`);
        L.push(`#15=#15-#12`);
        L.push(`IF[#15GE#16]GOTO${nb+20}`);
        L.push(`G0Z2.`);
        L.push(`IF[#2LT#4]GOTO${nb+10}`);
        return L;
      }
      L.push(`N${nb+10}#2=#2+#1`);
      L.push(`IF[#2GT#4]THEN#2=#4`);
      L.push(`G0Z2.`);
      L.push(`G0X-[#7]Y[#6]`);
      L.push(`G0Z[0.5-#2]`);
      L.push(`G1Z-[#2]F${fnum(p.f/2)}`);
      L.push(`#15=#6(Y ATUAL)`);
      L.push(`#13=1(DIRECAO)`);
      L.push(`N${nb+20}G1X[#7*#13]F${fnum(p.f)}`);
      L.push(`#13=0-#13`);
      L.push(`#15=#15-#12`);
      L.push(`IF[#15LT#16]GOTO${nb+30}`);
      L.push(`G1Y[#15]`);
      L.push(`GOTO${nb+20}`);
      L.push(`N${nb+30}G0Z2.`);
      L.push(`IF[#2LT#4]GOTO${nb+10}`);
      return L;
    },
    volume(p,c){
      const g=new THREE.BoxGeometry(Math.min(p.cx2,c.bx*1.4), p.sobre, Math.min(p.cy2,c.by*1.4));
      const m=new THREE.Mesh(g); m.position.set(0,-p.sobre/2,0); return m;
    }
  },

  /* ---------------- BOLSA RETANGULAR ---------------- */
  bolsaRet:{
    nome:"Bolsa retangular", sub:"zigue-zague + contorno", cor:"var(--green)", hex:0x3ecf8e,
    params:[
      {k:"cx",l:"Centro X",d:0,s:1,u:"mm"},{k:"cy",l:"Centro Y",d:0,s:1,u:"mm"},
      {k:"lx",l:"Comprimento X",d:60,s:1,u:"mm"},{k:"ly",l:"Largura Y",d:40,s:1,u:"mm"},
      {k:"prof",l:"Profundidade",d:10,s:0.5,u:"mm"},
      {k:"ap",l:"Passo Z (ap)",d:1,s:0.1,u:"mm"},
      {k:"ae",l:"Passe lateral (ae)",d:6,s:0.5,u:"mm"},
      {k:"f",l:"Avanço F",d:500,s:50,u:"mm/min"},
      {k:"fz",l:"F de mergulho",d:150,s:10,u:"mm/min"},
      {k:"est",l:"Estratégia",sel:[
        {v:"zig",t:"Zigue-zague + contorno final"},
        {v:"cont",t:"Contorno concêntrico (de dentro para fora)"},
      ],d:"zig"},
    ],
    warn(p,c,d){ const w=[];
      if(p.lx<=d||p.ly<=d) w.push("Bolsa menor ou igual ao Ø da fresa: não há área útil.");
      if(p.prof>c.bz) w.push("Profundidade maior que a altura do bloco.");
      return w; },
    gerar(p,c,nb,d){
      const rf=d/2, L=[];
      L.push(`#23=${fnum(p.cx)}(CENTRO X)`);
      L.push(`#24=${fnum(p.cy)}(CENTRO Y)`);
      L.push(`#5=${fnum(Math.max(0.1,p.lx/2-rf))}(MEIO X UTIL - RAIO DA FRESA DESCONTADO)`);
      L.push(`#6=${fnum(Math.max(0.1,p.ly/2-rf))}(MEIO Y UTIL)`);
      L.push(`#16=0-#6(Y FINAL)`);
      L.push(`#1=${fnum(p.ap)}(PASSO Z)`);
      L.push(`#2=0(Z ATUAL)`);
      L.push(`#4=${fnum(p.prof)}(PROFUNDIDADE)`);
      L.push(`#12=${fnum(p.ae)}(PASSE LATERAL)`);
      if(p.est==="cont"){
        L.push(`N${nb+10}#2=#2+#1`);
        L.push(`IF[#2GT#4]THEN#2=#4`);
        L.push(`G0Z2.`);
        L.push(`G0X[#23]Y[#24]`);
        L.push(`G1Z-[#2]F${fnum(p.fz)}(MERGULHO NO CENTRO)`);
        L.push(`#15=0(OFFSET DO CONTORNO)`);
        L.push(`N${nb+20}#15=#15+#12`);
        L.push(`#18=#15(MEIO X DESTE CONTORNO)`);
        L.push(`IF[#18GT#5]THEN#18=#5`);
        L.push(`#19=#15(MEIO Y DESTE CONTORNO)`);
        L.push(`IF[#19GT#6]THEN#19=#6`);
        L.push(`G1X[#23-#18]Y[#24+#19]F${fnum(p.f)}`);
        L.push(`G1X[#23+#18]`);
        L.push(`G1Y[#24-#19]`);
        L.push(`G1X[#23-#18]`);
        L.push(`G1Y[#24+#19]`);
        L.push(`G1X[#23+#18](FECHA O CONTORNO)`);
        L.push(`IF[#15LT#5]GOTO${nb+20}`);
        L.push(`IF[#15LT#6]GOTO${nb+20}`);
        L.push(`G0Z2.`);
        L.push(`IF[#2LT#4]GOTO${nb+10}`);
        return L;
      }
      L.push(`N${nb+10}#2=#2+#1`);
      L.push(`IF[#2GT#4]THEN#2=#4`);
      L.push(`G0Z2.`);
      L.push(`G0X[#23-#5]Y[#24+#6]`);
      L.push(`G1Z-[#2]F${fnum(p.fz)}(MERGULHO)`);
      L.push(`#15=#6(Y ATUAL)`);
      L.push(`#13=1(DIRECAO)`);
      L.push(`N${nb+20}G1X[#23+[#5*#13]]F${fnum(p.f)}`);
      L.push(`#13=0-#13`);
      L.push(`#15=#15-#12`);
      L.push(`IF[#15LT#16]GOTO${nb+30}`);
      L.push(`G1Y[#24+#15]`);
      L.push(`GOTO${nb+20}`);
      L.push(`N${nb+30}(CONTORNO FINAL)`);
      L.push(`G1Y[#24-#6]`);
      L.push(`G1X[#23-#5]`);
      L.push(`G1Y[#24+#6]`);
      L.push(`G1X[#23+#5]`);
      L.push(`G1Y[#24-#6]`);
      L.push(`G0Z2.`);
      L.push(`IF[#2LT#4]GOTO${nb+10}`);
      return L;
    },
    volume(p){
      const m=new THREE.Mesh(new THREE.BoxGeometry(p.lx,p.prof,p.ly));
      m.position.set(p.cx,-p.prof/2,-p.cy); return m;
    }
  },

  /* ---------------- BOLSA CIRCULAR ---------------- */
  bolsaCirc:{
    nome:"Bolsa circular", sub:"espiral por círculos", cor:"var(--green)", hex:0x2fb377,
    params:[
      {k:"cx",l:"Centro X",d:0,s:1,u:"mm"},{k:"cy",l:"Centro Y",d:0,s:1,u:"mm"},
      {k:"dia",l:"Ø da bolsa",d:50,s:1,u:"mm"},
      {k:"prof",l:"Profundidade",d:10,s:0.5,u:"mm"},
      {k:"ap",l:"Passo Z (ap)",d:1,s:0.1,u:"mm"},
      {k:"pr",l:"Passe radial",d:5,s:0.5,u:"mm"},
      {k:"f",l:"Avanço F",d:500,s:50,u:"mm/min"},
      {k:"fz",l:"F de mergulho",d:150,s:10,u:"mm/min"},
      {k:"est",l:"Estratégia",sel:[
        {v:"esp",t:"Espiral por círculos (desbaste completo)"},
        {v:"par",t:"Só a parede (1 círculo por nível — acabamento)"},
      ],d:"esp"},
    ],
    warn(p,c,d){ const w=[];
      if(p.dia<=d) w.push("Ø da bolsa menor ou igual ao Ø da fresa.");
      if(p.prof>c.bz) w.push("Profundidade maior que a altura do bloco.");
      return w; },
    gerar(p,c,nb,d){
      const rf=d/2, L=[];
      L.push(`#23=${fnum(p.cx)}(CENTRO X)`);
      L.push(`#24=${fnum(p.cy)}(CENTRO Y)`);
      L.push(`#5=${fnum(Math.max(0.1,p.dia/2-rf))}(RAIO UTIL)`);
      L.push(`#1=${fnum(p.ap)}(PASSO Z)`);
      L.push(`#2=0(Z ATUAL)`);
      L.push(`#4=${fnum(p.prof)}(PROFUNDIDADE)`);
      if(p.est==="par"){
        L.push(`G0Z2.`);
        L.push(`G0X[#23]Y[#24]`);
        L.push(`N${nb+10}#2=#2+#1`);
        L.push(`IF[#2GT#4]THEN#2=#4`);
        L.push(`G1Z-[#2]F${fnum(p.fz)}(MERGULHO NO CENTRO)`);
        L.push(`G1X[#23+#5]F${fnum(p.f)}`);
        L.push(`G3I-[#5]`);
        L.push(`G1X[#23]`);
        L.push(`IF[#2LT#4]GOTO${nb+10}`);
        L.push(`G0Z2.`);
        return L;
      }
      L.push(`#12=${fnum(p.pr)}(PASSE RADIAL)`);
      L.push(`N${nb+10}#2=#2+#1`);
      L.push(`IF[#2GT#4]THEN#2=#4`);
      L.push(`G0Z2.`);
      L.push(`G0X[#23]Y[#24]`);
      L.push(`G1Z-[#2]F${fnum(p.fz)}(MERGULHO NO CENTRO)`);
      L.push(`#15=0(RAIO ATUAL)`);
      L.push(`N${nb+20}#15=#15+#12`);
      L.push(`IF[#15GT#5]THEN#15=#5`);
      L.push(`G1X[#23+#15]F${fnum(p.f)}`);
      L.push(`G3I-[#15]`);
      L.push(`IF[#15LT#5]GOTO${nb+20}`);
      L.push(`G1X[#23]Y[#24]`);
      L.push(`G0Z2.`);
      L.push(`IF[#2LT#4]GOTO${nb+10}`);
      return L;
    },
    volume(p){
      const m=new THREE.Mesh(new THREE.CylinderGeometry(p.dia/2,p.dia/2,p.prof,48));
      m.position.set(p.cx,-p.prof/2,-p.cy); return m;
    }
  },

  /* ---------------- ESCARIADO ANGULAR (estrategia do Chanfro_Conico.NC) ---------------- */
  escariado:{
    nome:"Escariado angular", sub:"círculo por nível · G41", cor:"var(--green)", hex:0x6fe0ac,
    params:[
      {k:"cx",l:"Centro X",d:0,s:1,u:"mm"},{k:"cy",l:"Centro Y",d:0,s:1,u:"mm"},
      {k:"raio",l:"Raio no topo (#5)",d:15,s:0.5,u:"mm"},
      {k:"ang",l:"Ângulo c/ eixo Z (#7)",d:66.8,s:0.1,u:"°"},
      {k:"prof",l:"Profundidade (#4)",d:6,s:0.1,u:"mm"},
      {k:"ap",l:"Incremento Z (#1)",d:0.1,s:0.05,u:"mm"},
      {k:"f",l:"Avanço F",d:1600,s:50,u:"mm/min"},
      {k:"comp",l:"Compensação de raio",sel:[
        {v:"g41",t:"Com G41/G40 (raio da peça no programa)"},
        {v:"sem",t:"Sem compensação (desconta o raio da fresa)"},
      ],d:"g41"},
    ],
    warn(p,c,d){ const w=[];
      if(p.ang<=0||p.ang>=90) w.push("Ângulo deve ficar entre 0° e 90° (medido a partir do eixo Z, como no Chanfro Cônico).");
      const queda=p.prof*Math.tan(p.ang*Math.PI/180);
      const rBase = p.comp==="sem" ? p.raio-d/2 : p.raio;
      if(rBase-queda<=0) w.push("O raio zera antes da profundidade final: reduza o ângulo, a profundidade ou aumente o raio.");
      if(p.comp==="g41" && p.raio<=d/2) w.push("Raio no topo menor que o raio da fresa: G41 vai alarmar.");
      if(p.prof>c.bz) w.push("Profundidade maior que a altura do bloco.");
      return w; },
    gerar(p,c,nb,d){
      const rf=d/2, L=[];
      const comG41 = p.comp!=="sem";
      L.push(`#23=${fnum(p.cx)}(CENTRO X)`);
      L.push(`#24=${fnum(p.cy)}(CENTRO Y)`);
      L.push(`#7=${fnum(p.ang)}(ANGULO COM O EIXO Z)`);
      L.push(`#5=${fnum(comG41?p.raio:Math.max(0.1,p.raio-rf))}(RAIO NO TOPO${comG41?"":" - RAIO DA FRESA DESCONTADO"})`);
      L.push(`#4=${fnum(p.prof)}(PROFUNDIDADE)`);
      L.push(`#1=${fnum(p.ap)}(INCREMENTO)`);
      L.push(`#2=0(Z ATUAL)`);
      L.push(`G0X[#23]Y[#24]`);
      L.push(`G0Z2.`);
      L.push(`N${nb+10}#2=#2+#1`);
      L.push(`#3=#2*TAN[#7]`);
      L.push(`#6=#5-#3(RAIO NESTE NIVEL)`);
      L.push(`IF[#2GT#4]GOTO${nb+20}`);
      L.push(`G1Z-[#2]F${fnum(p.f)}`);
      L.push(comG41 ? `G1G41X[#23+#6]` : `G1X[#23+#6]`);
      L.push(`G3I-[#6]`);
      L.push(comG41 ? `G1G40X[#23]` : `G1X[#23]`);
      L.push(`GOTO${nb+10}`);
      L.push(`N${nb+20}G0Z2.`);
      return L;
    },
    volume(p,c,d){
      const rb=Math.max(0.3, p.raio - p.prof*Math.tan(p.ang*Math.PI/180));
      const m=new THREE.Mesh(new THREE.CylinderGeometry(p.raio,rb,p.prof,48));
      m.position.set(p.cx,-p.prof/2,-p.cy); return m;
    }
  },

  /* ---------------- BOLSA CÔNICA (macro Bolsa_Final) ---------------- */
  bolsaCon:{
    nome:"Bolsa cônica", sub:"rampa em X · macro Bolsa_Final", cor:"var(--green)", hex:0x3fe0b0,
    params:[
      {k:"x8",l:"X fora da peça (#8)",d:85,s:1,u:"mm"},
      {k:"y9",l:"Meio comprimento Y (#9)",d:61,s:1,u:"mm"},
      {k:"r5",l:"Raio do Ø interno (#5)",d:100,s:1,u:"mm"},
      {k:"ang",l:"Ângulo da bolsa (#7)",d:16,s:0.5,u:"°"},
      {k:"prof",l:"Z final (#4)",d:28,s:0.5,u:"mm"},
      {k:"ap",l:"Incremento (#1)",d:0.25,s:0.05,u:"mm"},
      {k:"f",l:"Avanço F",d:2000,s:50,u:"mm/min"},
      {k:"esp",l:"Espelhar para a bolsa oposta (G51.1 X0)",chk:true,d:false},
    ],
    warn(p,c,d){ const w=[];
      const queda=p.prof*Math.tan(p.ang*Math.PI/180);
      if(p.r5-queda<=0) w.push("X da parede zera antes do Z final: reduza o ângulo ou o Z final.");
      if(p.x8 >= p.r5-queda-d/2) w.push("X de recuo (#8) invade a parede na profundidade final — deixe folga de raio da ferramenta + segurança (o macro original usa ~20 mm).");
      w.push("Atenção — zero desta operação segue o macro Bolsa_Final: X centro, Y centro, Z na JUNÇÃO (zerar o X pelo X final na profundidade final da bolsa).");
      return w; },
    gerar(p,c,nb,d){
      const L=[];
      L.push(`(ZERO: X CENTRO / Y CENTRO / Z NA JUNCAO)`);
      L.push(`(ZERAR O X COM O VALOR DO X FINAL NA PROFUNDIDADE FINAL DA BOLSA)`);
      if(p.esp) L.push(`G51.1X0.(ESPELHAMENTO PARA BOLSA OPOSTA)`);
      L.push(`#8=${fnum(p.x8)}(X DE POSICIONAMENTO FORA DA PECA)`);
      L.push(`#9=${fnum(p.y9)}(METADE DO COMPRIMENTO DA BOLSA)`);
      L.push(`G0X[#8]Y[#9](POSICIONAMENTO INICIAL)`);
      L.push(`#1=${fnum(p.ap)}(INCREMENTO)`);
      L.push(`#2=0(Z INICIAL)`);
      L.push(`#7=${fnum(p.ang)}(ANGULO DA BOLSA)`);
      L.push(`#4=${fnum(p.prof)}(Z FINAL)`);
      L.push(`#5=${fnum(p.r5)}(RAIO DO DIAMETRO INTERNO)`);
      L.push(`N${nb+10}#2=#1+#2(Z + INCREMENTO)`);
      L.push(`#3=#2*TAN[#7](INCREMENTO DA RAMPA ATE O X FINAL)`);
      L.push(`#6=#5-#3(X INICIAL = RAIO - #3)`);
      L.push(`IF[#2GT#4]GOTO${nb+20}(LOOPING ATE O Z FINAL)`);
      L.push(`G0Z-[#2]`);
      L.push(`G1X[#6]F${fnum(p.f)}`);
      L.push(`G1Y-[#9]`);
      L.push(`G1X[#8]`);
      L.push(`#2=#1+#2`);
      L.push(`#3=#2*TAN[#7]`);
      L.push(`#6=#5-#3`);
      L.push(`IF[#2GT#4]GOTO${nb+20}(LOOPING ATE O Z FINAL)`);
      L.push(`G0Z-[#2]`);
      L.push(`G1X[#6]F${fnum(p.f)}`);
      L.push(`G1Y[#9]`);
      L.push(`G1X[#8]`);
      L.push(`GOTO${nb+10}`);
      L.push(`N${nb+20}G0Z2.`);
      if(p.esp) L.push(`G50.1(CANCELA ESPELHAMENTO)`);
      return L;
    },
    volume(p,c,d){
      const queda=p.prof*Math.tan(p.ang*Math.PI/180);
      const xParedeFundo=Math.max(0.5, p.r5-queda);
      function cunha(sinal){
        const sh=new THREE.Shape();
        sh.moveTo(sinal*p.x8, 0);
        sh.lineTo(sinal*p.r5, 0);
        sh.lineTo(sinal*xParedeFundo, -p.prof);
        sh.lineTo(sinal*p.x8, -p.prof);
        sh.closePath();
        const g=new THREE.ExtrudeGeometry(sh,{depth:2*p.y9,bevelEnabled:false});
        g.translate(0,0,-p.y9);
        return new THREE.Mesh(g);
      }
      if(!p.esp) return cunha(1);
      const grp=new THREE.Group();
      grp.add(cunha(1)); grp.add(cunha(-1));
      return grp;
    }
  },

  /* ---------------- CANAL RETO ---------------- */
  canal:{
    nome:"Canal reto", sub:"desbaste + acabamento", cor:"var(--cyan)", hex:0x4dd0e1,
    params:[
      {k:"cx",l:"Centro X",d:0,s:1,u:"mm"},{k:"cy",l:"Centro Y",d:0,s:1,u:"mm"},
      {k:"comp",l:"Comprimento",d:100,s:1,u:"mm"},
      {k:"larg",l:"Largura final",d:16,s:0.5,u:"mm"},
      {k:"prof",l:"Profundidade",d:8,s:0.5,u:"mm"},
      {k:"ori",l:"Direção do canal",sel:[
        {v:"x",t:"Ao longo de X"},
        {v:"y",t:"Ao longo de Y"},
      ],d:"x"},
      {k:"est",l:"Estratégia de desbaste",sel:[
        {v:"lat",t:"Incremento no Z + passes laterais"},
        {v:"soz",t:"Incremento só no Z (vai-e-vem no centro)"},
      ],d:"lat"},
      {k:"ap",l:"AP desbaste",d:0.25,s:0.05,u:"mm"},
      {k:"f",l:"F desbaste",d:2000,s:50,u:"mm/min"},
      {k:"sobre",l:"Sobremetal lateral",d:0.5,s:0.1,u:"mm"},
      {k:"acab",l:"Fazer acabamento (passe nas paredes)",chk:true,d:true},
      {k:"apA",l:"AP acabamento",d:8,s:0.5,u:"mm"},
      {k:"fA",l:"F acabamento",d:800,s:50,u:"mm/min"},
    ],
    warn(p,c,d){ const w=[];
      if(d>p.larg){ w.push(`ERRO: Ø da fresa (${fnum(d)}) maior que a largura do canal (${fnum(p.larg)}) — bloco não gerado.`); return w; }
      const offA=(p.larg-d)/2;
      if(offA>0.005) w.push(`Folga da ferramenta: ${fnum(offA)} mm para cada lado (canal ${fnum(p.larg)} · fresa Ø${fnum(d)}).`);
      if(p.est==="soz" && offA>0.005 && !p.acab) w.push("Estratégia só no Z deixa a largura da fresa: ligue o acabamento ou use passes laterais para chegar na largura final.");
      if(p.acab && p.larg-2*p.sobre<d) w.push("Sobremetal lateral maior que a folga: o desbaste sairá na linha de centro e o acabamento remove o resto.");
      if(p.prof>c.bz) w.push("Profundidade maior que a altura do bloco.");
      return w; },
    gerar(p,c,nb,d){
      if(d>p.larg) return [`(ERRO: FERRAMENTA O${fnum(d)} MAIOR QUE A LARGURA ${fnum(p.larg)} - BLOCO NAO GERADO)`];
      const L=[];
      const A = p.ori==="x" ? "X" : "Y";
      const B = p.ori==="x" ? "Y" : "X";
      const aC = p.ori==="x" ? "#23" : "#24";
      const bC = p.ori==="x" ? "#24" : "#23";
      const offD = Math.max(0, (p.larg - 2*p.sobre - d)/2);
      const offA = (p.larg - d)/2;
      L.push(`#23=${fnum(p.cx)}(CENTRO X)`);
      L.push(`#24=${fnum(p.cy)}(CENTRO Y)`);
      L.push(`#8=${fnum(p.comp/2)}(MEIO COMPRIMENTO)`);
      L.push(`#4=${fnum(p.prof)}(PROFUNDIDADE)`);
      const lateral = p.est==="lat" && offD>0.005;
      L.push(`(DESBASTE${lateral?` - ${fnum(offD)} PARA CADA LADO`:" - SO INCREMENTO NO Z"})`);
      if(lateral){
        L.push(`G0${A}[${aC}+#8]${B}[${bC}+${fnum(offD)}]`);
        L.push(`G0Z2.`);
        L.push(`#1=0(Z ATUAL)`);
        L.push(`N${nb+10}IF[#1GT#4]GOTO${nb+20}`);
        L.push(`G0Z-[#1]`);
        L.push(`G1${A}[${aC}-#8]F${fnum(p.f)}`);
        L.push(`G1${B}[${bC}-${fnum(offD)}]`);
        L.push(`G1${A}[${aC}+#8]`);
        L.push(`G0${B}[${bC}+${fnum(offD)}]`);
        L.push(`#1=#1+${fnum(p.ap)}`);
        L.push(`GOTO${nb+10}`);
      } else {
        L.push(`G0${A}[${aC}+#8]${B}[${bC}]`);
        L.push(`G0Z2.`);
        L.push(`#1=0(Z ATUAL)`);
        L.push(`N${nb+10}IF[#1GT#4]GOTO${nb+20}`);
        L.push(`G0Z-[#1]`);
        L.push(`G1${A}[${aC}-#8]F${fnum(p.f)}`);
        L.push(`#1=#1+${fnum(p.ap)}`);
        L.push(`IF[#1GT#4]GOTO${nb+20}`);
        L.push(`G0Z-[#1]`);
        L.push(`G1${A}[${aC}+#8]`);
        L.push(`#1=#1+${fnum(p.ap)}`);
        L.push(`GOTO${nb+10}`);
      }
      L.push(`N${nb+20}G0Z2.`);
      if(p.acab){
        L.push(`(ACABAMENTO - ${fnum(offA)} PARA CADA LADO)`);
        L.push(`G0${A}[${aC}+#8]${B}[${bC}+${fnum(offA)}]`);
        L.push(`#1=0(Z ATUAL)`);
        L.push(`N${nb+30}#1=#1+${fnum(p.apA)}`);
        L.push(`IF[#1GT#4]THEN#1=#4`);
        L.push(`G0Z-[#1]`);
        L.push(`G1${A}[${aC}-#8]F${fnum(p.fA)}`);
        L.push(`G1${B}[${bC}-${fnum(offA)}]`);
        L.push(`G1${A}[${aC}+#8]`);
        L.push(`G0${B}[${bC}+${fnum(offA)}]`);
        L.push(`IF[#1LT#4]GOTO${nb+30}`);
        L.push(`G0Z2.`);
      }
      return L;
    },
    volume(p,c,d){
      const larg=Math.max(p.larg,d);
      const gx = p.ori==="x" ? p.comp : larg;
      const gy = p.ori==="x" ? larg : p.comp;
      const m=new THREE.Mesh(new THREE.BoxGeometry(gx,p.prof,gy));
      m.position.set(p.cx,-p.prof/2,-p.cy); return m;
    }
  },
  canalR:{
    nome:"Canal fundo raiado", sub:"raio R no fundo (Y)", cor:"var(--cyan)", hex:0x2fa6b5,
    params:[
      {k:"cx",l:"Centro X",d:0,s:1,u:"mm"},{k:"cy",l:"Centro Y",d:0,s:1,u:"mm"},
      {k:"comp",l:"Comprimento (Y)",d:110,s:1,u:"mm"},
      {k:"larg",l:"Largura (X)",d:20,s:0.5,u:"mm"},
      {k:"prof",l:"Prof. no centro",d:12,s:0.5,u:"mm"},
      {k:"raio",l:"Raio do fundo",d:115,s:1,u:"mm"},
      {k:"profp",l:"Prof. nas pontas",d:6,s:0.5,u:"mm"},
      {k:"ap",l:"AP desbaste",d:0.5,s:0.1,u:"mm"},
      {k:"ae",l:"Passe lateral (ae)",d:4,s:0.5,u:"mm"},
      {k:"f",l:"F desbaste",d:400,s:50,u:"mm/min"},
      {k:"sobre",l:"Sobremetal lateral",d:0.5,s:0.1,u:"mm"},
      {k:"acab",l:"Fazer acabamento (AP independente no raio)",chk:true,d:true},
      {k:"apAR",l:"AP acab. parte reta",d:8,s:0.5,u:"mm"},
      {k:"apAF",l:"AP acab. do raio",d:0.2,s:0.05,u:"mm"},
      {k:"fA",l:"F acabamento",d:300,s:50,u:"mm/min"},
    ],
    warn(p,c,d){ const w=[];
      if(d>p.larg){ w.push(`ERRO: Ø da fresa (${fnum(d)}) maior que a largura do canal (${fnum(p.larg)}) — bloco não gerado.`); return w; }
      const offA=(p.larg-d)/2;
      if(offA>0.005) w.push(`Folga da ferramenta: ${fnum(offA)} mm para cada lado (canal ${fnum(p.larg)} · fresa Ø${fnum(d)}).`);
      if(p.profp>=p.prof) w.push("Prof. nas pontas deve ser MENOR que a prof. no centro.");
      if(p.raio<p.prof-p.profp) w.push("Raio do fundo menor que a queda (prof − prof. pontas): geometria impossível.");
      const yArc=Math.sqrt(Math.max(0,p.raio*p.raio-Math.pow(p.raio-(p.prof-p.profp),2)));
      if(yArc>p.comp/2) w.push("O arco do fundo é mais comprido que o canal: aumente o comprimento ou o raio.");
      return w; },
    gerar(p,c,nb,d){
      if(d>p.larg) return [`(ERRO: FERRAMENTA O${fnum(d)} MAIOR QUE A LARGURA ${fnum(p.larg)} - BLOCO NAO GERADO)`];
      const rf=d/2, L=[];
      const largD=Math.max(d, p.larg-2*p.sobre);
      L.push(`(DESBASTE - SOBREMETAL LATERAL ${fnum(p.sobre)})`);
      L.push(`#23=${fnum(p.cx)}(CENTRO X)`);
      L.push(`#24=${fnum(p.cy)}(CENTRO Y)`);
      L.push(`#7=${fnum(p.raio)}(RAIO DO FUNDO)`);
      L.push(`#8=${fnum(Math.max(0.1,p.comp/2-rf))}(MEIO COMPRIMENTO UTIL)`);
      L.push(`#5=${fnum(Math.max(0,largD/2-rf))}(MEIA LARGURA UTIL DO DESBASTE)`);
      L.push(`#11=${fnum(p.profp)}(PROF DO FUNDO RETO NAS PONTAS - ONDE COMECA O RAIO)`);
      L.push(`#1=${fnum(p.ap)}(PASSO Z)`);
      L.push(`#2=0(Z ATUAL)`);
      L.push(`#4=${fnum(p.prof)}(PROF NO CENTRO)`);
      L.push(`#12=${fnum(p.ae)}(PASSE LATERAL)`);
      L.push(`#10=${fnum(p.f)}(AVANCO)`);
      L.push(`#13=1(DIRECAO)`);
      L.push(`G0X[#23]Y[#24+#8]`);
      L.push(`G0Z2.`);
      L.push(`N${nb+10}#2=#2+#1`);
      L.push(`IF[#2GE#4]THEN#2=#4`);
      L.push(`#3=#4-#2(QUANTO FALTA)`);
      L.push(`#17=#7-#3`);
      L.push(`IF[#2LE#11]THEN#9=#8`);
      L.push(`IF[#2GT#11]THEN#9=SQRT[[#7*#7]-[#17*#17]](MEIO COMPRIMENTO NESTE NIVEL)`);
      L.push(`G1X[#23]Y[#24-[#9*#13]]Z-[#2]F[#10](MERGULHO EM RAMPA AO LONGO DO Y)`);
      L.push(`#15=0(OFFSET X)`);
      L.push(`N${nb+20}#15=#15+#12`);
      L.push(`IF[#15GE#5]THEN#15=#5`);
      L.push(`G1X[#23+#15]`);
      L.push(`G1Y[#24+[#9*#13]]`);
      L.push(`G1X[#23-#15]`);
      L.push(`G1Y[#24-[#9*#13]]`);
      L.push(`IF[#15LT#5]GOTO${nb+20}`);
      L.push(`G1X[#23]`);
      L.push(`#13=0-#13`);
      L.push(`IF[#2LT#4]GOTO${nb+10}`);
      L.push(`G0Z2.`);
      if(p.acab){
        const offA=(p.larg-d)/2;
        L.push(`(ACABAMENTO - AP ${fnum(p.apAR)} NA RETA / AP ${fnum(p.apAF)} NO RAIO)`);
        L.push(`(A PROF DAS PONTAS #11 SEPARA OS DOIS AP)`);
        L.push(`#19=${fnum(offA)}(OFFSET DO ACABAMENTO)`);
        L.push(`#2=0(Z ATUAL)`);
        L.push(`G0X[#23]Y[#24+#8]`);
        L.push(`G0Z2.`);
        L.push(`N${nb+40}IF[#2LT#11]THEN#1=${fnum(p.apAR)}(AP DA PARTE RETA)`);
        L.push(`IF[#2GE#11]THEN#1=${fnum(p.apAF)}(AP DO RAIO)`);
        L.push(`#2=#2+#1`);
        L.push(`IF[#2GT#4]THEN#2=#4`);
        L.push(`#3=#4-#2`);
        L.push(`#17=#7-#3`);
        L.push(`IF[#2LE#11]THEN#9=#8`);
        L.push(`IF[#2GT#11]THEN#9=SQRT[[#7*#7]-[#17*#17]]`);
        L.push(`G0X[#23]Y[#24+#9]`);
        L.push(`G1Z-[#2]F${fnum(p.fA)}`);
        L.push(`G1X[#23+#19]`);
        L.push(`G1Y[#24-#9]`);
        L.push(`G1X[#23-#19]`);
        L.push(`G1Y[#24+#9]`);
        L.push(`G1X[#23]`);
        L.push(`IF[#2LT#4]GOTO${nb+40}`);
        L.push(`G0Z2.`);
      }
      return L;
    },
    volume(p,c,d){
      const P=p.prof, R=Math.max(p.raio, P-p.profp+0.01), profP=Math.min(p.profp,P-0.01);
      const yh=p.comp/2;
      let yArc=Math.sqrt(Math.max(0,R*R-Math.pow(R-(P-profP),2)));
      yArc=Math.min(yArc,yh-0.001);
      const sh=new THREE.Shape();
      sh.moveTo(-yh,0);
      sh.lineTo(-yh,-profP);
      const N=36;
      for(let i=0;i<=N;i++){
        const y=-yArc+ (2*yArc)*(i/N);
        const z=-(P-(R-Math.sqrt(Math.max(0,R*R-y*y))));
        sh.lineTo(y, Math.max(z,-P));
      }
      sh.lineTo(yh,-profP);
      sh.lineTo(yh,0);
      sh.closePath();
      const larg=Math.max(p.larg,d);
      const g=new THREE.ExtrudeGeometry(sh,{depth:larg,bevelEnabled:false});
      g.rotateY(Math.PI/2);
      g.translate(p.cx-larg/2,0,-p.cy);
      return new THREE.Mesh(g);
    }
  },

  /* ---------------- FURAÇÃO EM LINHA ---------------- */
  furosL:{
    nome:"Furos em linha", sub:"ciclo G83 / G81", cor:"var(--violet)", hex:0xb388ff,
    params:[
      {k:"x0",l:"X do 1º furo",d:-60,s:1,u:"mm"},{k:"y0",l:"Y do 1º furo",d:-50,s:1,u:"mm"},
      {k:"ix",l:"Incremento X",d:30,s:1,u:"mm"},{k:"iy",l:"Incremento Y",d:0,s:1,u:"mm"},
      {k:"n",l:"Qtd de furos",d:5,s:1},
      {k:"dia",l:"Ø da broca",d:8,s:0.5,u:"mm"},
      {k:"prof",l:"Profundidade",d:20,s:0.5,u:"mm"},
      {k:"q",l:"Peck Q (0 = G81)",d:5,s:0.5,u:"mm"},
      {k:"f",l:"Avanço F",d:120,s:10,u:"mm/min"},
    ],
    warn(p,c,d){ const w=[];
      if(p.n<1) w.push("Quantidade de furos deve ser 1 ou mais.");
      if(p.prof>c.bz) w.push("Furo mais profundo que a altura do bloco (furo passante).");
      return w; },
    gerar(p,c,nb,d){
      const ciclo = p.q>0 ? `G83` : `G81`;
      const qtxt  = p.q>0 ? `Q${fx(p.q)}` : ``;
      const L=[];
      L.push(`#25=${fnum(Math.max(1,Math.round(p.n)))}(QTD DE FUROS)`);
      L.push(`#15=0(CONTADOR)`);
      L.push(`N${nb+10}#30=${fnum(p.x0)}+[#15*[${fnum(p.ix)}]](X DO FURO)`);
      L.push(`#31=${fnum(p.y0)}+[#15*[${fnum(p.iy)}]](Y DO FURO)`);
      L.push(`G0X[#30]Y[#31]`);
      L.push(`G98${ciclo}X[#30]Y[#31]Z-${fx(p.prof)}R2.${qtxt}F${fnum(p.f)}`);
      L.push(`G80`);
      L.push(`#15=#15+1`);
      L.push(`IF[#15LT#25]GOTO${nb+10}`);
      return L;
    },
    volume(p){
      const grp=new THREE.Group();
      const n=Math.max(1,Math.round(p.n));
      for(let i=0;i<n;i++){
        const m=new THREE.Mesh(new THREE.CylinderGeometry(p.dia/2,p.dia/2,p.prof,24));
        m.position.set(p.x0+i*p.ix, -p.prof/2, -(p.y0+i*p.iy));
        grp.add(m);
      }
      return grp;
    }
  },

  /* ---------------- FURAÇÃO EM CÍRCULO ---------------- */
  furosC:{
    nome:"Furos em círculo", sub:"círculo de furos", cor:"var(--violet)", hex:0x8f6ae0,
    params:[
      {k:"cx",l:"Centro X",d:0,s:1,u:"mm"},{k:"cy",l:"Centro Y",d:0,s:1,u:"mm"},
      {k:"dc",l:"Ø do círculo",d:80,s:1,u:"mm"},
      {k:"n",l:"Qtd de furos",d:6,s:1},
      {k:"a0",l:"Ângulo inicial",d:0,s:5,u:"°"},
      {k:"dia",l:"Ø da broca",d:8,s:0.5,u:"mm"},
      {k:"prof",l:"Profundidade",d:20,s:0.5,u:"mm"},
      {k:"q",l:"Peck Q (0 = G81)",d:5,s:0.5,u:"mm"},
      {k:"f",l:"Avanço F",d:120,s:10,u:"mm/min"},
    ],
    warn(p,c,d){ const w=[];
      if(p.n<1) w.push("Quantidade de furos deve ser 1 ou mais.");
      if(p.prof>c.bz) w.push("Furo mais profundo que a altura do bloco (furo passante).");
      return w; },
    gerar(p,c,nb,d){
      const ciclo = p.q>0 ? `G83` : `G81`;
      const qtxt  = p.q>0 ? `Q${fx(p.q)}` : ``;
      const L=[];
      L.push(`#23=${fnum(p.cx)}(CENTRO X)`);
      L.push(`#24=${fnum(p.cy)}(CENTRO Y)`);
      L.push(`#7=${fnum(p.dc/2)}(RAIO DO CIRCULO DE FUROS)`);
      L.push(`#25=${fnum(Math.max(1,Math.round(p.n)))}(QTD DE FUROS)`);
      L.push(`#32=360/#25(PASSO ANGULAR)`);
      L.push(`#33=${fnum(p.a0)}(ANGULO ATUAL)`);
      L.push(`#15=0(CONTADOR)`);
      L.push(`N${nb+10}#30=#23+[#7*COS[#33]](X DO FURO)`);
      L.push(`#31=#24+[#7*SIN[#33]](Y DO FURO)`);
      L.push(`G0X[#30]Y[#31]`);
      L.push(`G98${ciclo}X[#30]Y[#31]Z-${fx(p.prof)}R2.${qtxt}F${fnum(p.f)}`);
      L.push(`G80`);
      L.push(`#33=#33+#32`);
      L.push(`#15=#15+1`);
      L.push(`IF[#15LT#25]GOTO${nb+10}`);
      return L;
    },
    volume(p){
      const grp=new THREE.Group();
      const n=Math.max(1,Math.round(p.n));
      for(let i=0;i<n;i++){
        const a=(p.a0+i*360/n)*Math.PI/180;
        const m=new THREE.Mesh(new THREE.CylinderGeometry(p.dia/2,p.dia/2,p.prof,24));
        m.position.set(p.cx+(p.dc/2)*Math.cos(a), -p.prof/2, -(p.cy+(p.dc/2)*Math.sin(a)));
        grp.add(m);
      }
      return grp;
    }
  },
};

const ORDEM = ["face","bolsaRet","bolsaCirc","bolsaCon","escariado","canal","canalR","furosL","furosC"];

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
          l=l.replace(/\bN(\d{1,2})\b/g,(m,n)=>"N"+(nb+ +n));
          l=l.replace(/GOTO(\d{1,2})\b/g,(m,n)=>"GOTO"+(nb+ +n));
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
   do contexto (inputs/derivadas/diam/nb) e comparadores para os
   avisos. Sem eval() — JSON editável pelo usuário não pode virar
   JS executável. Mesma descida recursiva do evalExpr do execNC. */
function avaliarExpr(expr, ctx){
  const s=String(expr).replace(/\s+/g,"");
  let p=0;
  function primario(){
    if(s[p]==="("){ p++; const v=soma(); if(s[p]!==")") throw new Error(`falta ")" em "${expr}"`); p++; return v; }
    if(/[\d.]/.test(s[p]||"")){ let n=""; while(/[\d.]/.test(s[p]||"")) n+=s[p++];
      const v=parseFloat(n); if(isNaN(v)) throw new Error(`número inválido em "${expr}"`); return v; }
    if(/[a-zA-Z_]/.test(s[p]||"")){ let n=""; while(/[a-zA-Z0-9_]/.test(s[p]||"")) n+=s[p++];
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

/* Executa a ficha e devolve {linhas, avisos}. Erro de ficha
   (nome errado, expressão malformada) vira aviso e a linha
   mantém o placeholder — nunca derruba a geração. */
function interpretarEstrategia(est, p, c, nb, d){
  const avisos=[];
  /* 1. inputs */
  const ctx={diam:d, nb:nb};
  (est.inputs||[]).forEach(inp=>{ ctx[inp.k]= p[inp.k]!==undefined ? p[inp.k] : inp.d; });
  /* 2. derivadas, na ordem declarada no JSON */
  Object.entries(est.derivadas||{}).forEach(([k,ex])=>{
    try{ ctx[k]=avaliarExpr(ex,ctx); }
    catch(e){ avisos.push(`derivada "${k}": ${e.message}`); ctx[k]=0; }
  });
  /* 3. avisos — só informam, nunca bloqueiam */
  (est.avisos||[]).forEach(a=>{
    try{ if(avaliarExpr(a.se,ctx)) avisos.push(a.msg); }
    catch(e){ avisos.push(`aviso "${a.se}": ${e.message}`); }
  });
  /* 4+5. resolver placeholders e emitir na ordem do template */
  const linhas=(est.template||[]).map(l=>
    l.replace(/\{([^{}]+)\}/g,(m,ex)=>{
      try{ return fnum(avaliarExpr(ex,ctx)); }
      catch(e){ avisos.push(`placeholder {${ex}}: ${e.message}`); return m; }
    }));
  return {linhas, avisos};
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
    params:(est.inputs||[]).map(i=>({k:i.k,l:i.l||i.k,d:i.d,s:i.s||1,u:i.u||""})),
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
  return out;
}

/* ============================================================
   IMPORTAÇÃO DE .NC — interpretador Fanuc / Macro B
   Simula o programa e devolve os segmentos do caminho da
   ferramenta (rápido G0 vs corte G1/G2/G3) para o preview 3D.
   ============================================================ */
const IMPORTS = [];               // {uid, nome, segs, visivel, hex, avisos}
const CORES_IMP = [0x6ea8fe, 0xff8fab, 0xffd166, 0x9ef01a, 0xf0625a, 0xffffff];

function execNC(texto){
  const avisos=[];
  const segs=[];                  // {ax,ay,az, bx,by,bz, rapid}
  /* ---- pré-processamento ---- */
  const brutas = texto.split(/\r?\n/);
  const stmts=[]; const labels={};
  for(let i=0;i<brutas.length;i++){
    let l=brutas[i];
    l=l.replace(/\(.*?\)/g,"").replace(/;.*$/,"");
    l=l.toUpperCase().replace(/\s+/g,"");
    if(!l || l==="%" ) continue;
    if(/^O\d+$/.test(l)) continue;
    if(/^<.*>$/.test(l)) continue;
    const m=l.match(/^N(\d+)/);
    if(m){ labels[+m[1]]=stmts.length; l=l.slice(m[0].length); if(!l) { stmts.push(""); continue; } }
    stmts.push(l);
  }

  /* ---- avaliador de expressões ---- */
  const vars={};
  const FN={SIN:x=>Math.sin(x*Math.PI/180),COS:x=>Math.cos(x*Math.PI/180),
    TAN:x=>Math.tan(x*Math.PI/180),ASIN:x=>Math.asin(x)*180/Math.PI,
    ACOS:x=>Math.acos(x)*180/Math.PI,ATAN:x=>Math.atan(x)*180/Math.PI,
    SQRT:Math.sqrt,ABS:Math.abs,ROUND:Math.round,FIX:Math.floor,FUP:Math.ceil,
    LN:Math.log,EXP:Math.exp};
  function evalExpr(s){
    let p=0;
    function ws(){ /* já sem espaços */ }
    function achaFecha(str,i0){ let n=0;
      for(let i=i0;i<str.length;i++){ if(str[i]==="[")n++; if(str[i]==="]"){n--; if(n===0)return i;} }
      return -1; }
    function primario(){
      if(s[p]==="["){ const f=achaFecha(s,p); const v=evalExpr(s.slice(p+1,f)); p=f+1; return v; }
      if(s[p]==="#"){
        p++;
        if(s[p]==="["){ const f=achaFecha(s,p); const idx=evalExpr(s.slice(p+1,f)); p=f+1; return vars[Math.round(idx)]||0; }
        let n=""; while(/\d/.test(s[p])) n+=s[p++];
        return vars[+n]||0;
      }
      for(const fn in FN){
        if(s.startsWith(fn,p) && s[p+fn.length]==="["){
          p+=fn.length; const f=achaFecha(s,p);
          const v=FN[fn](evalExpr(s.slice(p+1,f))); p=f+1; return v;
        }
      }
      let n=""; while(/[\d.]/.test(s[p])) n+=s[p++];
      return parseFloat(n)||0;
    }
    function unario(){ if(s[p]==="-"){p++; return -unario();} if(s[p]==="+"){p++; return unario();} return primario(); }
    function termo(){ let v=unario();
      for(;;){ if(s[p]==="*"){p++; v*=unario();}
        else if(s[p]==="/"){p++; const d=unario(); v = d===0?0:v/d;}
        else if(s.startsWith("MOD",p)){p+=3; v%=unario();}
        else break; }
      return v; }
    function soma(){ let v=termo();
      for(;;){ if(s[p]==="+"){p++; v+=termo();} else if(s[p]==="-"){p++; v-=termo();} else break; }
      return v; }
    return soma();
  }
  function evalCond(cond){
    const m=cond.match(/(EQ|NE|GT|GE|LT|LE)/);
    if(!m) return evalExpr(cond)!==0;
    const a=evalExpr(cond.slice(0,m.index)), b=evalExpr(cond.slice(m.index+2));
    switch(m[1]){case"EQ":return a===b;case"NE":return a!==b;case"GT":return a>b;
      case"GE":return a>=b;case"LT":return a<b;case"LE":return a<=b;}
  }
  function achaFechaTop(str,i0){ let n=0;
    for(let i=i0;i<str.length;i++){ if(str[i]==="[")n++; if(str[i]==="]"){n--; if(n===0)return i;} }
    return -1; }

  /* ---- estado da máquina ---- */
  let pos={x:0,y:0,z:0};
  let motion=0, abs=true, mirrorX=null;
  let ciclo=null, g98=true, zInicial=0;
  let parado=false, execs=0;
  const MAXE=400000, MAXS=160000;

  function alvo(w){
    const t={...pos};
    ["x","y","z"].forEach(k=>{
      const K=k.toUpperCase();
      if(w[K]!==undefined) t[k]= abs ? w[K] : pos[k]+w[K];
    });
    return t;
  }
  function mx(x){ return mirrorX===null ? x : 2*mirrorX - x; }
  function seg(a,b,rapid){
    if(segs.length>=MAXS) return;
    segs.push({ax:mx(a.x),ay:a.y,az:a.z, bx:mx(b.x),by:b.y,bz:b.z, rapid});
  }
  function arco(w,cw){
    const fim=alvo(w);
    let cx,cy;
    if(w.R!==undefined && (w.X!==undefined||w.Y!==undefined)){
      const dx=fim.x-pos.x, dy=fim.y-pos.y, q=Math.hypot(dx,dy);
      const r=Math.abs(w.R);
      if(q===0||q>2*r+1e-6){ seg(pos,fim,false); pos=fim; return; }
      const h=Math.sqrt(Math.max(0,r*r-q*q/4));
      const sgn=(cw?1:-1)*(w.R<0?-1:1);
      cx=pos.x+dx/2 - sgn*h*dy/q;
      cy=pos.y+dy/2 + sgn*h*dx/q;
    } else {
      cx=pos.x+(w.I||0); cy=pos.y+(w.J||0);
    }
    const r=Math.hypot(pos.x-cx,pos.y-cy);
    let a0=Math.atan2(pos.y-cy,pos.x-cx);
    let a1=Math.atan2(fim.y-cy,fim.x-cx);
    let da=a1-a0;
    if(cw){ if(da>=-1e-9) da-=2*Math.PI; } else { if(da<=1e-9) da+=2*Math.PI; }
    if(Math.abs(fim.x-pos.x)<1e-9 && Math.abs(fim.y-pos.y)<1e-9) da = cw?-2*Math.PI:2*Math.PI;
    const passos=Math.max(4, Math.ceil(Math.abs(da)/(Math.PI/36)));
    let ant={...pos};
    for(let i=1;i<=passos;i++){
      const a=a0+da*i/passos;
      const pt={x:cx+r*Math.cos(a), y:cy+r*Math.sin(a), z:pos.z+(fim.z-pos.z)*i/passos};
      seg(ant,pt,false); ant=pt;
    }
    pos=fim;
  }

  /* ---- execução ---- */
  let pc=0;
  while(pc<stmts.length && !parado){
    if(++execs>MAXE){ avisos.push("Simulação interrompida: limite de execução atingido (laço infinito?)."); break; }
    const l=stmts[pc]; pc++;
    if(!l) continue;

    let m;
    if((m=l.match(/^#(\d+)=(.+)$/))){ vars[+m[1]]=evalExpr(m[2]); continue; }
    if(l.startsWith("IF[")){
      const f=achaFechaTop(l,2);
      if(f<0){ avisos.push("IF malformado: "+l); continue; }
      const cond=l.slice(3,f), resto=l.slice(f+1);
      if(!evalCond(cond)) continue;
      if((m=resto.match(/^GOTO(\d+)/))){ const d=labels[+m[1]]; if(d===undefined){avisos.push("GOTO"+m[1]+" sem rótulo N"+m[1]);} else pc=d; continue; }
      if((m=resto.match(/^THEN#(\d+)=(.+)$/))){ vars[+m[1]]=evalExpr(m[2]); continue; }
      avisos.push("IF não suportado: "+l); continue;
    }
    if((m=l.match(/^GOTO(\d+)/))){ const d=labels[+m[1]]; if(d===undefined){avisos.push("GOTO"+m[1]+" sem rótulo N"+m[1]); } else pc=d; continue; }
    if(l.startsWith("WHILE")){ avisos.push("WHILE/DO não suportado — trecho ignorado."); continue; }

    /* linha de palavras (G/M/X/Y/Z...) */
    const w={}; const gs=[]; const ms=[];
    let i=0, ok=true;
    while(i<l.length){
      const letra=l[i];
      if(!/[A-Z]/.test(letra)){ ok=false; break; }
      i++;
      let neg=false;
      if(l[i]==="-"){ neg=true; i++; }
      let val;
      if(l[i]==="["){ const f=achaFechaTop(l,i); if(f<0){ok=false;break;} val=evalExpr(l.slice(i+1,f)); i=f+1; }
      else if(l[i]==="#"){ let j=i+1, n=""; while(/\d/.test(l[j])) n+=l[j++]; val=vars[+n]||0; i=j; }
      else { let j=i, n=""; while(/[\d.]/.test(l[j])) n+=l[j++]; if(!n){ok=false;break;} val=parseFloat(n); i=j; }
      if(neg) val=-val;
      if(letra==="G") gs.push(val);
      else if(letra==="M") ms.push(val);
      else w[letra]=val;
    }
    if(!ok){ avisos.push("Linha ignorada: "+l); continue; }

    let g53=false, defineCiclo=null;
    gs.forEach(g=>{
      if(g===0||g===1||g===2||g===3) motion=g;
      else if(g===90) abs=true;
      else if(g===91) abs=false;
      else if(g===98) g98=true;
      else if(g===99) g98=false;
      else if(g===80) ciclo=null;
      else if(g===81||g===82||g===83||g===73||g===85||g===86) defineCiclo=g;
      else if(g===53) g53=true;
      else if(g===51.1){ mirrorX = w.X!==undefined ? w.X : 0; }
      else if(g===50.1){ mirrorX=null; }
      /* G40/41/42, G43/44/49, G54-59, G17-19, G94/95: sem efeito no caminho */
    });
    if(ms.includes(30)||ms.includes(2)){ parado=true; }
    if(g53) continue;                       // coordenadas de máquina: fora do preview

    if(defineCiclo!==null){
      ciclo={z:w.Z!==undefined?w.Z:pos.z, r:w.R!==undefined?w.R:pos.z};
      zInicial=pos.z;
    }
    if(ciclo){
      if(w.X!==undefined||w.Y!==undefined||defineCiclo!==null){
        const xy=alvo({X:w.X,Y:w.Y});
        const topo={x:xy.x,y:xy.y,z:pos.z};
        seg(pos,topo,true);
        const nR={x:xy.x,y:xy.y,z:ciclo.r};
        const nZ={x:xy.x,y:xy.y,z:ciclo.z};
        seg(topo,nR,true); seg(nR,nZ,false);
        const volta={x:xy.x,y:xy.y,z: g98?zInicial:ciclo.r};
        seg(nZ,volta,true);
        pos=volta;
      }
      continue;
    }

    if(w.X!==undefined||w.Y!==undefined||w.Z!==undefined){
      if(motion===2||motion===3){ arco(w, motion===2); }
      else { const t=alvo(w); seg(pos,t,motion===0); pos=t; }
    }
  }
  if(segs.length>=MAXS) avisos.push("Caminho truncado (programa muito longo para o preview).");
  return {segs, avisos};
}

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

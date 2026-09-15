"use strict";
/* OPERACOES.JS — operações nativas (DEFS/ORDEM): faceamento e furação em linha/círculo.
   Depende de: fnum/fx (formato.js), THREE (carregado pelo HTML host). */

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

  /* ---------------- FURAÇÃO EM LINHA ---------------- */
  furosL:{
    nome:"Furos em linha", sub:"ciclo G83 / G81", cor:"var(--violet)", hex:0xb388ff,
    /* geo:true = campo geométrico; some do formulário quando o bloco tem `geo`
       (âncora no CAD 2D, ver programa.js/paramsEfetivos) — posição e diâmetro
       passam a vir das entidades referenciadas, não destes campos digitados. */
    params:[
      {k:"x0",l:"X do 1º furo",d:-60,s:1,u:"mm",geo:true},{k:"y0",l:"Y do 1º furo",d:-50,s:1,u:"mm",geo:true},
      {k:"ix",l:"Incremento X",d:30,s:1,u:"mm",geo:true},{k:"iy",l:"Incremento Y",d:0,s:1,u:"mm",geo:true},
      {k:"n",l:"Qtd de furos",d:5,s:1,geo:true},
      {k:"dia",l:"Ø da broca",d:8,s:0.5,u:"mm",geo:true},
      {k:"prof",l:"Profundidade",d:20,s:0.5,u:"mm"},
      {k:"q",l:"Peck Q (0 = G81)",d:5,s:0.5,u:"mm"},
      {k:"f",l:"Avanço F",d:120,s:10,u:"mm/min"},
    ],
    warn(p,c,d){ const w=[];
      if(p.furos){ if(p.furos.length<1) w.push("Selecione ao menos um furo no CAD 2D."); }
      else if(p.n<1) w.push("Quantidade de furos deve ser 1 ou mais.");
      if(p.prof>c.bz) w.push("Furo mais profundo que a altura do bloco (furo passante).");
      return w; },
    gerar(p,c,nb,d){
      const ciclo = p.q>0 ? `G83` : `G81`;
      const qtxt  = p.q>0 ? `Q${fx(p.q)}` : ``;
      const L=[];
      /* p.furos: injetado por paramsEfetivos() (programa.js) quando o bloco tem
         `geo` — posições literais das entidades, sem laço de macro (o passo
         entre furos pode não ser uniforme, ao contrário do padrão x0/ix). */
      if(p.furos){
        p.furos.forEach((furo,i)=>{
          if(i===0) L.push(`G98${ciclo}X${fx(furo.x)}Y${fx(furo.y)}Z-${fx(p.prof)}R2.${qtxt}F${fnum(p.f)}`);
          else L.push(`X${fx(furo.x)}Y${fx(furo.y)}`);
        });
        L.push(`G80`);
        return L;
      }
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
      if(p.furos){
        p.furos.forEach(furo=>{
          const m=new THREE.Mesh(new THREE.CylinderGeometry(furo.dia/2,furo.dia/2,p.prof,24));
          m.position.set(furo.x, -p.prof/2, -furo.y);
          grp.add(m);
        });
        return grp;
      }
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

const ORDEM = ["face","furosL","furosC"];

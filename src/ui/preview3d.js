"use strict";
/* preview3d.js — preview 3D (Three.js) do Montador: cena, câmera, bloco de material,
   volumes de remoção por operação e caminho de ferramenta dos .NC importados.
   Mapeamento CNC → cena: three(x, z, -y) · Z0 = topo do bloco.
   Depende de globais definidos no <script> principal de montador_macro_cnc_2.html,
   carregados antes deste arquivo: $, clamp, cfg() (core), DEFS, SEQ, UID, SELECIONADO,
   IMPORTS/CORES_IMP (core), execNC() (core), toast(), renderLegenda() (refresh geral, no
   HTML). THREE é opcional (TEM3D cai pra false sem ele; a geração de código continua). */

/* ============================================================
   PREVIEW 3D (Three.js)
   Mapeamento CNC → cena: three(x, z, -y)  ·  Z0 = topo do bloco
   ============================================================ */
let scene, camera, renderer, stockMesh, stockEdges, gridH, volGroup;
let cam = {theta: Math.PI/4, phi: Math.PI/3.2, r: 420, tgt: null};
let TEM3D = (typeof THREE !== "undefined");

function init3D(){
  const wrap=$("canvasWrap");
  if(!TEM3D){
    const d=document.createElement("div");
    d.className="visoff";
    d.textContent="Preview 3D indisponível (sem conexão para carregar o Three.js). O gerador de código continua funcionando normalmente.";
    wrap.appendChild(d);
    return;
  }
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x091926);
  scene.fog=new THREE.Fog(0x091926, 900, 2200);

  camera=new THREE.PerspectiveCamera(45, 1, 1, 5000);
  cam.tgt=new THREE.Vector3(0,-15,0);

  renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  wrap.insertBefore(renderer.domElement, wrap.firstChild);

  scene.add(new THREE.AmbientLight(0xffffff,0.65));
  const dl=new THREE.DirectionalLight(0xffffff,0.75);
  dl.position.set(200,400,250); scene.add(dl);
  const dl2=new THREE.DirectionalLight(0x8899bb,0.3);
  dl2.position.set(-250,150,-200); scene.add(dl2);

  volGroup=new THREE.Group(); scene.add(volGroup);

  /* eixos */
  const c=cfg();
  addEixos(c);

  /* controles: girar / zoom / pinça */
  const cv=renderer.domElement;
  const ptrs=new Map();
  let lastDist=0;
  cv.addEventListener("pointerdown",e=>{ cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY}); });
  cv.addEventListener("pointerup",  e=>{ ptrs.delete(e.pointerId); lastDist=0; });
  cv.addEventListener("pointercancel",e=>{ ptrs.delete(e.pointerId); lastDist=0; });
  cv.addEventListener("pointermove",e=>{
    if(!ptrs.has(e.pointerId)) return;
    const p=ptrs.get(e.pointerId);
    if(ptrs.size===1){
      cam.theta -= (e.clientX-p.x)*0.008;
      cam.phi    = clamp(cam.phi-(e.clientY-p.y)*0.008, 0.05, Math.PI/2-0.02);
      posCam();
    } else if(ptrs.size===2){
      p.x=e.clientX; p.y=e.clientY;
      const arr=[...ptrs.values()];
      const d=Math.hypot(arr[0].x-arr[1].x, arr[0].y-arr[1].y);
      if(lastDist>0){ cam.r=clamp(cam.r*(lastDist/d), 60, 2000); posCam(); }
      lastDist=d;
    }
    p.x=e.clientX; p.y=e.clientY;
  });
  cv.addEventListener("wheel",e=>{
    e.preventDefault();
    cam.r=clamp(cam.r*(e.deltaY>0?1.1:0.9), 60, 2000);
    posCam();
  },{passive:false});

  document.querySelectorAll(".vb").forEach(b=>{
    b.addEventListener("click",()=>{
      document.querySelectorAll(".vb").forEach(x=>x.classList.toggle("on",x===b));
      const v=b.dataset.v;
      if(v==="iso"){cam.theta=Math.PI/4; cam.phi=Math.PI/3.2;}
      if(v==="topo"){cam.theta=Math.PI/2; cam.phi=0.06;}
      if(v==="frente"){cam.theta=Math.PI/2; cam.phi=Math.PI/2-0.03;}
      posCam();
    });
  });

  const ro=new ResizeObserver(()=>{ redim(); });
  ro.observe(wrap);
  redim();
  posCam();
}

let eixosGrp=null;
function addEixos(c){
  if(eixosGrp) scene.remove(eixosGrp);
  eixosGrp=new THREE.Group();
  const L=Math.max(c.bx,c.by)*0.72;
  function linha(a,b,cor){
    const g=new THREE.BufferGeometry().setFromPoints([a,b]);
    eixosGrp.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:cor})));
  }
  const o=new THREE.Vector3(-c.bx/2-14, -c.bz, c.by/2+14);
  linha(o, o.clone().add(new THREE.Vector3(L*0.5,0,0)), 0xf0625a);           // X+
  linha(o, o.clone().add(new THREE.Vector3(0,0,-L*0.5)), 0x3ecf8e);          // Y+
  linha(o, o.clone().add(new THREE.Vector3(0,L*0.45,0)), 0x6ea8fe);          // Z+
  function rot(txt,cor,pos){
    const cv=document.createElement("canvas"); cv.width=cv.height=64;
    const g=cv.getContext("2d");
    g.font="700 40px JetBrains Mono, monospace"; g.fillStyle=cor;
    g.textAlign="center"; g.textBaseline="middle"; g.fillText(txt,32,34);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true}));
    sp.scale.set(18,18,1); sp.position.copy(pos); eixosGrp.add(sp);
  }
  rot("X","#f0625a", o.clone().add(new THREE.Vector3(L*0.5+12,0,0)));
  rot("Y","#3ecf8e", o.clone().add(new THREE.Vector3(0,0,-L*0.5-12)));
  rot("Z","#6ea8fe", o.clone().add(new THREE.Vector3(0,L*0.45+12,0)));
  scene.add(eixosGrp);
}

function redim(){
  if(!TEM3D) return;
  const wrap=$("canvasWrap");
  const w=wrap.clientWidth, h=wrap.clientHeight;
  if(!w || !h) return;
  renderer.setSize(w,h,false);
  camera.aspect=w/h; camera.updateProjectionMatrix();
  draw();
}

function posCam(){
  const sp=Math.sin(cam.phi), cp=Math.cos(cam.phi);
  camera.position.set(
    cam.tgt.x + cam.r*sp*Math.cos(cam.theta),
    cam.tgt.y + cam.r*cp,
    cam.tgt.z + cam.r*sp*Math.sin(cam.theta)
  );
  camera.lookAt(cam.tgt);
  draw();
}

function draw(){ if(TEM3D && renderer) renderer.render(scene,camera); }

/* --- reconstrução do bloco de material + volumes --- */
let ultimoBloco="";
function refresh3D(){
  if(!TEM3D) return;
  const c=cfg();

  const chave=[c.bx,c.by,c.bz].join("x");
  if(chave!==ultimoBloco){
    ultimoBloco=chave;
    if(stockMesh){scene.remove(stockMesh); scene.remove(stockEdges); scene.remove(gridH);}
    const g=new THREE.BoxGeometry(c.bx,c.bz,c.by);
    stockMesh=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:0x6b7684,transparent:true,opacity:0.13,depthWrite:false}));
    stockMesh.position.set(0,-c.bz/2,0);
    scene.add(stockMesh);
    stockEdges=new THREE.LineSegments(new THREE.EdgesGeometry(g),new THREE.LineBasicMaterial({color:0x55606c}));
    stockEdges.position.copy(stockMesh.position);
    scene.add(stockEdges);
    gridH=new THREE.GridHelper(Math.max(c.bx,c.by)*1.6, 16, 0x2b323c, 0x1c2127);
    gridH.position.y=-c.bz-0.5;
    scene.add(gridH);
    addEixos(c);
    cam.r=Math.max(c.bx,c.by,c.bz)*2.1;
    cam.tgt=new THREE.Vector3(0,-c.bz*0.35,0);
    posCam();
  }

  /* volumes de remoção */
  volGroup.children.slice().forEach(m=>{
    volGroup.remove(m);
    m.traverse?.(o=>{o.geometry?.dispose(); o.material?.dispose?.();});
  });
  SEQ.forEach(b=>{
    const D=DEFS[b.tipo];
    const dLocal = b.p.td;
    let obj;
    try{ obj=D.volume(b.p,c,dLocal); }catch(e){ return; }
    if(!obj) return;
    const mat=new THREE.MeshLambertMaterial({color:D.hex,transparent:true,opacity:0.8});
    obj.traverse(o=>{ if(o.isMesh) o.material=mat; });
    if(obj.isMesh) obj.material=mat;
    obj.userData.uid=b.uid;
    obj.position.y+=0.02;
    volGroup.add(obj);
  });
  refresh3DSelecao();
}

function refresh3DSelecao(){
  if(!TEM3D) return;
  volGroup.children.forEach(o=>{
    const sel = SELECIONADO===o.userData.uid;
    const nada = SELECIONADO===null;
    const mat = o.isMesh ? o.material : (o.children[0]&&o.children[0].material);
    if(!mat) return;
    mat.opacity = nada ? 0.8 : (sel ? 0.95 : 0.22);
    mat.emissive = new THREE.Color(sel ? 0x332200 : 0x000000);
  });
  renderLegendaEstado();
  draw();
}
function renderLegendaEstado(){
  document.querySelectorAll("#legenda .lg").forEach((el,i)=>{
    el.classList.toggle("on", SEQ[i] && SEQ[i].uid===SELECIONADO);
  });
}

/* ---- grupo 3D das importações ---- */
let impGroup=null;
function refreshImports(){
  if(!TEM3D) return;
  if(!impGroup){ impGroup=new THREE.Group(); scene.add(impGroup); }
  impGroup.children.slice().forEach(o=>{ impGroup.remove(o); o.geometry?.dispose(); o.material?.dispose(); });
  IMPORTS.forEach(imp=>{
    if(!imp.visivel || !imp.segs.length) return;
    const feed=[], rapid=[];
    imp.segs.forEach(s=>{
      const arr = s.rapid ? rapid : feed;
      arr.push(s.ax, s.az, -s.ay, s.bx, s.bz, -s.by);   // CNC → cena: (x, z, -y)
    });
    function linhas(arr,cor,op){
      if(!arr.length) return;
      const g=new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(arr,3));
      impGroup.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:cor,transparent:true,opacity:op})));
    }
    linhas(rapid, 0x5a6572, 0.35);
    linhas(feed,  imp.hex,  0.95);
  });
  draw();
}

function bboxImports(){
  let r=0;
  IMPORTS.forEach(imp=>{ if(!imp.visivel) return;
    imp.segs.forEach(s=>{ r=Math.max(r,Math.abs(s.ax),Math.abs(s.ay),Math.abs(s.az),Math.abs(s.bx),Math.abs(s.by),Math.abs(s.bz)); });
  });
  return r;
}

$("importNC").addEventListener("click",()=>$("fileNC").click());
$("fileNC").addEventListener("change",e=>{
  const files=[...e.target.files]; if(!files.length) return;
  files.forEach(f=>{
    const r=new FileReader();
    r.onload=()=>{
      const res=execNC(r.result);
      if(!res.segs.length){ toast(`${f.name}: nenhum movimento encontrado`); return; }
      IMPORTS.push({uid:UID++, nome:f.name.replace(/\.[^.]+$/,""), segs:res.segs,
        visivel:true, hex:CORES_IMP[IMPORTS.length%CORES_IMP.length], avisos:res.avisos});
      const R=bboxImports();
      if(TEM3D && R>0){ cam.r=Math.max(cam.r, R*2.4); posCam(); }
      refreshImports(); renderLegenda();
      toast(`${f.name}: ${res.segs.length} movimentos no preview`);
      res.avisos.slice(0,3).forEach(a=>console.warn("[importNC]",a));
    };
    r.readAsText(f);
  });
  e.target.value="";
});

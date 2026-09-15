"use strict";
/* CAD 2D local: entidades independentes do percurso CNC.
   Depende de $ (getElementById) e fnum (src/core/formato.js), definidos pelo HTML host.
   CAD2D.init() deve ser chamado no boot, depois que $ existir e o DOM da
   aba de desenho estiver presente.
   Acoplamento com o domínio de operações (Etapa 3, INSTRUCAO-CAD-CAM.md): o botão
   "Criar furação" chama addBloco() (paleta.js) e showStage() (script principal do
   HTML); cadCommit() chama refreshDebounced() (script principal) a cada mudança de
   geometria, pois blocos com `geo` leem a entidade ao vivo — todos carregados depois
   deste arquivo, mas já definidos quando o clique/commit acontece (o boot só chama
   CAD2D.init() por último).
   Etapa 4 (INSTRUCAO-CAD-CAM.md): entrada por valor (cadEntry/cadEntryPoint/cadPlacePoint)
   funciona igual para todas as ferramentas de desenho — só existe a partir do 2º ponto
   de cada forma, o 1º sempre vem de clique. Cota é uma entidade (type:'dim', sem valor
   próprio: lê ao vivo de `ref` via cadSize/cadWriteSize).
   Etapa 6 (INSTRUCAO-CAD-CAM.md): a cota nasce junto com a entidade — cadNewDim() monta
   a cota com posição padrão, chamada por cadAdd/cadAddRect (freehand) e pelo preenchimento
   de retrocompatibilidade em cadCarregar (entidades antigas sem cota); não existe mais
   ferramenta "Cota" de criação. Excluir a cota (selecioná-la e Excluir/Delete) apaga só
   ela — cadDelete já tratava isso, pois só remove a entidade cujo id está selecionado (e,
   à parte, as cotas que referenciam uma entidade removida). O interruptor "Cotas" da barra
   (cadShowDim) esconde todas de uma vez sem apagar nenhuma.
   Etapa 5 (INSTRUCAO-CAD-CAM.md): cadShape/cadEndpoints/cadDimGroup/cadEscala são
   reaproveitadas por src/ui/desenho2d.js (carregado depois) para desenhar a
   geometria real do CAD na aba Parâmetros — mesma aparência, sem duplicar lógica.
   Etapa 5 (contorno em segmentos): `rect` deixou de ser um tipo de entidade
   armazenado — a ferramenta "Retângulo" (cadTool==='rect') monta 4 entidades
   `line` de uma vez (cadAddRect), marcadas com `rectGrupo` compartilhado, para
   dar para selecionar/cotar/apagar cada lado sozinho. `.json` salvo antes desta
   etapa ainda guarda `rect`; cadCarregar converte via cadExpandirRects antes de
   validar. */
const CAD_NAMES={line:'Reta',circle:'Círculo',arc:'Arco',dim:'Cota'};
const CAD_GROUP_ORDER=['line','arc','circle','dim'];
const CAD_GROUP_LABELS={line:'Retas',arc:'Arcos',circle:'Furos',dim:'Cotas'};
const CAD_FIELDS={line:[['x','X inicial'],['y','Y inicial'],['x2','X final'],['y2','Y final']],circle:[['x','Centro X'],['y','Centro Y'],['r','Raio']],arc:[['x','Centro X'],['y','Centro Y'],['r','Raio'],['a0','Ângulo inicial (°)'],['a1','Ângulo final (°)']],dim:[['x','X do texto'],['y','Y do texto']]};
/* Etapa 4b: uma cota governa um único campo (sem solver) — o mesmo mapeamento
   que o vínculo de medida (cadWriteSize/cadApplyLinks) já usa. */
const CAD_MEDIDA_LABELS={comprimento:'Comprimento',raio:'Raio'};
function cadMedida(type){return type==='line'?'comprimento':'raio';}
let CAD={version:1,next:1,entities:[]},cadSelected=new Set(),cadTool='select',cadPoints=[],cadHover=null,cadDrag=null,cadShowDim=true,cadEntry=null;
let cadView={x:-120,y:-90,w:240,h:180},cadUndo=[],cadRedo=[];
const cadClone=x=>JSON.parse(JSON.stringify(x));
const cadAngle=(c,p)=>(Math.atan2(p.y-c.y,p.x-c.x)*180/Math.PI+360)%360;
const cadRound=n=>Math.round(n*1e6)/1e6;
function cadSize(e){if(e.type==='line')return Math.hypot(e.x2-e.x,e.y2-e.y);return e.r;}
function cadValid(e){
 if(e.type==='dim')return Number.isFinite(e.x)&&Math.abs(e.x)<=100000&&Number.isFinite(e.y)&&Math.abs(e.y)<=100000&&Number.isSafeInteger(e.ref)&&typeof e.medida==='string';
 return CAD_FIELDS[e.type]&&CAD_FIELDS[e.type].every(([k])=>Number.isFinite(e[k])&&Math.abs(e[k])<=100000)&&cadSize(e)>0&&(e.type!=='arc'||Math.abs(((e.a1-e.a0)%360+360)%360)>1e-7);
}
/* Etapa 4c: escreve uma medida de volta na entidade (vínculo e cota usam a
   mesma regra — cada uma governa um único campo, sem solver). */
function cadWriteSize(e,size){
 if(e.type==='line'){const angle=Math.atan2(e.y2-e.y,e.x2-e.x);e.x2=cadRound(e.x+size*Math.cos(angle));e.y2=cadRound(e.y+size*Math.sin(angle));}
 else e.r=size;
}
function cadApplyLinks(entities){
 const done=new Set(),visiting=new Set();
 function visit(e){if(done.has(e.id))return;if(visiting.has(e.id))throw Error('O vínculo formaria um ciclo.');visiting.add(e.id);
  if(e.link!=null){const src=entities.find(x=>x.id===e.link);if(!src)throw Error('Entidade de referência não encontrada.');visit(src);cadWriteSize(e,cadSize(src));}
  if(e.type==='dim'&&!entities.find(x=>x.id===e.ref))throw Error('Entidade de referência da cota não encontrada.');
  if(!cadValid(e))throw Error('Use coordenadas válidas e medidas maiores que zero. Arco deve ter início e fim diferentes.');visiting.delete(e.id);done.add(e.id);
 }
 entities.forEach(visit);return entities;
}
function cadCommit(mutator){
 try{const next=cadClone(CAD);mutator(next);if(next.entities.length>500)throw Error('Limite desta etapa: 500 entidades.');cadApplyLinks(next.entities);cadUndo.push(cadClone(CAD));if(cadUndo.length>100)cadUndo.shift();cadRedo=[];CAD=next;cadRender();
  /* Etapa 3: operações ancoradas (`geo`) leem a posição direto da entidade — sem
     isto, mover/editar/excluir geometria deixaria o G-code desatualizado até
     algo alheio ao CAD disparar refresh(). */
  refreshDebounced();
  return true;}
 catch(err){$('cad-message').textContent=err.message;return false;}
}
function cadNew(type,points){
 const a=points[0],b=points[1];let e={type,x:a.x,y:a.y};
 if(type==='line')Object.assign(e,{x2:b.x,y2:b.y});
 if(type==='circle'||type==='arc')e.r=Math.hypot(b.x-a.x,b.y-a.y);
 if(type==='arc')Object.assign(e,{a0:cadAngle(a,b),a1:cadAngle(a,points[2])});
 return e;
}
/* Etapa 6: posição padrão da cota ao nascer com a entidade — reta ganha cota
   deslocada da metade do segmento, perpendicular a ele; círculo/arco ganham cota
   a 45° saindo do centro. Sempre um valor "sensato", nunca zero/sobreposto. */
function cadNewDim(e){
 const dim={type:'dim',ref:e.id,medida:cadMedida(e.type)};
 if(e.type==='line'){
  const dx=e.x2-e.x,dy=e.y2-e.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,off=Math.max(len*.18,4);
  dim.x=cadRound((e.x+e.x2)/2+nx*off);dim.y=cadRound((e.y+e.y2)/2+ny*off);
 } else {
  const ang=Math.PI/4,off=Math.max(e.r*.35,4);
  dim.x=cadRound(e.x+(e.r+off)*Math.cos(ang));dim.y=cadRound(e.y+(e.r+off)*Math.sin(ang));
 }
 return dim;
}
function cadAdd(e){return cadCommit(next=>{const id=next.next++;const full={...e,id};next.entities.push(full);const dimId=next.next++;next.entities.push({...cadNewDim(full),id:dimId});cadSelected=new Set([id]);});}
/* Etapa 5: "Retângulo" é atalho de construção — os dois pontos viram 4 `line`
   independentes (para poder selecionar/cotar/apagar cada lado), compartilhando
   `rectGrupo` só como marca de origem (agrupamento futuro, ex. Aparar). */
function cadRectCorners(a,b){
 const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),h=Math.abs(b.y-a.y);
 return [{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
}
function cadRectLines(a,b,grupo){
 const c=cadRectCorners(a,b);
 return c.map((p,i)=>({type:'line',x:p.x,y:p.y,x2:c[(i+1)%4].x,y2:c[(i+1)%4].y,rectGrupo:grupo}));
}
function cadAddRect(points){
 const [a,b]=points;
 return cadCommit(next=>{
  const grupo=next.next,ids=[];
  cadRectLines(a,b,grupo).forEach(linha=>{
   const id=next.next++;const full={...linha,id};next.entities.push(full);ids.push(id);
   const dimId=next.next++;next.entities.push({...cadNewDim(full),id:dimId});
  });
  cadSelected=new Set(ids);
 });
}
/* Etapa 4a: entrada por valor — mesma fórmula para toda ferramenta de desenho:
   ponto = ponto_anterior + direção_do_cursor × valor_digitado. O ponto anterior
   é o último ponto já clicado (cadPoints); por isso só existe entrada por valor
   a partir do 2º ponto de cada forma — o 1º ponto sempre vem de clique. */
function cadEntryPoint(){
 if(!cadEntry)return null;
 const anchor=cadPoints[cadPoints.length-1];
 if(!anchor||!cadHover)return null;
 const angulo=cadEntry.angle!==''?Number(cadEntry.angle):cadAngle(anchor,cadHover);
 const comprimento=cadEntry.length!==''?Number(cadEntry.length):Math.hypot(cadHover.x-anchor.x,cadHover.y-anchor.y);
 if(!Number.isFinite(angulo)||!Number.isFinite(comprimento))return null;
 const rad=angulo*Math.PI/180;
 return {x:cadRound(anchor.x+comprimento*Math.cos(rad)),y:cadRound(anchor.y+comprimento*Math.sin(rad))};
}
function cadPlacePoint(p){
 cadPoints.push(p);
 const need=cadTool==='arc'?3:2;
 if(cadPoints.length===need){if(cadTool==='rect')cadAddRect(cadPoints);else cadAdd(cadNew(cadTool,cadPoints));cadPoints=[];cadHover=null;}
 cadEntry=null;
 cadRenderCanvas();
}
function cadEndpoints(e){
 if(e.type==='dim')return [{x:e.x,y:e.y}];
 if(e.type==='line')return [{x:e.x,y:e.y},{x:e.x2,y:e.y2}];
 const angles=e.type==='arc'?[e.a0,e.a1]:[0,90,180,270];
 return [{x:e.x,y:e.y},...angles.map(a=>({x:e.x+e.r*Math.cos(a*Math.PI/180),y:e.y+e.r*Math.sin(a*Math.PI/180)}))];
}
function cadSnap(point,exclude){
 let p={...point},best=8*cadView.w/Math.max(1,$('cad-svg').clientWidth||640),hit=null;
 if($('cad-snap').checked)CAD.entities.filter(e=>e.id!==exclude).flatMap(cadEndpoints).forEach(v=>{const distance=Math.hypot(v.x-point.x,v.y-point.y);if(distance<best){best=distance;hit=v;}});
 const grid=Number($('cad-grid-step').value);
 if(hit)return {x:cadRound(hit.x),y:cadRound(hit.y)};
 if($('cad-grid-snap').checked&&Number.isFinite(grid)&&grid>=.001&&grid<=1000)p={x:Math.round(p.x/grid)*grid,y:Math.round(p.y/grid)*grid};
 return {x:cadRound(p.x),y:cadRound(p.y)};
}
/* Etapa 5c (INSTRUCAO-CAD-CAM.md): escala real de tela (px por unidade de mundo),
   via getScreenCTM — não só largura/viewBox.w, que erra quando a proporção do
   viewBox não bate com a do elemento (o "meet" do preserveAspectRatio passa a
   limitar pela altura). Usada para texto e traços de cota em tamanho de tela
   constante, com vector-effect="non-scaling-stroke" nas linhas. */
function cadEscala(svg){
 const ctm=svg.getScreenCTM&&svg.getScreenCTM();
 if(ctm&&ctm.a)return ctm.a;
 const vb=svg.viewBox.baseVal;
 return Math.max(400,svg.clientWidth||640)/((vb&&vb.width)||1);
}
/* Etapa 5b: cota como desenho técnico — linhas de chamada perpendiculares à
   medida (reta/retângulo) ou saindo do centro (raio), linha de cota com setas
   e texto centrado, em vez do <text> solto de antes. O ponto clicado pelo
   usuário (e.x,e.y) continua sendo o único controle de posição/deslocamento.
   Reaproveitada pela vista real da aba Parâmetros (desenho2d.js). */
function cadDimGroup(e,font,sel){
 const ref=CAD.entities.find(x=>x.id===e.ref);
 const hit=`<circle class="cad-dim-hit" data-cad-id="${e.id}" cx="${e.x}" cy="${-e.y}" r="${font*.8}"/>`;
 const textCls='cad-dim-entity'+(sel?' selected':'');
 if(!ref)return hit+`<text class="${textCls}" data-cad-id="${e.id}" x="${e.x}" y="${-e.y}" text-anchor="middle" style="font-size:${font}px">?</text>`;
 const cls='cad-dim-line'+(sel?' selected':''),overshoot=font*.6,arrow=font*.9,wing=arrow*.4;
 const tx=p=>({x:p.x,y:-p.y});
 const arrowPath=(p,ux,uy)=>{
  const back={x:p.x-ux*arrow,y:p.y-uy*arrow},nx=-uy,ny=ux;
  const w1=tx({x:back.x+nx*wing,y:back.y+ny*wing}),w2=tx({x:back.x-nx*wing,y:back.y-ny*wing}),P=tx(p);
  return `<path class="${cls}" d="M${w1.x},${w1.y} L${P.x},${P.y} L${w2.x},${w2.y}"/>`;
 };
 let linhas,textX,textY,prefixo='';
 if(e.medida==='raio'){
  const c0={x:ref.x,y:ref.y},vx=e.x-c0.x,vy=e.y-c0.y,dist=Math.hypot(vx,vy)||1,ux=vx/dist,uy=vy/dist;
  const P={x:c0.x+ux*ref.r,y:c0.y+uy*ref.r},ponta=dist>ref.r?{x:e.x,y:e.y}:P;
  const C0=tx(c0),Pt=tx(ponta);
  linhas=`<path class="${cls}" d="M${C0.x},${C0.y} L${Pt.x},${Pt.y}"/>`+arrowPath(P,ux,uy);
  prefixo='R';textX=e.x;textY=e.y;
 } else {
  const p1={x:ref.x,y:ref.y},p2=ref.type==='line'?{x:ref.x2,y:ref.y2}:{x:ref.x+ref.w,y:ref.y};
  const dx=p2.x-p1.x,dy=p2.y-p1.y,len=Math.hypot(dx,dy)||1,dirx=dx/len,diry=dy/len,nx=-diry,ny=dirx;
  const offset=(e.x-p1.x)*nx+(e.y-p1.y)*ny,sign=offset>=0?1:-1;
  const d1={x:p1.x+nx*offset,y:p1.y+ny*offset},d2={x:p2.x+nx*offset,y:p2.y+ny*offset};
  const ext1={x:p1.x+nx*(offset+sign*overshoot),y:p1.y+ny*(offset+sign*overshoot)};
  const ext2={x:p2.x+nx*(offset+sign*overshoot),y:p2.y+ny*(offset+sign*overshoot)};
  const P1=tx(p1),P2=tx(p2),D1=tx(d1),D2=tx(d2),E1=tx(ext1),E2=tx(ext2);
  linhas=`<path class="${cls}" d="M${P1.x},${P1.y} L${E1.x},${E1.y} M${P2.x},${P2.y} L${E2.x},${E2.y} M${D1.x},${D1.y} L${D2.x},${D2.y}"/>`
   +arrowPath(d1,-dirx,-diry)+arrowPath(d2,dirx,diry);
  textX=(d1.x+d2.x)/2;textY=(d1.y+d2.y)/2;
 }
 const T=tx({x:textX,y:textY}),val=fnum(cadSize(ref));
 return hit+linhas+`<text class="${textCls}" data-cad-id="${e.id}" x="${T.x}" y="${T.y}" text-anchor="middle" style="font-size:${font}px">${prefixo}${val}</text>`;
}
function cadShape(e,cls,hit=false){
 const attrs=`class="${cls}" ${hit?`data-cad-id="${e.id}"`:''}`;
 if(e.type==='line')return `<line ${attrs} x1="${e.x}" y1="${-e.y}" x2="${e.x2}" y2="${-e.y2}"/>`;
 if(e.type==='circle')return `<circle ${attrs} cx="${e.x}" cy="${-e.y}" r="${e.r}"/>`;
 const a=e.a0*Math.PI/180,b=e.a1*Math.PI/180,delta=((e.a1-e.a0)%360+360)%360;
 return `<path ${attrs} d="M${e.x+e.r*Math.cos(a)},${-e.y-e.r*Math.sin(a)} A${e.r},${e.r} 0 ${delta>180?1:0} 0 ${e.x+e.r*Math.cos(b)},${-e.y-e.r*Math.sin(b)}"/>`;
}
function cadRenderCanvas(){
 const svg=$('cad-svg');svg.setAttribute('viewBox',`${cadView.x} ${cadView.y} ${cadView.w} ${cadView.h}`);
 const step=Number($('cad-grid-step').value),grid=Number.isFinite(step)&&step>=.001&&step<=1000?Math.max(step,cadView.w/200):5;
 const font=12/cadEscala(svg);
 let body=`<defs><pattern id="cad-grid-pattern" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse"><path d="M${grid} 0H0V${grid}" fill="none" stroke="#1c3a4d" stroke-width=".5" vector-effect="non-scaling-stroke"/></pattern></defs><rect x="${cadView.x}" y="${cadView.y}" width="${cadView.w}" height="${cadView.h}" fill="url(#cad-grid-pattern)"/><path d="M${cadView.x} 0H${cadView.x+cadView.w} M0 ${cadView.y}V${cadView.y+cadView.h}" stroke="#255e74" fill="none" vector-effect="non-scaling-stroke" stroke-width="1"/>`;
 CAD.entities.forEach(source=>{
  const e=cadDrag?.kind==='move'&&source.id===cadDrag.id?cadDrag.preview:source;
  if(e.type==='dim'){if(cadShowDim)body+=cadDimGroup(e,font,cadSelected.has(e.id));return;}
  body+=cadShape(e,'cad-hit',true)+cadShape(e,'cad-shape'+(cadSelected.has(e.id)?' selected':''),true);
  if(cadShowDim&&e.link!=null)body+=`<text class="cad-dimension" x="${e.x}" y="${-e.y-font}" font-size="${font}">↔ #${e.link}</text>`;
 });
 const hp=cadEntry?(cadEntryPoint()||cadHover):cadHover;
 if(cadPoints.length&&hp){try{
  if(cadTool==='rect'){const lados=cadRectLines(cadPoints[0],hp,0);if(lados.every(l=>cadSize(l)>0))body+=lados.map(l=>cadShape(l,'cad-preview')).join('');}
  else{let e;if(cadTool==='arc'&&cadPoints.length===1)e=cadNew('circle',[cadPoints[0],hp]);else e=cadNew(cadTool,[...cadPoints,hp]);if(cadValid(e))body+=cadShape(e,'cad-preview');}
 }catch(_){}}
 if(cadHover)body+=`<circle cx="${cadHover.x}" cy="${-cadHover.y}" r="${font*.25}" fill="#42d9ef" pointer-events="none"/>`;
 if(cadEntry&&cadHover&&cadPoints.length){
  const anchor=cadPoints[cadPoints.length-1];
  const angDefault=cadAngle(anchor,cadHover),lenDefault=Math.hypot(cadHover.x-anchor.x,cadHover.y-anchor.y);
  const lenTxt=cadEntry.length!==''?cadEntry.length:fnum(lenDefault),angTxt=cadEntry.angle!==''?cadEntry.angle:fnum(angDefault);
  const ox=cadHover.x+font*.6,oy=-cadHover.y-font*.6;
  body+=`<g class="cad-entry-box" transform="translate(${ox},${oy})"><rect x="0" y="${-font*1.3}" width="${font*7}" height="${font*2.6}" rx="${font*.3}"/><text class="${cadEntry.field==='length'?'active':''}" x="${font*.3}" y="${-font*.55}" font-size="${font}">L ${lenTxt}</text><text class="${cadEntry.field==='angle'?'active':''}" x="${font*.3}" y="${font*.85}" font-size="${font}">∠ ${angTxt}°</text></g>`;
 }
 svg.innerHTML=body;
 const names={select:'Selecione uma entidade para editar suas coordenadas.',move:'Arraste uma entidade (ou sua cota) para mover.',pan:'Arraste para deslocar a vista.',line:cadPoints.length?'Clique o ponto final ou digite a medida.':'Clique o ponto inicial.',rect:cadPoints.length?'Clique o canto oposto ou digite a medida.':'Clique o primeiro canto.',circle:cadPoints.length?'Clique para definir o raio ou digite a medida.':'Clique o centro.',arc:cadPoints.length===2?'Clique a direção final do arco anti-horário ou digite o ângulo.':cadPoints.length?'Clique o início do arco ou digite a medida.':'Clique o centro do arco.'};
 $('cad-help').textContent=names[cadTool]+(cadHover?`  X ${fnum(cadHover.x)} · Y ${fnum(cadHover.y)} mm`:'')+(cadEntry?'  ·  Tab: comprimento/ângulo · Enter confirma · Esc cancela o valor':'');
}
function cadRenderProperties(){
 const el=$('cad-properties');el.replaceChildren();
 const ids=[...cadSelected];
 if(ids.length===0){el.textContent='Selecione uma entidade ou escolha uma ferramenta para criar.';return;}
 if(ids.length>1){cadRenderPropertiesMulti(ids,el);return;}
 const e=CAD.entities.find(x=>x.id===ids[0]);
 if(!e){el.textContent='Selecione uma entidade ou escolha uma ferramenta para criar.';return;}
 if(e.type==='dim'){cadRenderPropertiesDim(e,el);return;}
 const title=document.createElement('p');title.textContent=CAD_NAMES[e.type]+' #'+e.id;el.append(title);
 CAD_FIELDS[e.type].forEach(([key,label])=>{const row=document.createElement('div');row.className='draft-field';const lab=document.createElement('label');lab.htmlFor='cad-prop-'+key;lab.textContent=label;const input=document.createElement('input');input.type='number';input.step='any';input.id=lab.htmlFor;input.dataset.cadKey=key;input.value=e[key];row.append(lab,input);el.append(row);});
 const label=document.createElement('label');label.htmlFor='cad-link';label.textContent='Vincular medida principal a';el.append(label);
 const select=document.createElement('select');select.id='cad-link';const none=document.createElement('option');none.value='';none.textContent='Sem vínculo';select.append(none);
 CAD.entities.filter(x=>x.id!==e.id&&x.type!=='dim').forEach(x=>{const opt=document.createElement('option');opt.value=x.id;opt.textContent=CAD_NAMES[x.type]+' #'+x.id+' · '+fnum(cadSize(x))+' mm';select.append(opt);});select.value=e.link??'';el.append(select);
 const hint=document.createElement('p');hint.className='hint';hint.textContent='Vínculo de igualdade: comprimento da reta ou raio do círculo/arco. A direção e as demais medidas são preservadas.';el.append(hint);
 const apply=document.createElement('button');apply.className='btn primary';apply.textContent='Aplicar propriedades';apply.addEventListener('click',()=>{
  const updated={...e};for(const inp of el.querySelectorAll('[data-cad-key]')){if(inp.value===''){ $('cad-message').textContent='Preencha todas as coordenadas.';return;}updated[inp.dataset.cadKey]=Number(inp.value);}
  if(select.value==='')delete updated.link;else updated.link=Number(select.value);
  cadCommit(next=>{next.entities[next.entities.findIndex(x=>x.id===e.id)]=updated;});
 });el.append(apply);
}
/* Etapa 4c: editar o valor da cota escreve de volta no campo da entidade
   medida (cadWriteSize) — a cota nunca guarda o valor, só ref/medida/posição. */
function cadRenderPropertiesDim(e,el){
 const ref=CAD.entities.find(x=>x.id===e.ref);
 const title=document.createElement('p');title.textContent='Cota #'+e.id;el.append(title);
 if(!ref){const hint=document.createElement('p');hint.className='hint';hint.textContent='A entidade medida não existe mais.';el.append(hint);return;}
 const info=document.createElement('p');info.className='hint';info.textContent=CAD_NAMES[ref.type]+' #'+ref.id+' · '+CAD_MEDIDA_LABELS[e.medida];el.append(info);
 const row=document.createElement('div');row.className='draft-field';const lab=document.createElement('label');lab.htmlFor='cad-dim-valor';lab.textContent='Valor';const input=document.createElement('input');input.type='number';input.step='any';input.id='cad-dim-valor';input.value=cadSize(ref);row.append(lab,input);el.append(row);
 const apply=document.createElement('button');apply.className='btn primary';apply.textContent='Aplicar cota';apply.addEventListener('click',()=>{
  const v=Number(input.value);
  if(!Number.isFinite(v)||v<=0){$('cad-message').textContent='Informe uma medida maior que zero.';return;}
  cadCommit(next=>{cadWriteSize(next.entities.find(x=>x.id===ref.id),v);});
 });el.append(apply);
}
function cadRenderPropertiesMulti(ids,el){
 const entities=CAD.entities.filter(e=>ids.includes(e.id));
 const sameType=entities.every(e=>e.type===entities[0].type);
 const title=document.createElement('p');title.textContent=entities.length+' selecionados'+(sameType?' · '+CAD_NAMES[entities[0].type]:'');el.append(title);
 if(!sameType){const hint=document.createElement('p');hint.className='hint';hint.textContent='Selecione entidades do mesmo tipo para editar campos em comum.';el.append(hint);return;}
 CAD_FIELDS[entities[0].type].forEach(([key,label])=>{const row=document.createElement('div');row.className='draft-field';const lab=document.createElement('label');lab.textContent=label;const input=document.createElement('input');input.type='number';input.step='any';input.placeholder='Vários valores';input.dataset.cadKey=key;row.append(lab,input);el.append(row);});
 const hint=document.createElement('p');hint.className='hint';hint.textContent='Preencha só os campos que quer alterar em todos os selecionados; os demais mantêm o valor de cada entidade.';el.append(hint);
 const apply=document.createElement('button');apply.className='btn primary';apply.textContent='Aplicar a todos';apply.addEventListener('click',()=>{
  const changes={};for(const inp of el.querySelectorAll('[data-cad-key]'))if(inp.value!=='')changes[inp.dataset.cadKey]=Number(inp.value);
  if(!Object.keys(changes).length){$('cad-message').textContent='Preencha ao menos um campo para aplicar.';return;}
  cadCommit(next=>{next.entities.forEach(e=>{if(ids.includes(e.id))Object.assign(e,changes);});});
 });el.append(apply);
}
function cadRenderGroups(){
 const list=$('cad-groups');list.replaceChildren();
 if(!CAD.entities.length){list.textContent='Desenho vazio.';return;}
 CAD_GROUP_ORDER.forEach(type=>{
  const ids=CAD.entities.filter(e=>e.type===type).map(e=>e.id);
  if(!ids.length)return;
  const b=document.createElement('button');b.textContent=`${CAD_GROUP_LABELS[type]} (${ids.length})`;
  b.setAttribute('aria-pressed',String(ids.every(id=>cadSelected.has(id))));
  b.addEventListener('click',event=>{
   if(event.shiftKey){cadSelected=new Set(cadSelected);ids.forEach(id=>cadSelected.add(id));}
   else cadSelected=new Set(ids);
   cadRender();
  });
  list.append(b);
 });
}
function cadRender(){
 cadSelected=new Set([...cadSelected].filter(id=>CAD.entities.some(e=>e.id===id)));
 $('cad-message').textContent='';document.querySelectorAll('[data-cad-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cadTool===cadTool)));
 cadRenderGroups();
 $('cad-undo').disabled=!cadUndo.length;$('cad-redo').disabled=!cadRedo.length;$('cad-delete').disabled=cadSelected.size===0;cadRenderProperties();cadRenderCanvas();
 cadRenderFuracaoBotao();
}
/* Etapa 3 (INSTRUCAO-CAD-CAM.md): "Criar furação" só habilita quando a seleção é
   inteira de círculos (um ou mais) — o resto é feito por addBloco('furosL',{geo}). */
function cadFuracaoSelecionados(){
 const ids=[...cadSelected];
 if(!ids.length) return null;
 const entidades=ids.map(id=>CAD.entities.find(e=>e.id===id));
 return entidades.every(e=>e&&e.type==='circle') ? ids : null;
}
function cadRenderFuracaoBotao(){
 const btn=$('cad-criar-furacao'); if(!btn) return;
 const ids=cadFuracaoSelecionados();
 btn.disabled=!ids;
 btn.textContent=ids?`+ Criar furação (${ids.length})`:'+ Criar furação';
 btn.title=ids?'':'Selecione um ou mais círculos para criar a operação de furação.';
}
function cadDelete(){if(!cadSelected.size)return;const ids=new Set(cadSelected);cadCommit(next=>{next.entities=next.entities.filter(e=>!ids.has(e.id)&&!(e.type==='dim'&&ids.has(e.ref)));next.entities.forEach(e=>{if(e.link!=null&&ids.has(e.link))delete e.link;});});}
function cadSubstituirOrigem(origem,novas){
 return cadCommit(next=>{
  next.entities=next.entities.filter(e=>e.desenho2D?.origem!==origem);
  novas.forEach(e=>next.entities.push({...e,id:next.next++}));
 });
}
function cadHistory(redo){const from=redo?cadRedo:cadUndo,to=redo?cadUndo:cadRedo;if(!from.length)return;to.push(cadClone(CAD));CAD=from.pop();cadPoints=[];cadHover=null;cadEntry=null;cadRender();}
function cadFit(){const pts=CAD.entities.flatMap(e=>e.type==='circle'||e.type==='arc'?[{x:e.x-e.r,y:e.y-e.r},{x:e.x+e.r,y:e.y+e.r}]:cadEndpoints(e));if(!pts.length)cadView={x:-120,y:-90,w:240,h:180};else{const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),pad=Math.max(maxX-minX,maxY-minY,10)*.2;cadView={x:minX-pad,y:-maxY-pad,w:Math.max(maxX-minX,1)+2*pad,h:Math.max(maxY-minY,1)+2*pad};}cadRenderCanvas();}
function cadPoint(event){const svg=$('cad-svg'),point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const local=point.matrixTransform(svg.getScreenCTM().inverse());return {x:local.x,y:-local.y};}
function cadInit(){
 const drawingChildren=[...$('drawing').children];
 $('drawing').replaceChildren();
 const modes=document.createElement('div');modes.className='drawing-modes';modes.innerHTML='<button id="cad-mode" aria-pressed="true">Desenho livre</button><button id="matrix-mode" aria-pressed="false">Padrão de furos vinculado</button>';
 const matrix=document.createElement('div');matrix.id='matrix-mode-content';matrix.className='drawing-mode draft-grid';matrix.hidden=true;matrix.append(...drawingChildren);
 const free=document.createElement('div');free.id='cad-mode-content';free.className='drawing-mode cad-grid';
 free.innerHTML=`<aside class="cad-side"><h2>Geometria</h2><div id="cad-groups" class="cad-list"></div><button id="cad-criar-furacao" class="btn primary" disabled>+ Criar furação</button><h2>Ferramentas</h2><div class="cad-tools"><button data-cad-tool="select">Selecionar</button><button data-cad-tool="move">Mover</button><button id="cad-copy" disabled title="Em construção">Copiar</button><button id="cad-trim" disabled title="Em construção">Aparar</button><button class="cad-action" id="cad-delete">Excluir</button></div><h2>Desenhar</h2><div class="cad-tools">${[['line','Reta'],['rect','Retângulo'],['circle','Círculo'],['arc','Arco'],['pan','Deslocar vista']].map(([key,label])=>`<button data-cad-tool="${key}">${label}</button>`).join('')}</div><div class="cad-actions"><button class="cad-action" id="cad-undo" title="Desfazer">↶</button><button class="cad-action" id="cad-redo" title="Refazer">↷</button></div><p class="hint">Clique os pontos na área de desenho ou digite a medida (comprimento/ângulo, Tab alterna, Enter confirma). Esc cancela. Shift+clique soma à seleção. Arcos: centro, início e direção final, em sentido anti-horário.</p></aside><div class="cad-center"><div class="cad-toolbar"><label><input id="cad-snap" type="checkbox" checked>Pontos</label><label><input id="cad-grid-snap" type="checkbox" checked>Grade</label><label>Passo <input type="number" id="cad-grid-step" value="5" min="0.001" max="1000" step="1" aria-label="Passo da grade">mm</label><label><input id="cad-showdim" type="checkbox" checked>Cotas</label><button id="cad-fit" class="cad-action">Ajustar vista</button></div><svg id="cad-svg" tabindex="0" role="img" aria-label="Área de desenho livre; use as ferramentas e clique para desenhar"></svg><div id="cad-help" class="cad-foot"></div></div><aside class="cad-side cad-props"><h2>Propriedades / Controles</h2><div id="cad-properties"></div><div id="cad-message" class="cad-error" role="status"></div></aside>`;
 $('drawing').append(modes,free,matrix);
 function cadMode(isFree){free.hidden=!isFree;matrix.hidden=isFree;$('cad-mode').setAttribute('aria-pressed',String(isFree));$('matrix-mode').setAttribute('aria-pressed',String(!isFree));cadPoints=[];cadHover=null;cadEntry=null;cadRenderCanvas();}
 $('cad-mode').addEventListener('click',()=>cadMode(true));$('matrix-mode').addEventListener('click',()=>cadMode(false));
 document.querySelectorAll('[data-cad-tool]').forEach(b=>b.addEventListener('click',()=>{
  cadTool=b.dataset.cadTool;cadPoints=[];cadHover=null;cadEntry=null;cadRender();
 }));
 $('cad-delete').addEventListener('click',cadDelete);
 $('cad-criar-furacao').addEventListener('click',()=>{
  const ids=cadFuracaoSelecionados(); if(!ids) return;
  addBloco('furosL',{geo:ids});
  showStage('planning');
 });
 $('cad-undo').addEventListener('click',()=>cadHistory(false));$('cad-redo').addEventListener('click',()=>cadHistory(true));
 $('cad-fit').addEventListener('click',cadFit);
 $('cad-showdim').addEventListener('change',()=>{cadShowDim=$('cad-showdim').checked;cadRenderCanvas();});
 ['cad-grid-step','cad-snap','cad-grid-snap'].forEach(id=>$(id).addEventListener('change',cadRenderCanvas));
 const cadSvg=$('cad-svg');
 cadSvg.addEventListener('pointerdown',event=>{
  if(event.button!==0&&event.button!==1)return;event.preventDefault();cadSvg.focus();
  const raw=cadPoint(event),p=cadSnap(raw),id=Number(event.target.dataset.cadId),entity=CAD.entities.find(e=>e.id===id);
  if(cadTool==='pan'||event.button===1){cadDrag={kind:'pan',clientX:event.clientX,clientY:event.clientY,view:{...cadView},scale:1/cadSvg.getScreenCTM().a};cadSvg.setPointerCapture(event.pointerId);return;}
  if(cadTool==='select'){
   if(!entity)cadSelected=new Set();
   else if(event.shiftKey){cadSelected=new Set(cadSelected);cadSelected.add(id);}
   else cadSelected=new Set([id]);
   cadRender();return;
  }
  if(cadTool==='move'){
   cadSelected=entity?new Set([id]):new Set();
   if(entity){cadDrag={kind:'move',id,start:raw,original:cadClone(entity),preview:cadClone(entity)};cadSvg.setPointerCapture(event.pointerId);}
   cadRender();return;
  }
  cadPlacePoint(p);
 });
 cadSvg.addEventListener('pointermove',event=>{
  if(cadDrag?.kind==='pan'){cadView={...cadDrag.view,x:cadDrag.view.x-(event.clientX-cadDrag.clientX)*cadDrag.scale,y:cadDrag.view.y-(event.clientY-cadDrag.clientY)*cadDrag.scale};cadRenderCanvas();return;}
  const raw=cadPoint(event);cadHover=cadSnap(raw,cadDrag?.id);
  if(cadDrag?.kind==='move'){const o=cadDrag.original,newOrigin=cadSnap({x:o.x+raw.x-cadDrag.start.x,y:o.y+raw.y-cadDrag.start.y},o.id),dx=newOrigin.x-o.x,dy=newOrigin.y-o.y;cadDrag.preview={...o,x:newOrigin.x,y:newOrigin.y};if(o.type==='line'){cadDrag.preview.x2=cadRound(o.x2+dx);cadDrag.preview.y2=cadRound(o.y2+dy);}}
  cadRenderCanvas();
 });
 cadSvg.addEventListener('pointerup',event=>{const drag=cadDrag;cadDrag=null;if(drag?.kind==='move'&&JSON.stringify(drag.preview)!==JSON.stringify(drag.original))cadCommit(next=>{next.entities[next.entities.findIndex(e=>e.id===drag.id)]=drag.preview;});if(cadSvg.hasPointerCapture(event.pointerId))cadSvg.releasePointerCapture(event.pointerId);});
 cadSvg.addEventListener('pointercancel',()=>{cadDrag=null;cadRenderCanvas();});
 cadSvg.addEventListener('wheel',event=>{event.preventDefault();const p=cadPoint(event),factor=event.deltaY>0?1.15:1/1.15;if(cadView.w*factor<.1||cadView.w*factor>1000000)return;cadView={x:p.x+(cadView.x-p.x)*factor,y:-p.y+(cadView.y+p.y)*factor,w:cadView.w*factor,h:cadView.h*factor};cadRenderCanvas();},{passive:false});
 free.addEventListener('keydown',event=>{
  if(event.target.matches('input,select,textarea'))return;
  if(cadEntry){
   if(event.key==='Escape'){event.preventDefault();cadEntry=null;cadRenderCanvas();return;}
   if(event.key==='Tab'){event.preventDefault();cadEntry.field=cadEntry.field==='length'?'angle':'length';cadRenderCanvas();return;}
   if(event.key==='Enter'){event.preventDefault();const p=cadEntryPoint();cadEntry=null;if(p)cadPlacePoint(p);else cadRenderCanvas();return;}
   if(event.key==='Backspace'){event.preventDefault();cadEntry[cadEntry.field]=cadEntry[cadEntry.field].slice(0,-1);cadRenderCanvas();return;}
   if(/^[-0-9.]$/.test(event.key)){event.preventDefault();cadEntry[cadEntry.field]+=event.key;cadRenderCanvas();return;}
   return;
  }
  if(event.key==='Escape'){cadPoints=[];cadDrag=null;cadHover=null;cadRenderCanvas();return;}
  if(event.key==='Delete'){event.preventDefault();cadDelete();return;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();cadHistory(event.shiftKey);return;}
  /* Etapa 4a: só existe entrada por valor a partir do 2º ponto (cadPoints já
     tem um ponto anterior) — o 1º ponto de qualquer forma vem sempre de clique. */
  if(/^[-0-9.]$/.test(event.key)&&cadPoints.length&&cadHover){event.preventDefault();cadEntry={length:event.key,angle:'',field:'length'};cadRenderCanvas();}
 });
 cadRender();
}
function cadSalvar(){return cadClone(CAD);}
/* Etapa 5: retrocompatibilidade — `.json` salvo antes desta etapa guarda `rect`
   como entidade única. Converte cada uma em 4 `line` com ids novos (acima do
   maior id do arquivo) antes de validar, e reaponta qualquer `dim`/`link` que
   apontava para o rect (sempre medida 'largura', único campo que um rect podia
   ter cotado/vinculado) para a reta que corresponde ao lado `w`. */
function cadExpandirRects(rawEntities){
 const maxId=Math.max(0,...rawEntities.map(e=>Number.isSafeInteger(e?.id)?e.id:0));
 let nextId=maxId+1;
 const larguraId=new Map();
 const expandido=[];
 rawEntities.forEach(e=>{
  if(!e||e.type!=='rect'){expandido.push(e);return;}
  const grupo=nextId;
  const ids=cadRectCorners({x:e.x,y:e.y},{x:e.x+e.w,y:e.y+e.h}).map((p,i,corners)=>{
   const q=corners[(i+1)%4],id=nextId++;
   const linha={id,type:'line',x:p.x,y:p.y,x2:q.x,y2:q.y,rectGrupo:grupo};
   if(i===0){if(e.link!=null)linha.link=e.link;if(e.desenho2D)linha.desenho2D=e.desenho2D;}
   expandido.push(linha);
   return id;
  });
  larguraId.set(e.id,ids[0]);
 });
 expandido.forEach(e=>{
  if(e.type==='dim'&&larguraId.has(e.ref)){e.ref=larguraId.get(e.ref);e.medida='comprimento';}
  if(e.link!=null&&larguraId.has(e.link))e.link=larguraId.get(e.link);
 });
 return expandido;
}
function cadCarregar(data){
 CAD={version:1,next:1,entities:[]};cadUndo=[];cadRedo=[];cadSelected=new Set();cadPoints=[];cadDrag=null;cadHover=null;
 if(data){
  if(data.version!==1||!Array.isArray(data.entities))throw Error('Formato de desenho livre inválido.');
  const raw=cadExpandirRects(data.entities);
  if(raw.length>500)throw Error('Formato de desenho livre inválido.');
  const ids=new Set();
  const entities=raw.map(e=>{if(!Number.isSafeInteger(e.id)||e.id<1||ids.has(e.id)||!cadValid(e))throw Error('Entidade de desenho inválida.');ids.add(e.id);const clean={id:e.id,type:e.type};CAD_FIELDS[e.type].forEach(([k])=>clean[k]=e[k]);if(e.link!=null&&e.type!=='dim')clean.link=e.link;if(e.desenho2D)clean.desenho2D=e.desenho2D;if(e.type==='line'&&e.rectGrupo!=null)clean.rectGrupo=e.rectGrupo;if(e.type==='dim'){clean.ref=e.ref;clean.medida=e.medida;}return clean;});
  cadApplyLinks(entities);
  /* Etapa 6: retrocompatibilidade — projeto salvo antes desta etapa pode ter
     reta/círculo/arco desenhado à mão sem cota (a cota era opcional, criada por
     ferramenta). Completa as que faltam com a mesma posição padrão do desenho
     novo, para o invariante "toda entidade nasce cotada" valer também ao abrir.
     Não mexe em furo de matriz (`desenho2D`) — esses nunca tiveram cota própria. */
  let nextId=Math.max(0,...ids)+1;
  const comCota=new Set(entities.filter(e=>e.type==='dim').map(e=>e.ref));
  entities.filter(e=>e.type!=='dim'&&!e.desenho2D&&!comCota.has(e.id)).forEach(e=>entities.push({...cadNewDim(e),id:nextId++}));
  CAD={version:1,next:nextId,entities};
 }
}
const CAD2D = { init: cadInit, render: cadRender, fit: cadFit, salvar: cadSalvar, carregar: cadCarregar, entidades: () => CAD.entities, substituirOrigem: cadSubstituirOrigem };

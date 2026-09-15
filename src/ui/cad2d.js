"use strict";
/* CAD 2D local: entidades independentes do percurso CNC.
   Depende de $ (getElementById) e fnum (src/core/formato.js), definidos pelo HTML host.
   CAD2D.init() deve ser chamado no boot, depois que $ existir e o DOM da
   aba de desenho estiver presente. */
const CAD_NAMES={line:'Reta',rect:'Retângulo',circle:'Círculo',arc:'Arco'};
const CAD_FIELDS={line:[['x','X inicial'],['y','Y inicial'],['x2','X final'],['y2','Y final']],rect:[['x','X inferior esquerdo'],['y','Y inferior esquerdo'],['w','Comprimento'],['h','Altura']],circle:[['x','Centro X'],['y','Centro Y'],['r','Raio']],arc:[['x','Centro X'],['y','Centro Y'],['r','Raio'],['a0','Ângulo inicial (°)'],['a1','Ângulo final (°)']]};
let CAD={version:1,next:1,entities:[]},cadSelected=null,cadTool='select',cadPoints=[],cadHover=null,cadDrag=null;
let cadView={x:-120,y:-90,w:240,h:180},cadUndo=[],cadRedo=[];
const cadClone=x=>JSON.parse(JSON.stringify(x));
const cadAngle=(c,p)=>(Math.atan2(p.y-c.y,p.x-c.x)*180/Math.PI+360)%360;
const cadRound=n=>Math.round(n*1e6)/1e6;
function cadSize(e){if(e.type==='line')return Math.hypot(e.x2-e.x,e.y2-e.y);return e.type==='rect'?e.w:e.r;}
function cadValid(e){return CAD_FIELDS[e.type]&&CAD_FIELDS[e.type].every(([k])=>Number.isFinite(e[k])&&Math.abs(e[k])<=100000)&&cadSize(e)>0&&(e.type!=='rect'||e.h>0)&&(e.type!=='arc'||Math.abs(((e.a1-e.a0)%360+360)%360)>1e-7);}
function cadApplyLinks(entities){
 const done=new Set(),visiting=new Set();
 function visit(e){if(done.has(e.id))return;if(visiting.has(e.id))throw Error('O vínculo formaria um ciclo.');visiting.add(e.id);
  if(e.link!=null){const src=entities.find(x=>x.id===e.link);if(!src)throw Error('Entidade de referência não encontrada.');visit(src);const size=cadSize(src);if(e.type==='line'){const angle=Math.atan2(e.y2-e.y,e.x2-e.x);e.x2=cadRound(e.x+size*Math.cos(angle));e.y2=cadRound(e.y+size*Math.sin(angle));}else if(e.type==='rect')e.w=size;else e.r=size;}
  if(!cadValid(e))throw Error('Use coordenadas válidas e medidas maiores que zero. Arco deve ter início e fim diferentes.');visiting.delete(e.id);done.add(e.id);
 }
 entities.forEach(visit);return entities;
}
function cadCommit(mutator){
 try{const next=cadClone(CAD);mutator(next);if(next.entities.length>500)throw Error('Limite desta etapa: 500 entidades.');cadApplyLinks(next.entities);cadUndo.push(cadClone(CAD));if(cadUndo.length>100)cadUndo.shift();cadRedo=[];CAD=next;cadRender();return true;}
 catch(err){$('cad-message').textContent=err.message;return false;}
}
function cadNew(type,points){
 const a=points[0],b=points[1];let e={type,x:a.x,y:a.y};
 if(type==='line')Object.assign(e,{x2:b.x,y2:b.y});
 if(type==='rect')Object.assign(e,{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)});
 if(type==='circle'||type==='arc')e.r=Math.hypot(b.x-a.x,b.y-a.y);
 if(type==='arc')Object.assign(e,{a0:cadAngle(a,b),a1:cadAngle(a,points[2])});
 return e;
}
function cadAdd(e){return cadCommit(next=>{const id=next.next++;next.entities.push({...e,id});cadSelected=id;});}
function cadEndpoints(e){
 if(e.type==='line')return [{x:e.x,y:e.y},{x:e.x2,y:e.y2}];
 if(e.type==='rect')return [{x:e.x,y:e.y},{x:e.x+e.w,y:e.y},{x:e.x+e.w,y:e.y+e.h},{x:e.x,y:e.y+e.h}];
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
function cadShape(e,cls,hit=false){
 const attrs=`class="${cls}" ${hit?`data-cad-id="${e.id}"`:''}`;
 if(e.type==='line')return `<line ${attrs} x1="${e.x}" y1="${-e.y}" x2="${e.x2}" y2="${-e.y2}"/>`;
 if(e.type==='rect')return `<rect ${attrs} x="${e.x}" y="${-e.y-e.h}" width="${e.w}" height="${e.h}"/>`;
 if(e.type==='circle')return `<circle ${attrs} cx="${e.x}" cy="${-e.y}" r="${e.r}"/>`;
 const a=e.a0*Math.PI/180,b=e.a1*Math.PI/180,delta=((e.a1-e.a0)%360+360)%360;
 return `<path ${attrs} d="M${e.x+e.r*Math.cos(a)},${-e.y-e.r*Math.sin(a)} A${e.r},${e.r} 0 ${delta>180?1:0} 0 ${e.x+e.r*Math.cos(b)},${-e.y-e.r*Math.sin(b)}"/>`;
}
function cadRenderCanvas(){
 const svg=$('cad-svg');svg.setAttribute('viewBox',`${cadView.x} ${cadView.y} ${cadView.w} ${cadView.h}`);
 const step=Number($('cad-grid-step').value),grid=Number.isFinite(step)&&step>=.001&&step<=1000?Math.max(step,cadView.w/200):5;
 const font=cadView.w*12/Math.max(400,svg.clientWidth||640);
 let body=`<defs><pattern id="cad-grid-pattern" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse"><path d="M${grid} 0H0V${grid}" fill="none" stroke="#1c3a4d" stroke-width=".5" vector-effect="non-scaling-stroke"/></pattern></defs><rect x="${cadView.x}" y="${cadView.y}" width="${cadView.w}" height="${cadView.h}" fill="url(#cad-grid-pattern)"/><path d="M${cadView.x} 0H${cadView.x+cadView.w} M0 ${cadView.y}V${cadView.y+cadView.h}" stroke="#255e74" fill="none" vector-effect="non-scaling-stroke" stroke-width="1"/>`;
 CAD.entities.forEach(source=>{
  const e=cadDrag?.kind==='move'&&source.id===cadDrag.id?cadDrag.preview:source;
  body+=cadShape(e,'cad-hit',true)+cadShape(e,'cad-shape'+(e.id===cadSelected?' selected':''),true);
  if($('cad-dimensions').checked){const label=e.type==='line'?'L '+fnum(cadSize(e)):e.type==='rect'?fnum(e.w)+' × '+fnum(e.h):'R '+fnum(e.r);body+=`<text class="cad-dimension" x="${e.x}" y="${-e.y-font}" font-size="${font}">${label}${e.link!=null?' ↔ #'+e.link:''}</text>`;}
 });
 if(cadPoints.length&&cadHover){try{let e;if(cadTool==='arc'&&cadPoints.length===1)e=cadNew('circle',[cadPoints[0],cadHover]);else e=cadNew(cadTool,[...cadPoints,cadHover]);if(cadValid(e))body+=cadShape(e,'cad-preview');}catch(_){}}
 if(cadHover)body+=`<circle cx="${cadHover.x}" cy="${-cadHover.y}" r="${font*.25}" fill="#42d9ef" pointer-events="none"/>`;
 svg.innerHTML=body;
 const names={select:'Selecione uma entidade para editar suas coordenadas.',move:'Arraste uma entidade para mover.',pan:'Arraste para deslocar a vista.',line:cadPoints.length?'Clique o ponto final.':'Clique o ponto inicial.',rect:cadPoints.length?'Clique o canto oposto.':'Clique o primeiro canto.',circle:cadPoints.length?'Clique para definir o raio.':'Clique o centro.',arc:cadPoints.length===2?'Clique a direção final do arco anti-horário.':cadPoints.length?'Clique o início do arco.':'Clique o centro do arco.'};
 $('cad-help').textContent=names[cadTool]+(cadHover?`  X ${fnum(cadHover.x)} · Y ${fnum(cadHover.y)} mm`:'');
}
function cadRenderProperties(){
 const e=CAD.entities.find(x=>x.id===cadSelected);const el=$('cad-properties');el.replaceChildren();
 if(!e){el.textContent='Selecione uma entidade ou escolha uma ferramenta para criar.';return;}
 const title=document.createElement('p');title.textContent=CAD_NAMES[e.type]+' #'+e.id;el.append(title);
 CAD_FIELDS[e.type].forEach(([key,label])=>{const row=document.createElement('div');row.className='draft-field';const lab=document.createElement('label');lab.htmlFor='cad-prop-'+key;lab.textContent=label;const input=document.createElement('input');input.type='number';input.step='any';input.id=lab.htmlFor;input.dataset.cadKey=key;input.value=e[key];row.append(lab,input);el.append(row);});
 const label=document.createElement('label');label.htmlFor='cad-link';label.textContent='Vincular medida principal a';el.append(label);
 const select=document.createElement('select');select.id='cad-link';const none=document.createElement('option');none.value='';none.textContent='Sem vínculo';select.append(none);
 CAD.entities.filter(x=>x.id!==e.id).forEach(x=>{const opt=document.createElement('option');opt.value=x.id;opt.textContent=CAD_NAMES[x.type]+' #'+x.id+' · '+fnum(cadSize(x))+' mm';select.append(opt);});select.value=e.link??'';el.append(select);
 const hint=document.createElement('p');hint.className='hint';hint.textContent='Vínculo de igualdade: comprimento da reta, largura do retângulo ou raio do círculo/arco. A direção e as demais medidas são preservadas.';el.append(hint);
 const apply=document.createElement('button');apply.className='btn primary';apply.textContent='Aplicar propriedades';apply.addEventListener('click',()=>{
  const updated={...e};for(const inp of el.querySelectorAll('[data-cad-key]')){if(inp.value===''){ $('cad-message').textContent='Preencha todas as coordenadas.';return;}updated[inp.dataset.cadKey]=Number(inp.value);}
  if(select.value==='')delete updated.link;else updated.link=Number(select.value);
  cadCommit(next=>{next.entities[next.entities.findIndex(x=>x.id===e.id)]=updated;});
 });el.append(apply);
}
function cadRender(){
 if(!CAD.entities.some(e=>e.id===cadSelected))cadSelected=null;
 $('cad-message').textContent='';document.querySelectorAll('[data-cad-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cadTool===cadTool)));
 const list=$('cad-list');list.replaceChildren();if(!CAD.entities.length)list.textContent='Desenho vazio.';
 CAD.entities.forEach(e=>{const b=document.createElement('button');b.textContent=CAD_NAMES[e.type]+' #'+e.id;b.setAttribute('aria-pressed',String(e.id===cadSelected));b.addEventListener('click',()=>{cadSelected=e.id;cadRender();});list.append(b);});
 $('cad-undo').disabled=!cadUndo.length;$('cad-redo').disabled=!cadRedo.length;$('cad-delete').disabled=cadSelected===null;cadRenderProperties();cadRenderCanvas();
}
function cadDelete(){if(cadSelected===null)return;const id=cadSelected;cadCommit(next=>{next.entities=next.entities.filter(e=>e.id!==id);next.entities.forEach(e=>{if(e.link===id)delete e.link;});});}
function cadHistory(redo){const from=redo?cadRedo:cadUndo,to=redo?cadUndo:cadRedo;if(!from.length)return;to.push(cadClone(CAD));CAD=from.pop();cadPoints=[];cadHover=null;cadRender();}
function cadFit(){const pts=CAD.entities.flatMap(e=>e.type==='circle'||e.type==='arc'?[{x:e.x-e.r,y:e.y-e.r},{x:e.x+e.r,y:e.y+e.r}]:cadEndpoints(e));if(!pts.length)cadView={x:-120,y:-90,w:240,h:180};else{const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),pad=Math.max(maxX-minX,maxY-minY,10)*.2;cadView={x:minX-pad,y:-maxY-pad,w:Math.max(maxX-minX,1)+2*pad,h:Math.max(maxY-minY,1)+2*pad};}cadRenderCanvas();}
function cadPoint(event){const svg=$('cad-svg'),point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const local=point.matrixTransform(svg.getScreenCTM().inverse());return {x:local.x,y:-local.y};}
function cadInit(){
 const drawingChildren=[...$('drawing').children];
 $('drawing').replaceChildren();
 const modes=document.createElement('div');modes.className='drawing-modes';modes.innerHTML='<button id="cad-mode" aria-pressed="true">Desenho livre</button><button id="matrix-mode" aria-pressed="false">Padrão de furos vinculado</button>';
 const matrix=document.createElement('div');matrix.id='matrix-mode-content';matrix.className='drawing-mode draft-grid';matrix.hidden=true;matrix.append(...drawingChildren);
 const free=document.createElement('div');free.id='cad-mode-content';free.className='drawing-mode cad-grid';
 free.innerHTML=`<aside class="cad-side"><h2>Desenhar</h2><div class="cad-tools">${[['select','Selecionar'],['move','Mover'],['line','Reta'],['rect','Retângulo'],['circle','Círculo'],['arc','Arco'],['pan','Deslocar vista']].map(([key,label])=>`<button data-cad-tool="${key}">${label}</button>`).join('')}</div><div class="cad-actions"><button class="cad-action" id="cad-undo" title="Desfazer">↶</button><button class="cad-action" id="cad-redo" title="Refazer">↷</button><button class="cad-action" id="cad-delete">Excluir</button></div><p class="hint">Clique os pontos na área de desenho. Esc cancela. Arcos: centro, início e direção final, em sentido anti-horário.</p><h2>Entidades</h2><div id="cad-list" class="cad-list"></div></aside><div class="cad-center"><div class="cad-toolbar"><label><input id="cad-snap" type="checkbox" checked>Pontos</label><label><input id="cad-grid-snap" type="checkbox" checked>Grade</label><label>Passo <input type="number" id="cad-grid-step" value="5" min="0.001" max="1000" step="1" aria-label="Passo da grade">mm</label><label><input type="checkbox" id="cad-dimensions" checked>Cotas</label><button id="cad-fit" class="cad-action">Ajustar vista</button></div><svg id="cad-svg" tabindex="0" role="img" aria-label="Área de desenho livre; use as ferramentas e clique para desenhar"></svg><div id="cad-help" class="cad-foot"></div></div><aside class="cad-side cad-props"><h2>Propriedades / Coordenadas</h2><div id="cad-properties"></div><div id="cad-message" class="cad-error" role="status"></div><div class="notice">Geometria livre salva com o projeto. Ainda não gera percurso CNC. Para gerar furação, use Padrão de furos vinculado.</div></aside>`;
 $('drawing').append(modes,free,matrix);
 function cadMode(isFree){free.hidden=!isFree;matrix.hidden=isFree;$('cad-mode').setAttribute('aria-pressed',String(isFree));$('matrix-mode').setAttribute('aria-pressed',String(!isFree));cadPoints=[];cadHover=null;cadRenderCanvas();}
 $('cad-mode').addEventListener('click',()=>cadMode(true));$('matrix-mode').addEventListener('click',()=>cadMode(false));
 document.querySelectorAll('[data-cad-tool]').forEach(b=>b.addEventListener('click',()=>{cadTool=b.dataset.cadTool;cadPoints=[];cadHover=null;cadRender();}));
 $('cad-delete').addEventListener('click',cadDelete);
 $('cad-undo').addEventListener('click',()=>cadHistory(false));$('cad-redo').addEventListener('click',()=>cadHistory(true));
 $('cad-fit').addEventListener('click',cadFit);
 ['cad-grid-step','cad-dimensions','cad-snap','cad-grid-snap'].forEach(id=>$(id).addEventListener('change',cadRenderCanvas));
 const cadSvg=$('cad-svg');
 cadSvg.addEventListener('pointerdown',event=>{
  if(event.button!==0&&event.button!==1)return;event.preventDefault();cadSvg.focus();
  const raw=cadPoint(event),p=cadSnap(raw),id=Number(event.target.dataset.cadId),entity=CAD.entities.find(e=>e.id===id);
  if(cadTool==='pan'||event.button===1){cadDrag={kind:'pan',clientX:event.clientX,clientY:event.clientY,view:{...cadView},scale:1/cadSvg.getScreenCTM().a};cadSvg.setPointerCapture(event.pointerId);return;}
  if(cadTool==='select'||cadTool==='move'){cadSelected=entity?entity.id:null;if(entity&&cadTool==='move'){cadDrag={kind:'move',id,start:raw,original:cadClone(entity),preview:cadClone(entity)};cadSvg.setPointerCapture(event.pointerId);}cadRender();return;}
  cadPoints.push(p);const need=cadTool==='arc'?3:2;
  if(cadPoints.length===need){cadAdd(cadNew(cadTool,cadPoints));cadPoints=[];cadHover=null;}cadRenderCanvas();
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
 free.addEventListener('keydown',event=>{if(event.target.matches('input,select,textarea'))return;if(event.key==='Escape'){cadPoints=[];cadDrag=null;cadHover=null;cadRenderCanvas();}if(event.key==='Delete'){event.preventDefault();cadDelete();}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();cadHistory(event.shiftKey);}});
 cadRender();
}
function cadSalvar(){return cadClone(CAD);}
function cadCarregar(data){
 CAD={version:1,next:1,entities:[]};cadUndo=[];cadRedo=[];cadSelected=null;cadPoints=[];cadDrag=null;cadHover=null;
 if(data){
  if(data.version!==1||!Array.isArray(data.entities)||data.entities.length>500)throw Error('Formato de desenho livre inválido.');
  const ids=new Set();
  const entities=data.entities.map(e=>{if(!Number.isSafeInteger(e.id)||e.id<1||ids.has(e.id)||!cadValid(e))throw Error('Entidade de desenho inválida.');ids.add(e.id);const clean={id:e.id,type:e.type};CAD_FIELDS[e.type].forEach(([k])=>clean[k]=e[k]);if(e.link!=null)clean.link=e.link;return clean;});
  cadApplyLinks(entities);
  CAD={version:1,next:Math.max(0,...ids)+1,entities};
 }
}
const CAD2D = { init: cadInit, render: cadRender, fit: cadFit, salvar: cadSalvar, carregar: cadCarregar, entidades: () => CAD.entities };

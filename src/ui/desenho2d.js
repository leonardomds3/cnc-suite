/* desenho2d.js — vínculo entre o desenho guiado (retângulo + matriz de furos) e o CAD 2D
   local do Montador.
   Acoplamento explícito: este módulo ESCREVE entidades `circle` em CAD.entities via
   CAD2D.substituirOrigem() (aplicarDesenho) e depende de globais definidos no <script>
   principal de montador_macro_cnc_2.html, carregados antes deste arquivo: $, cfg(),
   toast(), fnum(); e do módulo CAD2D (cad2d.js), carregado depois deste arquivo mas já
   presente como global no momento em que aplicarDesenho() é chamado (boot só clica nos
   botões depois de CAD2D.init()).
   Superfície exposta: DESENHO2D = { render, aplicar, avisos, salvar, carregar, sincronizado }.
   A matriz de furos não cria operação (SEQ) — ela só gera geometria no CAD; virar
   operação de furação a partir da geometria é trabalho da etapa 3. */

/* Primeiro vínculo CAD -> geometria: retângulo e matriz de furos.
   Nenhuma decisão automática de condição de corte ou remoção do contorno. */
const DESENHO_ID='retangulo-furos-v1';
const DESENHO_CAMPOS=[
 ['largura','Comprimento X','mm',1],['altura','Largura Y','mm',1],
 ['mx','Distância da borda X','mm',.5],['my','Distância da borda Y','mm',.5],
 ['nx','Furos por fileira','',1],['ny','Número de fileiras','',1],['diametro','Diâmetro dos furos','mm',.5]
];
function desenhoInicial(){return {largura:cfg().bx,altura:cfg().by,mx:cfg().bx*.2,my:cfg().by*.2,nx:2,ny:2,diametro:8};}
let DESENHO={versao:1,p:desenhoInicial(),confirmado:null};
let desenhoSelecao='furos';
function salvarDesenho2D(){
 // ex-camada "CAD 2D": inclui as entidades livres junto do desenho guiado
 return {...JSON.parse(JSON.stringify(DESENHO)), livre:CAD2D.salvar()};
}
function carregarDesenho2D(raw){
 DESENHO={versao:1,p:desenhoInicial(),confirmado:null};
 if(raw&&raw.versao===1&&raw.p){
  for(const [k] of DESENHO_CAMPOS)if(Object.prototype.hasOwnProperty.call(raw.p,k))DESENHO.p[k]=raw.p[k];
  DESENHO.confirmado=typeof raw.confirmado==='string'?raw.confirmado:null;
 }
 atualizarCamposDesenho();renderDesenhos();
 // ex-camada "CAD 2D": restaura as entidades livres do arquivo carregado
 try{CAD2D.carregar(raw?.livre);}
 catch(err){toast('Desenho livre não carregado: '+err.message);}
 CAD2D.render();CAD2D.fit();
}
function validarDesenho(p){
 const erros=[];
 for(const [k,l] of DESENHO_CAMPOS)if(typeof p[k]!=='number'||!Number.isFinite(p[k]))erros.push(l+': informe um número válido.');
 if(erros.length)return erros;
 if(p.largura<=0||p.altura<=0||p.diametro<=0)erros.push('Comprimento, largura e diâmetro devem ser positivos.');
 if(p.mx<0||p.my<0)erros.push('As distâncias das bordas não podem ser negativas.');
 if(!Number.isInteger(p.nx)||!Number.isInteger(p.ny)||p.nx<1||p.ny<1||p.nx>20||p.ny>20)erros.push('Use de 1 a 20 furos por fileira e de 1 a 20 fileiras.');
 if(p.largura>10000||p.altura>10000)erros.push('Este editor suporta dimensões de até 10.000 mm.');
 if(p.nx>1&&2*p.mx>=p.largura)erros.push('As margens X precisam deixar espaço entre os furos.');
 if(p.ny>1&&2*p.my>=p.altura)erros.push('As margens Y precisam deixar espaço entre as fileiras.');
 return erros;
}
function fileirasDesenho(p){
 const x=p.nx===1?0:-p.largura/2+p.mx;
 const y=p.ny===1?0:-p.altura/2+p.my;
 const ix=p.nx===1?0:(p.largura-2*p.mx)/(p.nx-1);
 const iy=p.ny===1?0:(p.altura-2*p.my)/(p.ny-1);
 return Array.from({length:p.ny},(_,i)=>({x0:x,y0:y+i*iy,ix,iy:0,n:p.nx,dia:p.diametro}));
}
function avisosDesenho(){
 const p=DESENHO.p,invalidos=validarDesenho(p);if(invalidos.length)return invalidos;
 const out=[],r=p.diametro/2;
 if((p.nx===1?p.largura/2:p.mx)<r||(p.ny===1?p.altura/2:p.my)<r)out.push('Há furos que ultrapassam o contorno da peça.');
 if((p.nx>1&&(p.largura-2*p.mx)/(p.nx-1)<p.diametro)||(p.ny>1&&(p.altura-2*p.my)/(p.ny-1)<p.diametro))out.push('Os furos se sobrepõem. Confira o padrão.');
 if(p.largura>cfg().bx||p.altura>cfg().by)out.push('O retângulo é maior que o bloco de material configurado.');
 return out;
}
function assinaturaDesenho(){return JSON.stringify(DESENHO.p);}
function furosDesenho(p){
 // cadRound: global de cad2d.js (carregado antes deste arquivo), mesma precisão das entidades do CAD.
 const out=[];
 fileirasDesenho(p).forEach((row,j)=>{for(let i=0;i<row.n;i++)out.push({x:cadRound(row.x0+i*row.ix),y:cadRound(row.y0),dia:row.dia,fileira:j,furo:i});});
 return out;
}
function entidadesVinculadas(){return CAD2D.entidades().filter(e=>e.desenho2D?.origem===DESENHO_ID);}
function desenhoSincronizado(){
 if(validarDesenho(DESENHO.p).length||DESENHO.confirmado!==assinaturaDesenho())return false;
 const esperados=furosDesenho(DESENHO.p),vinculados=entidadesVinculadas();
 return vinculados.length===esperados.length&&esperados.every(f=>vinculados.some(e=>e.desenho2D.fileira===f.fileira&&e.desenho2D.furo===f.furo&&e.x===f.x&&e.y===f.y&&e.r===f.dia/2));
}
function aplicarDesenho(){
 const errors=validarDesenho(DESENHO.p);
 if(errors.length){toast('Corrija os campos do desenho para confirmar a geometria.');renderDesenhos();return;}
 const furos=furosDesenho(DESENHO.p).map(f=>({type:'circle',x:f.x,y:f.y,r:f.dia/2,desenho2D:{origem:DESENHO_ID,fileira:f.fileira,furo:f.furo}}));
 if(!CAD2D.substituirOrigem(DESENHO_ID,furos)){toast('Limite de entidades do CAD atingido — reduza o desenho livre ou a matriz.');return;}
 DESENHO.confirmado=assinaturaDesenho();
 renderDesenhos();toast('Desenho aplicado. Os furos entraram no CAD 2D — virar operação de furação é a próxima etapa.');
}
function camposDesenho(prefix,keys){return keys.map(k=>{
 const [,label,unit,step]=DESENHO_CAMPOS.find(f=>f[0]===k);
 return `<div class="draft-field"><label for="${prefix}-${k}">${label}</label><div class="inrow"><input id="${prefix}-${k}" data-drawing-key="${k}" type="number" step="${step}" inputmode="decimal"><span class="unit">${unit}</span></div></div>`;
}).join('');}
function centroDesenho(prefix){return `<div class="draft-center"><div class="draft-toolbar"><span>mm · X0 Y0 no centro · Z0 na face</span><button class="btn" data-fit-drawing>Ajustar vista</button></div><svg id="${prefix}-svg" class="draft-svg" role="img" aria-label="Retângulo cotado e padrão de furos"></svg><div class="draft-bottom" data-drawing-summary></div></div>`;}
$('drawing').className='stage draft-grid';
$('drawing').innerHTML=`<aside class="draft-panel"><h2>Geometria</h2><button class="draft-entity" data-drawing-select="contorno">▱ Retângulo · 4 retas</button><button class="draft-entity" data-drawing-select="furos">○ Padrão de furos</button><div class="draft-count" data-drawing-count></div><h3>Escopo atual</h3><p>Retângulo e matriz de furos com medidas vinculadas.</p><p>Contornos livres, arcos e importação DXF entram nas próximas etapas.</p></aside>${centroDesenho('draw')}<aside class="draft-panel"><h2>Propriedades / Controles</h2>${camposDesenho('draw',['largura','altura','mx','my','nx','ny','diametro'])}<button class="btn primary" data-apply-drawing>Confirmar geometria e vincular</button><button class="btn" data-go-cad2d>Ver no CAD 2D</button><div data-drawing-status class="draft-status"></div><p>O retângulo é referência. Os furos entram como geometria no CAD 2D; virar operação de furação é a próxima etapa.</p></aside>`;
$('parameters').className='stage draft-grid';
$('parameters').innerHTML=`<aside class="draft-panel"><h2>Parâmetros da peça</h2>${camposDesenho('param',['largura','altura','mx','my','nx','ny','diametro'])}<button class="btn primary" data-apply-drawing>Atualizar geometria vinculada</button><div data-drawing-status class="draft-status"></div></aside>${centroDesenho('param')}<aside class="draft-panel"><h2>Vínculos</h2><div class="draft-links">Primeiro centro X<br><code>−comprimento / 2 + margem X</code></div><div class="draft-links">Passo entre furos<br><code>(comprimento − 2 × margem X) / (quantidade X − 1)</code></div><div class="draft-links">Fileiras em Y<br><code>(largura − 2 × margem Y) / (quantidade Y − 1)</code></div><p>Com uma única posição no eixo, o centro é zero. As margens desse eixo ficam sem efeito.</p><p>As margens permanecem fixas quando as dimensões mudam. Não há escala automática do diâmetro.</p><div class="notice">Os vínculos são recalculados no aplicativo. O Macro B exportado usa coordenadas calculadas e laços por fileira.</div></aside>`;
function atualizarCamposDesenho(skip){document.querySelectorAll('[data-drawing-key]').forEach(el=>{if(el!==skip)el.value=DESENHO.p[el.dataset.drawingKey]??'';});}
function desenharSVG(svg){
 const p=DESENHO.p;if(validarDesenho(p).length){svg.replaceChildren();return;}
 const width=640,height=480,pad=80,scale=Math.min((width-pad*2)/p.largura,(height-pad*2)/p.altura);
 const cx=320,cy=245,W=p.largura*scale,H=p.altura*scale,x=cx-W/2,y=cy-H/2;
 const prefix=svg.id;svg.setAttribute('viewBox','0 0 640 480');
 const rows=fileirasDesenho(p);let holes='';
 rows.forEach((row,j)=>{for(let i=0;i<row.n;i++){const X=cx+(row.x0+i*row.ix)*scale,Y=cy-row.y0*scale;holes+=`<g><circle class="hole ${desenhoSelecao==='furos'?'selected':''}" cx="${X}" cy="${Y}" r="${p.diametro/2*scale}"/><path class="center-mark" d="M${X-7},${Y}h14 M${X},${Y-7}v14"/></g>`;}});
 svg.innerHTML=`<defs><pattern id="${prefix}-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#173343" stroke-width=".5"/></pattern><marker id="${prefix}-arrow" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto-start-reverse"><path d="M5 0L0 2.5L5 5" fill="none" stroke="#24c8de"/></marker></defs><rect width="640" height="480" fill="url(#${prefix}-grid)"/><rect class="geometry ${desenhoSelecao==='contorno'?'selected':''}" x="${x}" y="${y}" width="${W}" height="${H}"/>${holes}<g class="dimension"><path d="M${x},${y-8}V${y-35} M${x+W},${y-8}V${y-35}"/><path marker-start="url(#${prefix}-arrow)" marker-end="url(#${prefix}-arrow)" d="M${x},${y-26}H${x+W}"/><path d="M${x+W+8},${y}H${x+W+35} M${x+W+8},${y+H}H${x+W+35}"/><path marker-start="url(#${prefix}-arrow)" marker-end="url(#${prefix}-arrow)" d="M${x+W+26},${y}V${y+H}"/><path d="M${cx-10},${cy}h20 M${cx},${cy-10}v20"/></g><text x="${cx}" y="${y-34}" text-anchor="middle">${fnum(p.largura)}</text><text x="${x+W+35}" y="${cy}" transform="rotate(90 ${x+W+35} ${cy})" text-anchor="middle">${fnum(p.altura)}</text><text x="${x}" y="${y+H+35}">${p.nx*p.ny} × Ø${fnum(p.diametro)} · margens X ${fnum(p.mx)} / Y ${fnum(p.my)}</text><path class="dimension" d="M35 435h35 M35 435v-35"/><text x="75" y="440">X</text><text x="30" y="390">Y</text>`;
}
function renderDesenhos(){
 const errors=validarDesenho(DESENHO.p),warnings=avisosDesenho(),sync=desenhoSincronizado();
 document.querySelectorAll('.draft-svg').forEach(desenharSVG);
 document.querySelectorAll('[data-drawing-select]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.drawingSelect===desenhoSelecao)));
 document.querySelectorAll('[data-drawing-count]').forEach(el=>el.textContent=errors.length?'Geometria incompleta':`${DESENHO.p.nx*DESENHO.p.ny} furos · ${DESENHO.p.ny} fileiras`);
 document.querySelectorAll('[data-drawing-status]').forEach(el=>{el.className='draft-status '+(errors.length?'invalid':sync&&!warnings.length?'':'pending');el.textContent=errors.length?errors.join(' '):(sync?'Geometria vinculada ao CAD 2D.':'Alterações aguardam confirmação para atualizar o CAD 2D.')+(warnings.length?' '+warnings.join(' '):'');});
 document.querySelectorAll('[data-drawing-summary]').forEach(el=>el.textContent=errors.length?'Confira os campos para visualizar.':`Retângulo ${fnum(DESENHO.p.largura)} × ${fnum(DESENHO.p.altura)} mm · Furos Ø${fnum(DESENHO.p.diametro)} · ${sync?'furos no CAD 2D':'desenho em edição'}`);
}
document.querySelectorAll('[data-drawing-key]').forEach(el=>el.addEventListener('input',()=>{DESENHO.p[el.dataset.drawingKey]=el.value===''?null:Number(el.value);atualizarCamposDesenho(el);renderDesenhos();atualizarAvisoDesenho();}));
document.querySelectorAll('[data-apply-drawing]').forEach(el=>el.addEventListener('click',aplicarDesenho));
document.querySelectorAll('[data-go-cad2d]').forEach(el=>el.addEventListener('click',()=>$('cad-mode')?.click()));
document.querySelectorAll('[data-fit-drawing]').forEach(el=>el.addEventListener('click',renderDesenhos));
document.querySelectorAll('[data-drawing-select]').forEach(el=>el.addEventListener('click',()=>{desenhoSelecao=el.dataset.drawingSelect;renderDesenhos();}));
function atualizarAvisoDesenho(){
 $('drawing-warning')?.remove();
 if(!DESENHO.confirmado&&!entidadesVinculadas().length)return;
 const messages=[];
 if(!desenhoSincronizado())messages.push('Desenho 2D e geometria vinculada divergentes. Confirme a geometria para atualizar o CAD 2D.');
 messages.push(...avisosDesenho());
 if(messages.length){const el=document.createElement('div');el.id='drawing-warning';el.className='warnrow';el.textContent=messages.join(' ');$('warns').prepend(el);}
}
atualizarCamposDesenho();renderDesenhos();

const DESENHO2D={render:renderDesenhos,aplicar:aplicarDesenho,avisos:atualizarAvisoDesenho,salvar:salvarDesenho2D,carregar:carregarDesenho2D,sincronizado:desenhoSincronizado};

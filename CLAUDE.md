# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar com o código deste repositório.

## O que é isto

Uma aplicação HTML para montar visualmente código G de usinagem no padrão Fanuc **Macro B** (a interface e os comentários do código estão em português). Não há build system obrigatório, gerenciador de pacotes nem suíte de testes end-to-end — é HTML/CSS/JS puro que roda de um servidor local; os scripts de `ferramentas/` rodam sob demanda no Node, nunca em tempo de página.

`estudio_cnc.html` foi aposentado (decisão do Leonardo, `INSTRUCAO-ARQUITETURA.md`) — o Montador é a única interface do projeto. Recuperar o histórico se necessário: `git show <commit>:estudio_cnc.html`.

- `montador_macro_cnc_2.html` — construtor estilo "Lego" para desktop, **única interface** do projeto. Shell fixo (menu de sete etapas: Projetos, Desenho 2D, Parâmetros, Planejamento, Simulação, Programa, Configurações — `data-stage` nos botões, navegação por `showStage()`/`stageInfo`, sem cirurgia de DOM em runtime). Na etapa Planejamento, uma paleta de botões de operação adiciona blocos a uma lista ordenada ("pilha"); cada bloco expande em um formulário para editar seus parâmetros. O script inline do próprio HTML ficou abaixo de 150 linhas — só o boot e o "refresh geral" (código + avisos + 3D), que funciona como maestro chamando os módulos de `src/ui/`.

## Estrutura de pastas

```
/
├─ montador_macro_cnc_2.html     ← única interface
├─ src/
│  ├─ core/          ← domínio puro, sem DOM (ex-engine.js)
│  │   formato.js · simulador.js · operacoes.js · macros.js
│  │   fichas.js · features.js · programa.js · corte.js
│  └─ ui/            ← tudo que toca o DOM
│      cad2d.js · preview3d.js · modal-macro.js
│      pilha.js · paleta.js · desenho2d.js
├─ estilos/
│   ui.css
├─ dados/
│   estrategias_canal.json · estrategias_escareado.json · estrategias_bolsa.json  ← fonte da verdade
│   estrategias.js          ← DERIVADO, gerado por ferramentas/build-estrategias.js
├─ ferramentas/
│   verificar.cjs · build-estrategias.js · baseline.txt
├─ amostras/
│   programas_anotados/
└─ docs/
```

**Regra de decisão para arquivo novo:** toca o DOM? Não → `src/core/`. Sim → `src/ui/`. Duas pastas, sem terceira categoria.

## Ordem de carga dos scripts (`montador_macro_cnc_2.html`)

```
<link href="estilos/ui.css">                (+ <style> remanescente do próprio HTML, só o que é específico da interface)
<script src=".../three.min.js">             (CDN, r128)
<script src="src/core/formato.js">
<script src="src/core/simulador.js">
<script src="src/core/operacoes.js">
<script src="src/core/macros.js">
<script src="src/core/fichas.js">
<script src="src/core/features.js">
<script src="src/core/programa.js">
<script src="src/core/corte.js">
<script src="dados/estrategias.js">
<script src="src/ui/cad2d.js">
<script> ... helpers globais ($ , clamp, toast) ... </script>
<script src="src/ui/preview3d.js">
<script src="src/ui/modal-macro.js">
<script src="src/ui/pilha.js">
<script src="src/ui/paleta.js">
<script> ... refresh geral + boot de UI da página ... </script>
<script src="src/ui/desenho2d.js">           (último — depende de tudo acima)
<script> ... boot final: CAD2D.init(); init3D(); renderPilha(); refresh(); </script>
```

Cada arquivo novo declara no próprio cabeçalho (duas linhas: o que faz e de quem depende) — mantenha esse hábito ao criar ou mexer em módulos. **Scripts clássicos** (`<script src>`), não ES modules — ES modules exigiriam servidor sempre e reescrita de todos os arquivos; fora de escopo por ora.

## Rodando / desenvolvendo

Sem `file://` — carregar `src/core/*.js`/`dados/estrategias.js` por `<script src>` funciona em `file://`, mas o fluxo de teste do projeto é via servidor local: `py -m http.server 8000` em `C:/Projetos/cnc-suite`, depois `http://localhost:8000/montador_macro_cnc_2.html`. O app carrega o Three.js r128 e Google Fonts via CDN em tempo de execução — é preciso conexão com a internet para o preview 3D e as fontes; degrada graciosamente sem o Three.js (a flag `TEM3D` desativa o painel 3D, mas a geração de código continua funcionando).

**Rede de proteção — `ferramentas/verificar.cjs`:** carrega os módulos de `src/core/` + `dados/estrategias.js` em Node (stub mínimo de `document`), monta um projeto de referência fixo (operação nativa + ficha JSON + macro custom), chama `gerarPrograma()` e compara o SHA-256 da saída com `ferramentas/baseline.txt`.

```bash
node ferramentas/verificar.cjs            # compara com o baseline; sai com código 1 se divergir
node ferramentas/verificar.cjs --salvar   # grava ferramentas/baseline.txt
```

Rode isso como teste principal a cada mudança em `src/core/` — roda em segundos, sem navegador. Depois, no navegador (`localhost:8000`): console sem erro, e confira o código gerado no painel CÓDIGO/"Programa gerado" e se o preview 3D atualiza. Se `verificar.cjs` divergir, reverta a mudança em vez de consertar por cima — a saída de G-code deve ser byte a byte idêntica antes/depois de qualquer refatoração estrutural.

## Arquitetura principal (`src/core/`, ex-`engine.js`)

O antigo `engine.js` (monólito de ~875 linhas) foi quebrado em módulos por responsabilidade — a lógica de usinagem em si não mudou, só a organização em arquivos:

| Módulo | Responsabilidade |
|---|---|
| `formato.js` | helpers de formatação numérica/texto (`num`, `fnum`, `fx`, `noAcc`) — sem dependências |
| `operacoes.js` | operações nativas (`DEFS`, `ORDEM`): faceamento e furação em linha/círculo |
| `macros.js` | macros cruas cadastradas pelo usuário (`CUSTOM`/`registrarCustom`) |
| `fichas.js` | interpretador de estratégias em JSON (`avaliarExpr`, `interpretarEstrategia`, `registrarEstrategia`) |
| `features.js` | deriva parâmetros de operação a partir de entidades do CAD 2D (`FEATURES.furos/contorno/limites`) — puro, recebe o array de entidades já lido por quem chama (Etapa 3, `INSTRUCAO-CAD-CAM.md`) |
| `programa.js` | estado da sequência de blocos (`SEQ`/`SELECIONADO`/`UID`), `cfg()`, resolução de blocos ancorados em geometria (`paramsEfetivos`), montagem final do G-code (`gerarPrograma`, `coletarWarns`) e números da simulação (`simularEstatisticas`) |
| `simulador.js` | interpretador Fanuc/Macro B (`execNC`) — sem dependências de outros módulos |
| `corte.js` | parâmetros de corte por material (Vc/fz) e helpers puros do modal "Cadastrar macro" |

Uma correção de lógica de usinagem mexe só nesses arquivos — a interface (`src/ui/`) não precisa mudar. `montador_macro_cnc_2.html` fica só com a interface (SVG, formulários, abas) e o setup do Three.js.

### `DEFS` — o registro de operações
`DEFS` é um objeto indexado pelo id da operação (`face`, `furosL`, `furosC`, além das **fichas de estratégia** registradas de `dados/estrategias.js` e de qualquer macro personalizada cadastrada pelo usuário). Cada entrada define um tipo de operação de usinagem:

```
DEFS[id] = {
  nome, sub, cor, hex,      // nome/subtítulo/cor exibidos na paleta e no 3D
  params: [{k, l, d, s, u}] // chave, rótulo, padrão, passo, unidade (ou sel:[...] / chk:true para campos de dropdown/checkbox)
  warn(p, c, d)             // p=parâmetros do bloco, c=cfg() (bloco de material/config da máquina), d=Ø da ferramenta local -> string[] de avisos de validação
  gerar(p, c, nb, d)        // retorna string[] com as linhas de G-code deste bloco; nb = offset de rótulo deste bloco
  volume(p, c, d)           // retorna um THREE.Mesh/Group que aproxima o material removido, para o preview 3D
}
```
`ORDEM` define a ordem de exibição dos ids nativos na paleta.

Adicionar uma operação nativa significa incluir uma entrada em `DEFS` e seu id em `ORDEM` **em `src/core/operacoes.js`**. Mas o caminho preferido pra operação nova é **ficha JSON de estratégia**, não código nativo (ver a decisão firme nº 2 do DIARIO.md e a regra de decisão da seção 3 abaixo).

### Operação ancorada em geometria — `geo` (Etapa 3, `INSTRUCAO-CAD-CAM.md`)
Um bloco de `SEQ` pode trazer um campo `geo: [id, id, ...]` — ids de entidades do CAD 2D (`src/ui/cad2d.js`) que ancoram a operação. `geo` é **opcional**: bloco sem `geo` funciona exatamente como antes, com os parâmetros digitados em `p`; é assim que projetos `.json` salvos antes da Etapa 3 continuam abrindo e gerando o mesmo programa. `paramsEfetivos(b)` (`src/core/programa.js`) resolve `geo` em params efetivos antes de toda chamada a `DEFS[...].warn/gerar/volume` (em `gerarPrograma`, `coletarWarns` e `refresh3D`): busca as entidades referenciadas via `CAD2D.entidades()` e injeta `p.furos = FEATURES.furos(entidades)` — `DEFS[tipo].gerar/warn/volume` checam `if(p.furos)` para usar a via nova (posições literais das entidades) em vez da via antiga (campos digitados). Um param de `DEFS[tipo].params` marcado `geo:true` some do formulário (`src/ui/pilha.js`) quando o bloco tem `geo` — é assim que `furosL` esconde X/Y/incremento/quantidade/diâmetro e mostra só profundidade/avanço/ferramenta quando ancorado. O botão "Criar furação" (`src/ui/cad2d.js`, painel de desenho livre) monta esse bloco a partir da seleção atual de círculos via `addBloco('furosL', {geo:[...]})` (`src/ui/paleta.js`).

### Contorno e faceamento ancorados em geometria (Etapa 9, `INSTRUCAO-CAD-CAM.md`)
`DEFS.contorno` (`src/core/operacoes.js`) é sempre ancorada em `geo` — não existe modo digitado, a cadeia fechada de retas/arcos vem inteira de `FEATURES.contorno(entidades)` (`src/core/features.js`), injetada em `p.contorno` por `paramsEfetivos()`. Em vez de calcular o offset da geometria por conta própria, o bloco usa a compensação de raio da própria máquina: "Lado" dentro = `G41`, fora = `G42`, com o registrador `D` já ativo pela troca de ferramenta (`gerarPrograma`). Sem `volume()` escrito à mão — a forma real do corte depende da compensação, que só o controle calcula — o preview 3D desenha o caminho nominal executando o G-code pelo `execNC`, como as macros personalizadas e as fichas.

`FEATURES.contorno()` percorre as entidades ligando pelos extremos e **sempre normaliza a cadeia em sentido anti-horário** antes de devolver `{segmentos, sentido:'CCW'}` (ou `null` se não fechar). O `G2`/`G3` de cada arco é **consequência do percurso, não do desenho**: um arco que mergulha para dentro do material sai `G2` mesmo dentro de um contorno anti-horário — porque, percorrendo o contorno externo sempre anti-horário, um rebaixo côncavo só pode ser varrido em sentido horário local (se saísse `G3` ali, a fresa contornaria por cima da peça, não pelo vão do rebaixo). Inverter esse sentido trocaria `G41`↔`G42` no resto da peça (a cadeia é uma só, com um sentido de percurso único) — não é uma correção isolada do arco.

`DEFS.face` (faceamento) recebeu o mesmo tratamento em vez de virar uma operação nova: quando o bloco tem `geo`, `paramsEfetivos()` injeta `p.limites = FEATURES.limites(entidades)` (bounding box das entidades selecionadas) e os campos digitados `cx2`/`cy2` (Área X/Y) somem do formulário (marcados `geo:true`). `warn()`/`gerar()` passam a centrar a área usinada na caixa da geometria desenhada — ramo isolado (`if(p.limites)`) nunca exercido sem `geo`, então o G-code de blocos digitados continua byte a byte igual.

### Macros personalizadas do usuário
O usuário pode colar código Macro B bruto (com tokens `{parametro}`, além dos tokens reservados `{DIAM}`/`{RF}` para Ø/raio da ferramenta ativa) através do modal "Cadastrar macro" (`src/ui/modal-macro.js`). `registrarCustom(id, raw)` (`src/core/macros.js`) encapsula essa definição bruta em uma entrada `DEFS[id]` normal:
- `warn`/`gerar` substituem os `{tokens}` pelos valores dos parâmetros e renumeram os rótulos `N10`–`N99` e os `GOTO` correspondentes pelo offset `nb` do bloco, para que macros coladas nunca colidam com outros blocos.
- Como macros personalizadas não têm um `volume()` escrito à mão, seu preview 3D é produzido executando o G-code gerado através do interpretador `execNC` (`src/core/simulador.js`) e desenhando o caminho de ferramenta resultante como segmentos de linha em vez de um sólido.

### Estratégias em JSON — o interpretador (`src/core/fichas.js`)
Estratégias de usinagem são **dados** (fichas JSON), nunca código fixo em JS. `interpretarEstrategia(est, p, c, nb, d)` executa a ficha em 5 passos: lê os inputs → calcula as derivadas na ordem declarada → avalia os avisos (informativos, nunca bloqueiam) → resolve os placeholders `{chave}` do template com `fnum()` → emite as linhas. `avaliarExpr(expr, ctx)` avalia as expressões das fichas (aritmética + comparadores) por descida recursiva, sem `eval()`. `registrarEstrategia(id, est)` embrulha a ficha numa entrada `DEFS[id]` normal (registro global `ESTRATEGIAS`, espelho do papel de `CUSTOM`), com preview 3D desenhado via `execNC` como nas macros personalizadas.

As fichas suportam **campos condicionais e exibidos**: um input pode ter `sel` (vira dropdown; o valor é coagido pra número no interpretador) e `quando` (expressão sobre os outros inputs — o campo só aparece quando ela dá verdadeiro); uma derivada pode ser uma **lista de casos** `[{quando, expr}, ..., {expr}]` (primeiro que casa vence, o sem `quando` é o padrão); avisos aceitam `quando` opcional; e a seção `"saidas"` declara **mostradores readonly** de derivadas (sub-bloco "Conferência" na interface), com `quando` próprio. O template aceita **linha condicional**: além de strings, uma linha pode ser um objeto `{quando, l}` — emitida só quando o `quando` der verdadeiro (ex.: o liga/desliga do espelhamento G51.1 da `bolsaFinal`); erro no `quando` **omite** a linha e vira aviso. O `avaliarExpr` tem as funções `TAN()`/`ATAN()` em **graus**. O `interpretarEstrategia` retorna `{linhas, avisos, ctx}` — o `ctx` alimenta as saídas.

**Regra fonte-da-verdade:** as estratégias vivem em **um arquivo por família**, em `dados/` — `estrategias_canal.json`, `estrategias_escareado.json`, `estrategias_bolsa.json`, e assim por diante. Esses arquivos de família são a FONTE DA VERDADE das estratégias — preserve-os; `estrategias_canal.json` continua sendo o formato de referência do interpretador. O `dados/estrategias.js` (carregado pelo HTML via `<script>` porque `fetch` de `.json` falha em `file://`) é **derivado**: a **junção** das estratégias de todos os arquivos de família — e continua sendo o único arquivo que o HTML carrega. Quando qualquer `.json` de família mudar, regenere com:

```bash
node ferramentas/build-estrategias.js
```

Esse script lê os `.json` de família em `dados/`, concatena na ordem canal → escareado → bolsa, e regrava `dados/estrategias.js`. Confirme `git diff dados/estrategias.js` vazio (ou a mudança esperada) depois de rodar — nunca edite os dois em paralelo à mão.

**Regra de decisão — operação nova é ficha JSON, não código nativo** (decisão firme nº 2 do DIARIO.md): só vira `DEFS` nativo em `operacoes.js` quando a lógica não cabe no interpretador de fichas (ex.: geometria que precisa de `volume()` 3D escrito à mão). Por padrão, prefira uma ficha JSON em `dados/`.

**Conversão de operações antigas — `amostras/programas_anotados/`:** os programas G-code anotados pelo Leo com o padrão de marcas `@ED` (vira input), `@FX` (lógica fixa, não tocar) e `@CR` (crítico) ficam guardados em `amostras/programas_anotados/` — são o banco de conhecimento das conversões e **não podem se perder**. Cada conversão vira uma ficha JSON no arquivo da sua família; o julgamento do que é editável é do Leo (as marcas), a tradução para JSON é do Claude. A primeira conversão pelo método foi o escareado helicoidal (`escareado_helicoidal.NC` → `estrategias_escareado.json`).

### Montagem do programa — `gerarPrograma()` (`src/core/programa.js`)
Percorre a sequência ordenada de blocos (`SEQ`) e, para cada bloco:
- Só emite troca de ferramenta (`T`, `M6`, `G54`, `S...M3M8`, `G43`) quando a ferramenta (`t`/`th`/`tdd`) realmente muda em relação ao bloco anterior — caso contrário, atualiza só o `S` se apenas a rotação mudou.
- Chama o `DEFS[...].gerar(p, c, nb, d)` daquele bloco com `nb = (índice+1)*100`, de forma que os rótulos `N` de cada bloco vivem na sua própria centena (bloco 1 usa N110/N120/…, bloco 2 usa N210/N220/…) e nunca colidem.
- Reaproveita um conjunto fixo de variáveis de macro entre os blocos (documentado em comentário no topo de `src/core/operacoes.js`): `#1` passo Z, `#2` Z atual, `#4` profundidade, `#5`/`#6` meias-medidas úteis, `#12` passe lateral, `#13` direção, `#15` contador/offset, `#23`/`#24` centro X/Y, `#26` Z de segurança global, `#30`/`#31` posição do furo. Tenha essa convenção em mente ao editar ou criar corpos de `gerar()` — esses números dependem de não colidir dentro do próprio código de um bloco.

Convenção de zero/referência usada em todo o código: **X0/Y0 no centro do bloco de material, Z0 na face superior**.

### Validação — `coletarWarns()` (`src/core/programa.js`)
Reúne os avisos do `warn()` de cada bloco mais algumas regras gerais (ex.: passo Z acima de 1,5× o Ø da ferramenta, avanço de mergulho acima de ~50% do avanço de corte). Os avisos são apenas informativos — não bloqueiam a geração do código.

### Números da simulação — `simularEstatisticas()` (`src/core/programa.js`, Etapa 10, `INSTRUCAO-CAD-CAM.md`)
Para o painel Simulação, roda o G-code de cada bloco (já com `paramsEfetivos()` resolvido) pelo interpretador `execNC` (`src/core/simulador.js`) e soma os segmentos de movimento devolvidos: comprimento percorrido, tempo estimado (separando rápido de corte — `G0` não carrega `F` no G-code, então `AVANCO_RAPIDO` é uma estimativa fixa só para esse cálculo) e material removido (aproximação por varredura cilíndrica do Ø da ferramenta ao longo do percurso de corte, **não** o volume real da peça — isso dependeria de um `volume()` 3D escrito à mão que fichas e macros personalizadas não têm). Retorna `{comprimentoMm, tempoMin, volumeMm3}`.

### `execNC(texto)` — o interpretador de G-code embutido (`src/core/simulador.js`)
Um pequeno simulador de Fanuc/Macro B que analisa uma string de G-code (remove comentários/rótulos, avalia expressões com variáveis `#` e `IF/GOTO`) e retorna segmentos de movimento (`{ax,ay,az,bx,by,bz,rapid}`) para o preview 3D. É usado em duas situações: para desenhar o caminho de ferramenta de blocos de macro personalizada/ficha (ver acima) e na função "Importar .NC no preview", que permite carregar um arquivo `.NC` externo e ver seu caminho de ferramenta sobreposto na vista 3D.

### Persistência
Sem backend e sem `localStorage`/`sessionStorage` — "Salvar montagem" serializa `{cfg, seq: SEQ, custom: CUSTOM}` em um arquivo `.json` baixado; "Abrir" recarrega o estado a partir de um arquivo `.json` enviado. O G-code gerado em si é exportado via "Baixar .NC" como um download de texto simples.

## Arquitetura de interface (`src/ui/`)

- `cad2d.js` — CAD 2D local do Montador: entidades geométricas independentes do percurso CNC — `line`, `circle`, `arc` e `dim` (cota; não existe `rect` armazenado, ver Etapa 5 abaixo) — com seleção, undo/redo, snap em grade/pontos, entrada por valor (Etapa 4: `cadEntry`/`cadEntryPoint`/`cadPlacePoint`, funciona igual em toda ferramenta a partir do 2º ponto), vínculo de medida principal entre entidades, Aparar e zoom/pan. Superfície exposta: `CAD2D = { init, render, fit, salvar, carregar, entidades, substituirOrigem }` — `substituirOrigem(origem, novas)` troca só as entidades marcadas com aquele `desenho2D.origem`, preservando as desenhadas à mão. Depende de `$` e `fnum` (globais definidos pelo HTML host); carregado logo após `dados/estrategias.js`.
  - **Retângulo é atalho de construção (Etapa 5):** `cadAddRect` monta 4 `line` independentes (não um tipo `rect` guardado), compartilhando `rectGrupo` só como marca de origem — assim dá para selecionar/cotar/apagar cada lado sozinho. `.json` salvo antes desta etapa ainda tem `rect`; `cadCarregar` converte via `cadExpandirRects` ao abrir, e o G-code sai idêntico.
  - **Cota é propriedade da entidade, não uma ferramenta (Etapa 6):** `cadNewDim()` cria a cota junto com toda entidade nova (reta/círculo/arco), numa posição padrão sensata — não existe mais ferramenta "Cota". A cota (`type:'dim'`) não guarda valor próprio: lê ao vivo o campo referenciado (`ref`/`medida`) via `cadSize`/`cadWriteSize`, o mesmo mecanismo de campo único (sem solver) que o vínculo de medida principal já usa (`cadApplyLinks`). Apagar a cota (selecioná-la e Excluir) remove só ela, nunca a geometria; o interruptor "Cotas" da barra (`cadShowDim`) só esconde todas de uma vez.
  - **Aparar (Etapa 7):** `cadLineIntersections`/`cadTrimLine` cobrem reta×reta e reta×arco/círculo — só a reta clicada é encurtada, até o cruzamento mais próximo do clique (sobra uma reta menor, ou duas se o cruzamento for no meio). Arco aparado e arco×arco ficam fora do escopo desta fase.
  - Acoplamento com o domínio de operações: "Criar furação" (Etapa 3) chama `addBloco('furosL',{geo})`; "Criar contorno"/"Criar faceamento" (Etapa 9 — `cadContornoSelecionados`/`cadFaceamentoSelecionados`, usando `FEATURES.contorno`/`FEATURES.limites`) chamam `addBloco('contorno'|'face',{geo})` — todos via `paleta.js` + `showStage()`. `cadCommit()` chama `refreshDebounced()` a cada mudança de geometria, para o G-code de blocos ancorados (`geo`) não ficar desatualizado.
- `preview3d.js` — preview 3D (Three.js) do Montador: cena, câmera, bloco de material, volumes de remoção por operação e caminho de ferramenta dos `.NC` importados. Mapeamento CNC → cena: `three(x, z, -y)` · Z0 = topo do bloco. Depende de globais definidos no `<script>` principal do HTML, incluindo `paramsEfetivos()` (`programa.js`) para resolver blocos ancorados em geometria antes de chamar `DEFS[...].volume()`.
- `modal-macro.js` — modal "Cadastrar/editar macro": formulário de parâmetros, checagem de tokens/variáveis `#` do código colado e persistência via `registrarCustom`/`removerCustom`.
- `pilha.js` — pilha de blocos: renderização dos cards de operação, campos condicionais/saídas de ficha (esconde campos `geo:true` quando o bloco está ancorado, ver seção "Operação ancorada em geometria"), edição, reordenar/duplicar/remover, salvar/abrir/limpar montagem e copiar/baixar o G-code gerado.
- `paleta.js` — paleta de operações (botões que adicionam blocos à pilha). Depende de `ORDEM`/`DEFS`/`CUSTOM`/`ESTRATEGIAS` (core), `F_TROCA`, `SEQ`, `UID`, `SELECIONADO`, `toast()`, `renderPilha()`, `refresh()`, `abrirEditor()` (modal-macro.js).
- `desenho2d.js` — vínculo entre o desenho guiado (retângulo + matriz de furos) e o CAD 2D local (`cad2d.js`); escreve entidades `circle` em `CAD.entities` via `CAD2D.substituirOrigem()` (`aplicarDesenho`), marcadas com `desenho2D:{origem,fileira,furo}` — não cria mais operações em `SEQ` diretamente (ver `INSTRUCAO-CAD-CAM.md`, Etapa 2), acoplamento documentado no topo do próprio arquivo. `desenharSVG()` (aba Parâmetros, Etapa 8) renderiza a geometria real de `CAD2D.entidades()` — reaproveitando `cadShape`/`cadEndpoints`/`cadDimGroup`/`cadEscala` de `cad2d.js` — em vez da figura genérica derivada de `DESENHO.p`; campos paramétricos e o painel de Vínculos não mudaram. Superfície exposta: `DESENHO2D = { render, aplicar, avisos, salvar, carregar, sincronizado }`. Depende de globais do `<script>` principal (`$`, `cfg()`, `toast()`, `fnum()`) e do `CAD2D`; é o último `<script>` de módulo carregado no HTML.

## `estilos/ui.css`
Estilo único da interface (tokens `:root`, tipografia, `.btn`, `.card`, `.field`, `.warnrow`, toast, `<pre>` de código). O HTML carrega `<link rel="stylesheet" href="estilos/ui.css">` antes do seu `<style>` remanescente, que guarda só o que é específico da interface.

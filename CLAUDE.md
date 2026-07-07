# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar com o código deste repositório.

## O que é isto

Duas aplicações HTML para montar visualmente código G de usinagem no padrão Fanuc **Macro B** (a interface e os comentários do código estão em português). Não há build system, gerenciador de pacotes, suíte de testes nem servidor — é HTML/CSS/JS puro que roda abrindo direto no navegador.

- `estudio_cnc.html` — app mobile-first com três abas (PROJETO / 3D / CÓDIGO). A aba PROJETO tem uma tela 2D em SVG onde as operações ("blocos") são posicionadas e arrastadas direto sobre uma vista de topo do bloco de material, além de um painel inspetor para editar os parâmetros do bloco selecionado.
- `montador_macro_cnc_2.html` — construtor estilo "Lego" em duas colunas, voltado para desktop. Uma paleta de botões de operação adiciona blocos a uma lista ordenada ("pilha"); cada bloco expande em um formulário para editar seus parâmetros. Não tem tela 2D.
- `engine.js` — **o motor de usinagem compartilhado** (definições de blocos `DEFS`/`ORDEM`, montagem do programa `gerarPrograma`, interpretador de G-code `execNC`, macros personalizadas). Antes esse código era copiado dentro de cada HTML; hoje mora num arquivo só, carregado pelos dois via `<script src="engine.js"></script>`. **Uma correção na lógica de usinagem agora vale para os dois apps de uma vez** — não é mais preciso duplicar a mudança. Os HTML ficam só com a interface (SVG, formulários, abas) e o setup do Three.js.

## Rodando / desenvolvendo

Não há CLI. Para testar uma mudança, basta abrir o arquivo `.html` alterado no navegador (duplo clique, ou arrastar para uma aba do navegador). Os dois arquivos carregam o Three.js r128 e Google Fonts via CDN em tempo de execução — é preciso conexão com a internet para o preview 3D e as fontes; o app degrada graciosamente sem o Three.js (a flag `TEM3D` desativa o painel 3D, mas a geração de código continua funcionando).

Não há suíte de testes automatizada. Verifique as mudanças manualmente no navegador: adicione/edite blocos, confira o código gerado no painel CÓDIGO/"Programa gerado" e confira se o preview 3D atualiza.

## Arquitetura principal (implementada em `engine.js`)

### `DEFS` — o registro de operações
`DEFS` é um objeto indexado pelo id da operação (`face`, `bolsaRet`, `bolsaCirc`, `bolsaCon`, `escariado`, `canal`, `canalR`, `furosL`, `furosC`, além de qualquer macro personalizada cadastrada pelo usuário). Cada entrada define um tipo de operação de usinagem:

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

Adicionar uma nova operação nativa significa incluir uma entrada em `DEFS` e seu id em `ORDEM`, nos dois arquivos HTML caso a operação deva ficar disponível nas duas interfaces.

### Macros personalizadas do usuário
O usuário pode colar código Macro B bruto (com tokens `{parametro}`, além dos tokens reservados `{DIAM}`/`{RF}` para Ø/raio da ferramenta ativa) através do modal "Cadastrar macro". `registrarCustom(id, raw)` encapsula essa definição bruta em uma entrada `DEFS[id]` normal:
- `warn`/`gerar` substituem os `{tokens}` pelos valores dos parâmetros e renumeram os rótulos `N10`–`N99` e os `GOTO` correspondentes pelo offset `nb` do bloco, para que macros coladas nunca colidam com outros blocos.
- Como macros personalizadas não têm um `volume()` escrito à mão, seu preview 3D é produzido executando o G-code gerado através do interpretador `execNC` e desenhando o caminho de ferramenta resultante como segmentos de linha em vez de um sólido.

### Montagem do programa — `gerarPrograma()`
Percorre a sequência ordenada de blocos (`SEQ`) e, para cada bloco:
- Só emite troca de ferramenta (`T`, `M6`, `G54`, `S...M3M8`, `G43`) quando a ferramenta (`t`/`th`/`tdd`) realmente muda em relação ao bloco anterior — caso contrário, atualiza só o `S` se apenas a rotação mudou.
- Chama o `DEFS[...].gerar(p, c, nb, d)` daquele bloco com `nb = (índice+1)*100`, de forma que os rótulos `N` de cada bloco vivem na sua própria centena (bloco 1 usa N110/N120/…, bloco 2 usa N210/N220/…) e nunca colidem.
- Reaproveita um conjunto fixo de variáveis de macro entre os blocos (documentado em um comentário acima de `DEFS` em `estudio_cnc.html`, por volta da linha 394): `#1` passo Z, `#2` Z atual, `#4` profundidade, `#5`/`#6` meias-medidas úteis, `#12` passe lateral, `#13` direção, `#15` contador/offset, `#23`/`#24` centro X/Y, `#26` Z de segurança global, `#30`/`#31` posição do furo. Tenha essa convenção em mente ao editar ou criar corpos de `gerar()` — esses números dependem de não colidir dentro do próprio código de um bloco.

Convenção de zero/referência usada em todo o código: **X0/Y0 no centro do bloco de material, Z0 na face superior**.

### Validação — `coletarWarns()`
Reúne os avisos do `warn()` de cada bloco mais algumas regras gerais (ex.: passo Z acima de 1,5× o Ø da ferramenta, avanço de mergulho acima de ~50% do avanço de corte). Os avisos são apenas informativos — não bloqueiam a geração do código.

### `execNC(texto)` — o interpretador de G-code embutido
Um pequeno simulador de Fanuc/Macro B que analisa uma string de G-code (remove comentários/rótulos, avalia expressões com variáveis `#` e `IF/GOTO`) e retorna segmentos de movimento (`{ax,ay,az,bx,by,bz,rapid}`) para o preview 3D. É usado em duas situações: para desenhar o caminho de ferramenta de blocos de macro personalizada (ver acima) e na função "Importar .NC no preview", que permite carregar um arquivo `.NC` externo e ver seu caminho de ferramenta sobreposto na vista 3D.

### Persistência
Sem backend e sem `localStorage` — "Salvar projeto"/"Salvar montagem" serializa `{cfg, seq: SEQ, custom: CUSTOM}` em um arquivo `.json` baixado; "Abrir" recarrega o estado a partir de um arquivo `.json` enviado. O G-code gerado em si é exportado via "Baixar .NC" como um download de texto simples.

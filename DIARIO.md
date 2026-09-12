# Diário de bordo — CNC Suite

Este arquivo é a nossa memória entre sessões. Se você (Claude) está lendo isto
numa conversa nova, trate como se fôssemos a mesma dupla de sempre: o Leo e você,
retomando o trabalho de onde paramos. Não é relatório — é o caderno que fica na
bancada pra ninguém perder o fio.

---

## Como trabalhamos

### Interface ativa e conceito visual — decisão de 12/09/2026

Desenvolvimento e testes de navegador somente no Montador. O Estúdio fica
como conceito preservado; não excluir seus arquivos. Esta decisão substitui
a rotina anterior de testes nas duas interfaces. Testes do motor continuam.
Imagem escolhida por Leonardo salva em docs/referencias/conceito-montador-macro-b.jpg.
O plano docs/PLANO-PROFISSIONAL-CNC-MACRO-B.md detalha as seis etapas,
organização visual, limites técnicos e sequência incremental. O layout atual
do Montador será evoluído para esse conceito. Usar somente HTTP.


### Acesso ao navegador — decisão de Leonardo em 2026-09-11

- Leonardo proíbe abrir URLs `file://`. Não tentar esse acesso nem contornar a proibição.
- Usar somente o servidor HTTP iniciado pelo Leonardo em `C:\Projetos\cnc-suite`
  com `py -m http.server 8000`.
- Estúdio: `http://localhost:8000/estudio_cnc.html`.
- Montador: `http://localhost:8000/montador_macro_cnc_2.html`.
- Se o servidor não estiver disponível, informar o problema; não substituir por `file://`.
- Esta decisão substitui instruções anteriores de teste por duplo clique ou `file://`.
  A abertura por arquivo local não é uma pendência de teste autorizada nesta entrega.

O método é sempre o mesmo, e ele importa tanto quanto o código:

- **Planejar antes de agir.** Primeiro a gente entende e combina o rumo. Só depois mexe.
- **Diff em arquivo separado.** A mudança vai primeiro pra um arquivo de diff, pra
  ser lida com calma antes de encostar no código de verdade.
- **Revisar juntos antes de aplicar.** Nada entra sem o Leo ter olhado e dado o ok.
- **Aprovar comando a comando.** Sempre a opção 1, um de cada vez. Nunca "liberar tudo".
- **Testar no navegador antes de commitar.** Abre o `.html`, mexe nos blocos, confere
  o código gerado e o preview 3D. Só depois é que vira commit.
- **Um arquivo por vez.** Nada de mexer em três frentes ao mesmo tempo.

E o jeito de conversar com o Leo:

- Respostas **curtas**.
- **Uma ideia por vez** — sem despejar tudo de uma vez.
- **Linguagem simples**, com analogias de chão de fábrica.
- **Franqueza direta**, sem enrolação e sem dourar a pílula.

---

## O que já foi feito

- Instalação do Claude Code.
- Criação do repositório Git do projeto.
- **Extração do motor duplicado para `engine.js`**: os dois apps
  (`estudio_cnc.html` e `montador_macro_cnc_2.html`) tinham o mesmo motor de
  usinagem copiado lado a lado. Agora ele mora num arquivo só, `engine.js`,
  carregado pelos dois via `<script src="engine.js">`.
- **Correção do bug da div duplicada** do modal `#modalMacro` no estúdio.
- **Trabalho remoto ligado** (remote-control), pra tocar o projeto à distância.
- **Parte 1 do interpretador de estratégias** no `engine.js`: `avaliarExpr`
  (expressões das fichas, sem eval), `interpretarEstrategia` (os 5 passos),
  `registrarEstrategia`/`removerEstrategia` + registro `ESTRATEGIAS`. CLAUDE.md
  ganhou a seção do interpretador e a regra fonte-da-verdade (o `.json` manda;
  o `estrategias.js` é derivado e regenerado a partir dele, nunca editado em
  paralelo — futuramente um passo de build automático).
- **Parte 2 do interpretador**: `estrategias.js` derivado do
  `estrategias_canal.json` (cabeçalho + JSON integral + rodapé de registro),
  ligado nos dois HTMLs (`<script>` após o engine.js e `ESTRATEGIAS` na paleta).
- **Testado e aprovado no navegador nos dois apps**, inclusive por duplo clique
  (file://): canais aparecem na paleta, matemática do G-code confere
  (`#5=(larg-diam)/2`), rótulos N por centena sem colisão, avisos na lista
  amarela sem bloquear, preview 3D desenha o caminho.
- **MARCO: o interpretador funciona de ponta a ponta.** Estratégia nova =
  escrever JSON, sem tocar no motor. O objetivo original do projeto está de pé.
- **Decisão de organização: um arquivo por família.** As estratégias vivem em
  um `.json` por família (`estrategias_canal.json`, `estrategias_escareado.json`,
  ...). O `estrategias.js` derivado passou a ser a **junção** das estratégias de
  todos os arquivos de família — continua sendo o único carregado pelos HTMLs,
  nada mudou neles. A receita de regeneração está no cabeçalho do próprio
  `estrategias.js`.
- **Primeira conversão pelo método novo: o escareado helicoidal.** O Leo anotou
  o programa com `@ED`/`@FX`/`@CR`, o Claude traduziu pra ficha
  `estrategias_escareado.json`. Pontos da conversão: `#5` virou derivada
  automática `(furoDiam - diam)/2` com o Ø da ferramenta ativa; a origem soma
  **no movimento** (`X[#6+#23]`), nunca no diâmetro; o `I` do `G3` ficou `-[#6]`
  (incremental, sem origem); cabeçalho/rodapé adaptados ao padrão do
  interpretador (rótulos `{nb}`, `#26` global); na revisão o Leo pediu o avanço
  como input (`F[#10]` com `#10={f}`), como nas fichas de canal. O padrão de
  anotação estreou e funcionou.
- **O acervo começou:** o `.NC` anotado original está guardado em
  `programas_anotados/escareado_helicoidal.NC`. As anotações do Leo são o banco
  de conhecimento — não podem se perder.
- **Ficha `canalRaiadoDesbaste`** (`estrategias_canal.json`): o desbaste do
  canalR convertido em ficha, preservando a matemática validada do arco
  (`#9=SQRT[[#7*#7]-[#17*#17]]`) e da expansão lateral. Duas fases com o
  mesmo IF do `#11` selecionando AP e avanço: `apReta`/`fReta` na parte reta
  (incremento fora da peça), `apRaio`/`fRaio` no fundo em U (mergulho direto
  no material). Travas de segurança: os 4 campos novos nascem em 0 e cada um
  tem aviso "NAO DEFINIDO - AJUSTE O CAMPO" — AP zerado deixaria o laço de Z
  em loop infinito na máquina. Os `Math.max` do JS viraram clamps Macro B no
  template (`IF[#8LT0.1]THEN#8=0.1`, `IF[#5LT0]THEN#5=0`). Testada nos dois
  apps. Commit `948f631`.
- **Primeira remoção de nativas: `canal` e `escariado` saíram do
  `DEFS`/`ORDEM`** — já cobertas pelas fichas testadas (canalAbertoSimples,
  canalAbertoExpansao e escareadoHelicoidal). Testado nos dois apps no
  navegador: paleta sem os chips antigos, sem erros de console, blocos
  restantes e fichas gerando programa normal. Commit `e4d246d`.
- **Ficha `canalRaiadoAcabamento` + correção de fronteira reta/raio.**
  O acabamento do canalR virou ficha (contorno de parede por nível,
  `#19=(larg-diam)/2` como derivada do Ø ativo, AP e avanço em duas fases,
  travas de campo zerado). No teste do Leo apareceu o **bug de fronteira**:
  com `#11=34.798` o passo da reta descia até 35.000 invadindo o raio.
  Correção nas duas fichas do canal raiado: teto `#16` (`#11` na reta, `#4`
  no raio) clampa o incremento — o último passo da reta **encosta** no `#11`
  sem passar; no desbaste a seleção do AP virou LT/GE para o passo que sai
  da fronteira já usar `apRaio`. Comparativo com o nativo: acabamento com
  caminho idêntico (372 segs, desvio 0) antes da correção; depois dela, a
  ficha diverge do nativo **só na fronteira** (o nativo morreu com o bug).
  Commit `13f6ff2`.
- **Aposentadoria do `canalR` + remoção de `bolsaRet` e `bolsaCirc`.**
  O canalR saiu pela regra de migração (100% coberto pelas fichas de
  desbaste e acabamento testadas). bolsaRet e bolsaCirc saíram por
  **decisão de escopo do Leo** (não são mais desejadas no projeto), não por
  cobertura — não têm ficha equivalente. A tela 2D do estúdio perdeu os
  ramos das três e o código morto de canal/escariado (pendência quitada).
  Paleta atual: face, bolsaCon, furosL, furosC + as 5 fichas.
  Commit `856af5a`.
- **Plataforma de campos condicionais e exibidos (passos 1–4).** O motor
  ganhou: `TAN()`/`ATAN()` em graus no `avaliarExpr`, derivadas em lista de
  casos `{quando, expr}` (primeiro que casa vence), `quando` opcional nos
  avisos, coação do valor de seletor pra número (o `<select>` grava string)
  e o `ctx` exposto no retorno do `interpretarEstrategia` (`000a6de`).
  Os dois HTMLs ganharam: filtro `quando` no render dos campos, rebuild do
  formulário quando o seletor troca, sub-bloco "Conferência" com as
  `saidas` (mostradores readonly de derivadas, atualizados em place sem
  roubar o foco de quem digita) e a correção `String()===String()` do
  `selected` do dropdown (estúdio `cbc22b0`, montador `a4b389f`). A ficha
  do escareado helicoidal foi reescrita com o seletor **"Calcular por" de
  3 modos** — topo+ângulo, fundo+ângulo (topo reconstruído por TAN) e dois
  diâmetros (ângulo por ATAN) — todos convergindo pro **mesmo G-code**
  pela relação `(raioTopo − raioFundo) = prof × TAN(ângulo)`, com a
  Conferência de double-check (`987d94f`). Em cada passo a **não-regressão
  foi provada por hash SHA-256**: as 5 fichas geram código e formulário
  idênticos byte a byte antes e depois.
- **Linha condicional no template do motor.** O interpretador aceita linha
  como objeto `{quando, l}`: só é emitida quando a expressão der verdadeiro —
  o liga/desliga de trechos (ex.: espelhamento G51.1). Erro no `quando` omite
  a linha e vira aviso (na dúvida, não emitir). Prova de não-regressão por
  hash feita primeiro numa CÓPIA no scratchpad: as 5 fichas idênticas byte a
  byte antes/depois (`16268485…`), só então aplicada no engine.js real.
  Commit `d7c4cb1`.
- **Ficha `bolsaFinal` — conversão da bolsa cônica pelo método de anotação.**
  Família nova `estrategias_bolsa.json`; o anotado do Leo guardado em
  `programas_anotados/bolsa_final.NC`. Seletor "Calcular por" de 2 modos
  (ângulo direto, ou X/Z inicial e final com ângulo por ATAN), espelhamento
  G51.1/G50.1 em linhas condicionais, avanço como input (F2000 do original
  virou default), #26 global (não é input). Melhoria intencional sobre o
  original: o X de recuo (#8) deixou de ser input e virou derivada automática
  `xRecuo = xFinRef - (20 + diam/2)` — sempre 20 mm além do raio da
  ferramenta ativa, pra qualquer fresa (com Ø10 dá 66.971; o original usava
  85 fixo). Conferência: ângulo calculado, X final (referência de zeramento
  na profundidade final) e X de recuo. Comparativo com o original via execNC:
  336 segmentos de corte nos dois, paredes com desvio 0, divergência só nos
  pontos do recuo (18.029 em X — esperada). Commit `982f09e`.
- **Aposentadoria da `bolsaCon`.** A nativa saiu do `DEFS`/`ORDEM` pela regra
  de migração (100% coberta pela `bolsaFinal` testada nos dois apps — era a
  mesma macro Bolsa_Final, até nos defaults). A tela 2D do estúdio perdeu os
  4 ramos órfãos do `wedge` (geoInfo, render, handles e drag). Paleta atual:
  face, furosL, furosC + as 6 fichas. Hash das 6 fichas idêntico antes/depois
  da remoção (`6515576e…`). (Este commit.)

Commits até aqui (do mais recente pro mais antigo):

- (este commit) — Remove a nativa bolsaCon coberta pela ficha bolsaFinal e atualiza DIARIO/CLAUDE
- `982f09e` — Converte a bolsa conica em ficha bolsaFinal: 2 modos de calculo, espelhamento G51.1 e X de recuo automatico
- `d7c4cb1` — Motor: template de ficha aceita linha condicional {quando, l} no interpretador
- `ddbd6e0` — Atualiza DIARIO.md e CLAUDE.md: campos condicionais/exibidos, direcao Sinumerik e decisoes 7-8
- `987d94f` — Passo 4: escareado helicoidal com seletor Calcular por de 3 modos e Conferencia
- `a4b389f` — Passo 3: campos condicionais, rebuild no seletor e Conferencia (saidas) no montador
- `cbc22b0` — Passo 2: campos condicionais, rebuild no seletor e Conferencia (saidas) no estudio
- `000a6de` — Passo 1: TAN/ATAN, derivadas por casos, quando nos avisos e ctx exposto no interpretador
- `cae913f` — Atualiza o DIARIO.md: acabamento em ficha, correcao de fronteira e aposentadoria do canalR
- `856af5a` — Remove canalR, bolsaRet e bolsaCirc do motor e limpa a tela 2D do estudio
- `13f6ff2` — Adiciona a ficha canalRaiadoAcabamento e corrige a fronteira reta/raio
- `10d9bf9` — Atualiza o DIARIO.md: ficha canalRaiadoDesbaste, primeira remocao de nativas e regra de migracao
- `e4d246d` — Remove do DEFS/ORDEM as operacoes nativas canal e escariado
- `948f631` — Converte o desbaste do canalR em ficha JSON canalRaiadoDesbaste
- `f03b548` — Remove do DIARIO.md a pendencia obsoleta de GitHub/push
- `01a7ab0` — Converte o escareado helicoidal em estrategia JSON pelo metodo de anotacao
- `2a62cd4` — Atualiza o DIARIO.md: interpretador de ponta a ponta e nova direcao de conversao
- `7b78d40` — Liga o interpretador nos dois apps: estrategias.js derivado do JSON + paleta
- `8013a6d` — Atualiza o DIARIO.md: parte 1 do interpretador feita, proximo passo e ligar nos HTMLs
- `cdd942f` — Adiciona o interpretador de estrategias (fichas JSON) ao engine.js
- `ac260c7` — Registra as três formas de criar estratégia e a decisão de que o interpretador não aprende
- `2324a8f` — Registra decisões firmes da estratégia por interpretador e adiciona estrategias_canal.json
- `bcd7fa8` — Adiciona DIARIO.md de continuidade e atualiza CLAUDE.md para o engine.js compartilhado
- `6923fd7` — Extrai o motor de usinagem duplicado de montador_macro_cnc_2.html para engine.js
- `d07b49d` — Extrai o motor de usinagem para engine.js e corrige modal de macro
- `b127cd7` — Adiciona as duas aplicações CNC (Estúdio CNC e Montador Macro)
- `d641abb` — Traduz o CLAUDE.md para português
- `5bc715c` — Add CLAUDE.md with codebase guidance

---

## Onde paramos

### 2026-09-11 — Correção de rótulos compactos e conferência documental

- Leonardo revisou a proposta; a correção de `registrarCustom` está aplicada
  localmente em `engine.js`, ainda sem commit. Com base 100, `N10G0X0`
  e `GOTO10` resultam em `N110G0X0` e `GOTO110`.
- A renumeração preserva comentários e rótulos longos; a substituição de
  parâmetros permanece. Avisos continuam informativos, sem bloquear geração.
- Evidência automatizada anterior do assistente: `revisao-renumeracao/resultado.json`
  registra Node.js v24.19.0, oito casos aprovados e três blocos com seis
  rótulos únicos e saltos correspondentes nos casos ensaiados.
  Os códigos e avisos das seis fichas auditadas mantiveram o SHA-256
  `7c2ab4e60335e6af70924c020575aecaadeffe5eefb8f0f1a42c900850c4de96`.
  As sete fichas locais mantiveram o SHA-256
  `255af6f34aabf9f835d44eaa71c52529bd02e2caf6747865b4dfb21389653039`.
  Hashes individuais e sincronismo JSON/JS constam no mesmo relatório.
- Testes de navegador relatados por Leonardo: nas duas interfaces, rótulo
  compacto e GOTO renumerados, comentários preservados, parâmetros
  substituídos e nenhum erro ou aviso no console. Este item registra o
  relato do operador, não uma nova execução nesta conferência documental.
- Limitação conhecida: um `N110` original permanece e pode colidir com
  o `N110` gerado de `N10`. A correção não elimina todas as colisões.
  O tratamento desse caso será separado, respeitando avisos sem bloqueio.
- Conferência atual do assistente: pasta ativa `C:/Projetos/cnc-suite`,
  branch `master`, HEAD `18da56e21f6422b9d2133371a62db0e3ea2c7e9a`.
  O worktree `C:/Users/leona/.codex/worktrees/3826/cnc-suite` está no mesmo
  commit, com HEAD destacado. Ambos contêm a correção e alterações locais.
  Motor, estratégias JS/JSON de canal e diário conferem entre as cópias
  ao normalizar CRLF/LF; STATUS e resultado.json são idênticos por hash.
  O motor atual equivale a engine.teste.js após normalizar CRLF/LF.
  `git diff --check` passou. Nenhuma cópia foi sobrescrita.
- Alterações anteriores preservadas: estratégias de canal e JS derivado,
  incluindo a sétima ficha, além dos arquivos locais não versionados.
  STATUS.md continua não versionado. Não houve commit ou envio nesta
  sequência; estado remoto e permissão de publicação não foram verificados.
- Os artefatos históricos foram preservados. LEIA-ME.md e resultado.json
  retratam a etapa anterior à aplicação. verificar.cjs exige o motor antigo;
  não foi reexecutado contra o motor corrigido nesta conferência.
- Pendências registradas antes do ensaio final: exportação .NC, preview 3D
  e múltiplos blocos. Os resultados posteriores estão no complemento abaixo.
  A abertura file:// foi proibida por Leonardo e saiu do roteiro autorizado.
  Testes de software e hashes não validam máquina ou usinagem.
- Próximo passo: revisar e aplicar os registros, primeiro DIARIO.md,
  depois STATUS.md. Commit depende de autorização específica e deve
  conter somente a correção e os registros aprovados, sem incluir a
  sétima ficha ou outros arquivos locais. Publicação é uma etapa distinta.

### Complemento — ensaio final pelo assistente, via HTTP

- Testes executados agora pelo assistente, separados do relato anterior de
  Leonardo: cadastro de macro com laço finito, três blocos, geração e preview
  nas duas interfaces em http://localhost:8000. Seis rótulos distintos:
  N110/N120, N210/N220, N310/N320; saltos para N110/N210/N310.
  Comentários preservados; token cx substituído. No Estúdio, X=0/12/24
  pelo posicionamento automático dos blocos; no Montador, X=0/0/0.
- Exportação real pelo botão Baixar .NC nas duas interfaces: arquivos
  encontrados em Downloads e conteúdo integral conferido, com 51 linhas.
  O observador de downloads do navegador expirou no Estúdio, mas o arquivo
  foi salvo e confirmado por leitura. Preview mostrou a trajetória; console
  sem erros/avisos capturados. Isso não valida a trajetória na máquina.
- Motor atual reensaiado em Node.js v24.19.0: nove casos aprovados,
  montagem de três blocos e hashes das seis/sete fichas preservados.
  A colisão com N110 original foi reproduzida e continua fora da correção.
- Evidências locais em revisao-renumeracao/auditoria-final/: resultado-atual.json,
  navegador.json e cópias dos dois NC exportados. Artefatos anteriores intactos.
- Leonardo determinou que todos os testes de navegador usem somente o
  servidor HTTP que iniciou; file:// é proibido, não uma pendência.
- Entrega preparada para auditoria: engine.js, DIARIO.md e STATUS.md.
  Após aprovação desta entrega, aplicar as cópias documentais revisadas,
  conferir preservação das outras alterações e commitar só esses três arquivos.
  A autorização de commit é condicionada à aprovação; não há autorização de push.
  Evidências locais ficam fora do commit proposto. Ainda não houve commit/envio.

O texto abaixo registra o marco anterior da base funcional.

O motor suporta campos condicionais, campos exibidos e **linha condicional
no template**, nos dois apps. A bolsa cônica virou a ficha `bolsaFinal`
(família `estrategias_bolsa.json`) e a nativa foi aposentada. Restam no
motor 3 nativas: **face, furosL e furosC** — as demais viraram ficha.
Candidatas a conversão quando o Leo trouxer os programas anotados.

---

## Para onde vamos

O interpretador, os campos condicionais e os campos exibidos **já
existem** — o salto planejado aqui virou realidade. Próximos alvos
possíveis:

- **Converter as nativas restantes** (face, furosL, furosC) pelo
  método de anotação, quando o Leo trouxer os programas anotados.
- **Sinumerik como camada de saída** (direção de produto abaixo).

A regra de ouro continua: começar pelo que é simples e sólido, e só subir
de nível quando o chão de fábrica pedir.

### Nova direção: converter as operações antigas em fichas JSON

O Leo quer que as operações nativas antigas (bolsa cônica, bolsa retangular,
escariado etc.) também virem estratégia-JSON editável, pra melhorar o percurso
delas sem mexer no motor.

**Fluxo de conversão acordado:**

1. O Leo pega o programa existente da operação.
2. Comenta tudo entre parênteses e marca as linhas que importam.
3. Escreve uma nota de cabeçalho com a filosofia da operação.
4. O Claude (via Claude Code) lê o programa anotado e monta a ficha JSON,
   deixando editável exatamente o que o Leo marcou — sem chutar nada.
5. As notas ficam salvas como banco de conhecimento e referência pra criar
   operações futuras. Esse acervo é um ativo — o "segundo cérebro".

**Padrão de anotação (versão 1 — pode evoluir; se o Leo mandar mudança, a nova
vira base):**

- **Camada 1 — NOTA no cabeçalho da operação**, campos fixos:
  `(=== OPERACAO: nome ===)`, `(PROPOSITO:)`, `(CRITICO:)`, `(EDITAVEL:)`,
  `(FIXO:)`, `(CUIDADOS:)`
- **Camada 2 — MARCAS no fim das linhas que importam**, três marcas apenas:
  - `@ED` = editável (vira campo de input)
  - `@FX` = fixo (trava, não vira campo)
  - `@CR` = crítico (lógica não pode ser tocada)
  - Linha sem marca = mantida como está.

**Regra de migração (seguida na primeira remoção):** operação nativa só sai
do `DEFS`/`ORDEM` quando **TODAS** as suas funções estiverem cobertas por
ficha testada nos dois apps. Foi assim que `canal` e `escariado` saíram
(cobertos por canalAbertoSimples/Expansao e escareadoHelicoidal). O `canalR`
**permanece intacto**: a ficha `canalRaiadoDesbaste` cobre só o desbaste;
enquanto o acabamento não virar ficha, o nativo fica — inclusive pra teste
comparativo lado a lado.

### Direção futura de produto: suporte a Siemens Sinumerik

A arquitetura "estratégia é dado" deixa o caminho aberto: **as fichas JSON
não mudam**. O que entra é um **segundo interpretador de SAÍDA**, que lê
as mesmas fichas e emite o dialeto Sinumerik — variáveis `R` no lugar de
`#`, `IF/GOTOF/GOTOB` no lugar do `IF/GOTO` Fanuc, cabeçalho e funções
próprios. O miolo de movimento (G0/G1/G2/G3) é quase comum entre os dois
mundos; **a dificuldade real está na lógica paramétrica**. Regra: não
reescrever estratégias — só a camada de saída.

---

## Pendências (não urgentes)

- Tela 2D do estúdio: blocos de estratégia aparecem como marcador genérico,
  sem contorno — melhoria visual futura (ficou mais visível agora que os
  canais todos viraram ficha).
- Próximos passos possíveis: botão "Importar estratégias .json" (FileReader);
  automatizar a regeneração do `estrategias.js` a partir do `.json`.

---

## As três formas de criar estratégia

Toda estratégia, não importa como nasce, passa pela **mesma engrenagem: o
interpretador**. O que muda é só quanta liberdade o usuário quer. Da mais simples
à mais livre:

1. **Só números.** Pega uma receita-JSON pronta e troca as medidas (largura,
   profundidade, avanço). O percurso continua o mesmo — muda o tamanho, não o caminho.
2. **Ajustar o percurso ponto a ponto.** Edita o template do JSON — a sequência de
   movimentos em si — ou monta um novo do zero. Aqui o usuário mexe no caminho, não
   só nas medidas.
3. **Colar um programa pronto e validado.** O usuário joga um G-code que já roda bem
   na máquina e amarra os parâmetros dele às regras de interpretação. É o "cadastrar
   macro" que já existe no `engine.js`, agora crescido e organizado.

**Ponto-chave:** o interpretador é a **peça única** que une as três formas. A mesma
engrenagem que lê a receita-JSON é a que lê o programa colado — não são três motores,
é um só com três portas de entrada. A forma 3 é a **evolução do modal "cadastrar
macro"** que já está no `engine.js`, não uma coisa nova jogada por cima.

---

## Decisões firmes e o que NÃO fazer

Esta seção é trave de segurança. Se numa sessão futura bater a tentação de "resolver
rápido" contrariando o que está aqui, PARE — essas escolhas já foram feitas e testadas
no pensamento. Reabrir sem motivo forte é retrabalho.

### 1. A estratégia é lida por um INTERPRETADOR, em tempo de execução

A estratégia de usinagem **deve** ser processada por um interpretador que lê o JSON
na hora de gerar o código. O fluxo é sempre este:

1. **Ler os inputs** (os parâmetros que o usuário informou).
2. **Calcular as derivadas** (as contas que saem desses inputs).
3. **Checar os avisos** (validações).
4. **Resolver os placeholders do template** (trocar os campos pelos valores).
5. **Emitir as linhas** de G-code.

**O JSON é a fonte da verdade.** O motor obedece ao JSON, não o contrário.

### 2. PROIBIDO hardcodar estratégia como operação fixa no DEFS

**Não** transformar a estratégia em código JavaScript fixo dentro do `DEFS`. Pegar um
template que está no JSON e "traduzir" pra uma função `gerar()` escrita à mão em JS
**derrota o objetivo do projeto**. O projeto existe pra que o **usuário edite
estratégias sem programar** — se a lógica volta pro JS, ele fica refém do programador
de novo.

Isto é um caminho **já rejeitado**. Se aparecer como "atalho", é armadilha: parece
mais rápido hoje e mata a ideia toda amanhã.

### 3. O que "Nível 1" realmente quer dizer

"Nível 1" = **padrões que o motor conhece, com parâmetros ajustáveis VIA JSON
interpretado**. Os padrões são conhecidos; os números são editáveis pelo usuário
através do JSON que o interpretador lê. **Nunca** via código hardcoded. Padrão
conhecido ≠ padrão engessado em JS.

### 4. Preserve o `estrategias_canal.json`

O arquivo `estrategias_canal.json` já contém a **matemática validada de dois canais**
e serve de **formato de referência do interpretador** — é o molde de como um JSON de
estratégia deve ser. **Preserve-o.** Não apague, não sobrescreva sem necessidade real;
use como base e espelho ao construir o interpretador.

*(Atualização: o interpretador **já existe e evoluiu** — campos condicionais
e exibidos inclusos. O arquivo segue sendo o formato de referência e a
matemática validada dos canais; a regra de preservação continua valendo
igual.)*

### 5. O interpretador NÃO aprende — a biblioteca é que cresce

O interpretador **executa a ficha, sempre igual**. Dar mais estratégias a ele **não**
o deixa "mais esperto" — ele não ganha inteligência, só segue o JSON que recebe.

O que cresce é a **biblioteca de estratégias validadas** do Leo. Cada estratégia que
funciona vira um ativo: dá pra **reusar**, vira **conhecimento estruturado e buscável**,
e mais tarde serve de **base para uma IA CONSULTAR** (não treinar).

Não confundir os dois:

- **"A biblioteca cresce"** → sim, é o objetivo.
- **"O interpretador aprende sozinho"** → não. Isso seria treinar um modelo, e está
  **fora do escopo**.

### 6. Conversão de operação antiga é UMA A UMA, guiada pelas anotações do Leo

REJEITADA a ideia de uma "inteligência que adivinha sozinha o que é editável".
Adivinhar exige o julgamento de chão de fábrica do Leo; automatizar isso
terceirizaria a parte mais valiosa do processo e geraria fichas que precisariam
ser revisadas uma a uma de qualquer forma — com risco de erro escondido.
**O julgamento é do Leo; a tradução para JSON é do Claude.**

### 7. Campo exibido é uma "saida", separado de input

Campo exibido (mostrador readonly de uma derivada, pra conferência) vive na
seção `"saidas"` da ficha — **nunca** marcar um input como "só exibir".
Input tem valor próprio, entra no bloco e no projeto salvo; saída é só um
mostrador do `ctx`. Misturar as duas naturezas foi um caminho considerado
e **rejeitado** na revisão do formato.

### 8. Mudança no motor exige prova de não-regressão por hash

Toda mudança no `engine.js` deve provar não-regressão: gerar o código (e
avisos) das fichas atuais com defaults **antes e depois** e comparar por
hash — **idêntico byte a byte**. Foi assim nos passos 1–4 dos campos
condicionais e é assim que fica. Diferença esperada tem que ser explicável
linha a linha (como na correção de fronteira do canal raiado).

### 9. Campo sempre calculável por segurança vira DERIVADA, não input

Quando um valor pode ser calculado com segurança a partir dos outros campos
e da ferramenta ativa (ex.: o X de recuo da bolsa final,
`xRecuo = xFinRef - (20 + diam/2)`), ele **deve** ser derivada automática —
nunca input. O operador não digita: **confere** pelo mostrador da seção
`"saidas"` (Conferência). Digitar o que a ficha sabe calcular é convite a
erro de dedo — e, no caso do recuo, a fresa dentro da parede.

## 2026-09-12 — Aviso de colisão de rótulos

Proposta preparada em revisao-colisoes, sem alterar os arquivos originais.
O motor passa a informar rótulos N repetidos dentro de uma operação ou entre
operações, usando as linhas geradas e a base real de cada bloco. O aviso
indica bloco e linha dentro do corpo da operação, não a linha global do NC.
Não corrige rótulos automaticamente nem bloqueia a geração.

Testes do assistente: dez cenários mais colisão com operação nativa;
programas preservados nos casos comparados; códigos e avisos das sete fichas
preservados, SHA-256 255af6f34aabf9f835d44eaa71c52529bd02e2caf6747865b4dfb21389653039.
Sintaxe e aplicabilidade do diff conferidas. Resultado local: revisao-colisoes/resultado.json.

Navegador via HTTP: Estúdio exibiu aviso e manteve o código gerado no ensaio
anterior desta proposta. Montador conferido em 12/09 após Leonardo reabrir
o servidor: colisão interna, atualização após reordenar para colisão entre
blocos, desaparecimento do aviso ao remover a operação conflitante e geração
disponível. Nenhum erro/aviso de console capturado nos ensaios concluídos.
A tentativa com servidor indisponível não foi considerada teste aprovado.

Limites: não verifica destinos GOTO ausentes, subprogramas ou sintaxe completa.
Executa o gerador de cada bloco mais uma vez ao coletar avisos; não executa NC.
Nenhuma validação de máquina. file:// continua proibido.

Após revisão e aprovação: aplicar engine.js e estes registros, conferir
somente os arquivos aprovados e commitar. Envio ao GitHub depende de nova
autorização. Estratégias locais e artefatos de revisão ficam fora do commit.

## 2026-09-12 — Aviso de passo Z não positivo no canal aberto simples

Proposta em revisao-ap-zero: acrescentar à ficha canalAbertoSimples a regra
passoZ <= 0, com aviso para ajustar o AP porque o laço não avança até a
profundidade. Fonte alterada em cópia: estrategias_canal.json. estrategias.js
regenerado a partir dos objetos das famílias, com união conferida.
Nenhum template, movimento, valor padrão ou regra do motor foi alterado.
A geração continua disponível, conforme a política de avisos sem bloqueio.

Testes do assistente: oito casos com zero, negativo e positivos, incluindo
valores em texto. Programas idênticos antes/depois em todos os casos;
somente entradas não positivas recebem o aviso adicional. Códigos e avisos
dos defaults das sete fichas preservados, SHA-256:
255af6f34aabf9f835d44eaa71c52529bd02e2caf6747865b4dfb21389653039.

Navegador via HTTP nas duas cópias: AP=0 exibiu o aviso e manteve programa
de 38 linhas gerado. No Montador, aviso desapareceu ao voltar para AP=1.
Nenhum erro/aviso de console capturado nos ensaios. Os novos testes foram
executados pelo assistente, não relatados pelo operador. Sem teste de máquina.

Diffs e evidências em revisao-ap-zero. Após aprovação, aplicar e commitar
somente estrategias_canal.json, estrategias.js, DIARIO.md e STATUS.md.
Push separado. Avisos do escareado e demais achados permanecem para outra entrega.

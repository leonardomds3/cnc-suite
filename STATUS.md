# Estado atual — CNC Suite

Atualizado em: 2026-09-11
Base auditada: 18da56e21f6422b9d2133371a62db0e3ea2c7e9a (master)
Etapa: correção compacta aplicada localmente; registros em revisão, sem commit.

## Direção atual — 12/09/2026

Interface ativa: Montador; desenvolvimento e testes de navegador somente nele.
Estúdio preservado como conceito, fora da rotina de testes. Motor e JSONs mantidos.
Conceito visual recebido: docs/referencias/conceito-montador-macro-b.jpg.
Especificação visual e seis etapas detalhadas no plano profissional em docs/.
A imagem define a direção visual, não regras de usinagem nem funções já prontas.

## Antes de trabalhar

Ler CLAUDE.md e DIARIO.md. Este arquivo resume o estado e não substitui as regras.
Preservar fichas JSON, programas anotados e as duas interfaces.
Mudanças seguem diff separado, revisão do Leonardo e um arquivo por vez.
Navegador: somente http://localhost:8000, servidor iniciado por Leonardo
com py -m http.server 8000 em C:/Projetos/cnc-suite. file:// é proibido.

## Base disponível

- Motor compartilhado pelas duas interfaces HTML.
- Nativas: face, furosL, furosC.
- Seis estratégias auditadas; sétima ficha local canalRaiadoConcentrico fora desta entrega.
- Campos condicionais, derivadas, conferência e exportação .NC.
- Projetos salvos e abertos como arquivos JSON.
- Preview limitado de volumes e trajetórias; não é validação de máquina.

## Auditoria desta versão

- Sintaxe dos scripts internos dos dois HTMLs verificada em Node.js.
- Seis fichas executadas e sincronismo JSON/JS confirmado.
- Navegador e máquina não testados nesta auditoria.
- AP zero: laço sem progresso reproduzido; avisos ausentes em dois casos.
- Bolsa com Z inicial não zero: X final informado difere do calculado.
- Macro compacta: defeito reproduzido na auditoria e corrigido localmente depois.
- Divisão por zero retorna zero no avaliador de fichas.
- Abertura filtra tipos desconhecidos; precisa evitar perda silenciosa.

## Decisões pendentes

- Conciliar avisos informativos com tratamento de erros críticos.
- Definir referência do X inicial da bolsa quando Z inicial não é zero.
- Definir prioridade da evolução 2D após estabilizar a base.

## Correção local e evidências

- registrarCustom: N10G0X0 + GOTO10, base 100, gera N110G0X0 + GOTO110.
- Testes anteriores do assistente: oito casos, três blocos e hashes dos
  códigos/avisos das seis fichas auditadas e das sete locais preservados.
  Evidência: revisao-renumeracao/resultado.json; detalhes no DIARIO.md.
- Leonardo relata teste nas duas interfaces: renumeração, comentários,
  parâmetros e console sem erros/avisos. Não é nova execução documental.
- Limitação: N110 original pode colidir com N110 gerado. Tratar separadamente.
- Ensaio posterior do assistente via HTTP: três blocos, seis rótulos distintos,
  comentários e parâmetros conferidos nas duas interfaces; preview visível
  e nenhum erro/aviso no console. Dois NC exportados e conferidos integralmente.
- Motor atual: nove casos automatizados aprovados e hashes preservados.
  Evidências locais: revisao-renumeracao/auditoria-final/.
- file:// foi excluído do roteiro por proibição expressa de Leonardo.
- Nenhum teste de máquina. Avisos continuam informativos, sem bloqueio.

## Estado local e próxima etapa

Pasta ativa: C:/Projetos/cnc-suite, master, no commit auditado acima.
Worktree 3826: mesmo HEAD, destacado; correção presente nas duas cópias.
Motor atual equivale à cópia testada após normalizar CRLF/LF; diff --check passou.
Árvores locais têm alterações anteriores preservadas; STATUS.md não versionado.
Nenhum commit ou envio nesta sequência; estado remoto não conferido.

Revisar registros em diffs separados: primeiro DIARIO.md, depois STATUS.md.
Leonardo autorizou o commit condicionado à aprovação da entrega final.
Após aprovação, commitar somente engine.js, DIARIO.md e STATUS.md,
excluindo a sétima ficha, evidências locais e outros arquivos não relacionados.
Publicação exige conferência remota e autorização em etapa distinta.
Os artefatos de teste anteriores permanecem históricos; verificar.cjs espera
engine.js anterior à correção e não deve ser reexecutado diretamente no atual.

## Entrega em revisão — 12/09/2026

Aviso informativo para rótulos N duplicados: proposta em revisao-colisoes/engine.diff.
Detecta colisões internas e entre blocos, sem mudar o programa ou bloquear geração.
Dez cenários automatizados e colisão com nativa aprovados; hashes das sete fichas
preservados. Estúdio e Montador conferidos via HTTP; reordenação e retirada do
aviso verificadas no Montador. Detalhes e limites no registro de 12/09 do DIARIO.
Entrega aguardando aprovação para aplicação e commit de engine.js, DIARIO.md
e STATUS.md. Sem autorização de push. Outros arquivos locais preservados.

## Entrega em revisão — AP zero, 12/09/2026

Canal aberto simples: proposta de aviso para passoZ <= 0, sem bloquear
geração ou alterar o template. JSON de canal é a fonte; JS derivado regenerado.
Oito casos automatizados aprovados; código preservado; defaults das sete
fichas mantêm o hash anterior. Aviso e geração conferidos nas duas interfaces
via HTTP. No Montador, retorno a AP=1 removeu o aviso. Sem validação de máquina.
Revisar revisao-ap-zero/LEIA-ME.md e os quatro diffs. Aplicação e commit
aguardam aprovação; envio ao GitHub depende de autorização separada.
Escareado helicoidal e demais avisos ausentes continuam fora desta entrega.

## Entrega em revisão — AP do escareado, 12/09/2026

Aviso para ap <= 0 no escareado helicoidal, sem bloqueio e sem alterar template.
Fonte JSON de escareado; JS derivado regenerado. 24 casos nos três modos
de cálculo aprovados; código e defaults das sete fichas preservados.
Montador conferido via HTTP com AP zero, negativo e retorno a 0.1.
Estúdio fora dos testes. Sem validação de máquina.
Revisar revisao-ap-escareado/LEIA-ME.md e quatro diffs. Aplicação e commit
aguardam aprovação; publicação no GitHub depende de autorização separada.


## Proposta de layout do Montador — 12/09/2026

Primeira entrega visual em revisão, baseada em docs/referencias/conceito-montador-macro-b.jpg.
Menu persistente com seis etapas, identificação do projeto, azul-marinho e ciano.
Planejamento: operações à esquerda, prévia central e parâmetros da seleção à direita.
Programa: código/exportação à esquerda e tabela dos parâmetros atuais por operação à direita.
Projetos reutiliza salvar/abrir/limpar montagem JSON; Configurações reúne os campos gerais.
Simulação reutiliza a prévia existente. Desenho 2D e vínculos são identificados como planejados.
Não é ainda reprodução funcional completa da imagem: biblioteca, DXF, geometria, vínculos,
remoção de material, reprodução, estimativas, revisões e ficha de preparação continuam pendentes.
Revisão 2: colunas contínuas com divisórias, altura da janela, rolagem interna,
propriedades em linhas, operações compactas e ações agrupadas na base do painel.
Numeração visual e cores de sintaxe implementadas sem alterar texto do programa.
Tabela de variáveis # vinculada ao programa permanece pendente; tabela atual mostra entradas.
Motor e estratégias copiados sem mudança; somente o HTML proposto muda no aplicativo.
34 verificações Node/jsdom aprovadas, incluindo código/avisos idênticos nas dez operações
(três nativas e sete fichas), seleção, edição condicional, duplicação, reordenação e navegação.
Montador via HTTP: AP zero/positivo, campos condicionais, telas Programa/Planejamento,
troca de prévia entre Planejamento/Simulação e vista TOPO conferidos pelo Codex.
Visual desktop 1440x900 e navegação estreita conferidos. Nenhum teste no Estúdio.
Um erro de inicialização durante construção foi corrigido; sem novos erros no ciclo final.
Downloads/reabertura de arquivos não foram repetidos no navegador; validação de máquina não realizada.
Originais preservados. Aplicação e commit dependem da auditoria de Leonardo desta proposta.
Após aprovação e commit, apagar a pasta revisao-layout-montador, conforme regra do usuário.


## Desenho 2D — 13/09/2026, proposta em revisão

Retângulo e matriz de furos vinculados implementados em cópia. Confirmação atualiza
fileiras nativas furosL; parâmetros de corte existentes são preservados.
Desenho salvo/reaberto junto com montagem JSON; operações independentes preservadas.
34 verificações anteriores e 22 de desenho aprovadas. Navegador: 160 -> 200 mm
recalculou centros X -60/0/60 -> -80/0/80; Y -40/40 preservado. Sem erros no console.
Vínculos completos estão no aplicativo; Macro B exporta laços e coordenadas calculadas.
Não há ainda contorno usinado, DXF ou seleção técnica automática de corte.
Esta seção substitui a indicação anterior de que Desenho/Parâmetros são apenas planejados.
Layout aceito temporariamente; desenho aguarda auditoria. Sem commit/envio.


# Desenho livre 2D — proposta para auditoria, 13/09/2026

Implementado apenas na cópia do Montador. Esta etapa substitui a indicação anterior
de que o editor de formas livres ainda estava inteiramente pendente.

## Como conferir

1. Abra Desenho 2D > Desenho livre pelo servidor HTTP.
2. Reta: clique nos dois extremos. Retângulo: clique em dois cantos opostos.
3. Círculo: clique no centro e em um ponto do raio.
4. Arco: clique no centro, no início e na direção final; sentido anti-horário.
5. Selecione uma entidade na lista ou no desenho e edite coordenadas/medidas
   nas propriedades. Use Aplicar propriedades para confirmar.
6. Em Mover, arraste o contorno. Excluir, desfazer e refazer estão disponíveis.
7. Grade e pontos permitem encaixes; a roda amplia/reduz, Deslocar vista move
   a vista e Ajustar vista enquadra as entidades. Esc cancela a construção.
8. Vincular medida principal iguala comprimento de reta, largura de retângulo
   ou raio ao valor principal de outra entidade. Ciclos são rejeitados.
9. Salvar/abrir montagem JSON inclui as entidades e vínculos do desenho livre.
10. Padrão de furos vinculado mantém a geração de fileiras já implementada.

## Escopo e limites

Editor geométrico inicial: retas, retângulos, círculos e arcos, até 500 entidades.
As cotas exibidas são anotações de medidas; não há solucionador geral de restrições.
Vínculos disponíveis são de igualdade da medida principal, não tangência,
coincidência, paralelismo ou perpendicularidade. Excluir uma referência conserva
as medidas atuais das dependentes e remove o vínculo direto.

Desenho livre ainda não gera percurso nem código CNC. Não há reconhecimento de
contorno fechado, compensação de ferramenta, entradas/saídas, desbaste ou DXF.
A integração CNC atual continua restrita ao padrão retangular de furos.
Não foram introduzidas recomendações automáticas de ferramenta ou corte.

Próxima etapa: validar e organizar contornos conectados; depois definir operação,
lado de usinagem, ferramenta e percurso antes de integrar o contorno ao Macro B.

## Evidências executadas pelo Codex

- 34 verificações anteriores de interface/regressão aprovadas (resultado.json).
- 22 verificações do padrão de furos aprovadas (resultado-desenho.json).
- 23 verificações do CAD aprovadas (resultado-cad.json): formas, propriedades,
  vínculos/ciclos, remoção, histórico, serialização/restauração, encaixes,
  eventos de criação/movimento, zoom/pan e preservação do programa existente.
- Os eventos de ponteiro automatizados usam transformação SVG simulada no jsdom.
- Navegador real via HTTP: quatro formas criadas com cliques; círculo arrastado
  de Y=-5 para Y=10, mantendo X=-30 e raio 15. Sem erros capturados no console.
- Download e reabertura de arquivo não repetidos no navegador nesta etapa;
  persistência do CAD validada por serialização/restauração automatizada.
- Nenhum teste de máquina. Nenhum teste no Estúdio.

Total: 79 verificações automatizadas aprovadas. Originais preservados, sem commit
ou envio. Após auditoria, aplicação e commit autorizados, apagar as cópias geradas.


## Modularização do Montador — 13-14/09/2026, concluída

As cinco etapas de INSTRUCAO-MODULARIZACAO.md foram aplicadas e commitadas, uma por
vez com diff próprio: extração de `ui.css` compartilhado, achatamento dos wrappers
empilhados (`refresh`, `renderPilha`, `salvarDesenho2D`/`carregarDesenho2D` — cada um
passou a ter uma única definição), extração de `cad2d.js`, extração de `desenho2d.js`
e reescrita do `<body>` do Montador já no layout final de shell/etapas, sem a
cirurgia de DOM em runtime que existia antes. `engine.js` não foi tocado.
Commits: 91e8fa6, 20a683c, 3e56097, 3a6d74c, d0ae556.
G-code comparado (antes.NC/depois.NC) idêntico a cada etapa; console sem erro/aviso.
Nova estrutura de arquivos documentada em CLAUDE.md.

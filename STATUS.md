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

# Auditoria inicial — CNC Suite

Data: 08/09/2026 · Etapa 0 · Revisão 1

Repositório: https://github.com/leonardomds3/cnc-suite

Referência examinada: `master`, commit `18da56e21f6422b9d2133371a62db0e3ea2c7e9a`.

## Resultado para Leonardo

Há uma base aproveitável. O projeto já gera Macro B a partir de operações parametrizadas. Não recomendo recomeçar nem trocar de tecnologia agora.

O próximo marco deve consolidar a confiabilidade dessa base antes de construir o editor de desenhos e a interface conceitual completa.

Esta auditoria é de documentação, código e execução do motor em Node.js. Não houve teste visual no navegador, teste de máquina nem certificação de programas. Os testes no navegador citados pelo diário são históricos, não verificações repetidas nesta sessão.

## 1. O que foi examinado

- Árvore completa: 11 arquivos versionados; nenhuma suíte de testes ou configuração de build presente.
- Leitura integral de CLAUDE.md e DIARIO.md.
- Leitura integral de engine.js; leitura das fichas e dos programas anotados.
- Inspeção direcionada das duas interfaces: estrutura de funções, scripts, desenho 2D, preview, geração, exportação e persistência.
- Verificação sintática dos scripts internos dos dois HTMLs.
- Execução do motor e das seis fichas, comparação dos JSONs com estrategias.js e reprodução de casos de borda.
- Cópia local obtida pelo Git; árvore de trabalho permaneceu limpa. Nenhuma alteração enviada ao GitHub.

## 2. Inventário e estado real

| Componente | Estado observado | Limite |
| --- | --- | --- |
| Estúdio CNC | Interface mobile-first com projeto 2D, 3D e código. | Inspeção de código; usabilidade ainda não repetida no navegador. |
| Montador Macro | Interface desktop por pilha de operações. | Compartilha o motor, mas mantém código próprio de interface. |
| engine.js | Motor executado em Node; três operações nativas e seis estratégias registradas. | Geração e interpretador ainda apresentam casos de borda. |
| Fichas JSON | Quatro canais, um escareado, uma bolsa. | Entradas inválidas não impedem exportação. |
| estrategias.js | Conteúdo das estratégias idêntico à união dos três JSONs. | Regeneração ainda manual. |
| Projetos | Salvar e abrir JSON implementado nos dois HTMLs. | Sem versão do formato; operações desconhecidas são filtradas ao abrir. |
| Preview 3D | Volumes aproximados para nativas e trajetórias para fichas/macros. | Não é remoção volumétrica real nem verificação completa de colisões. |
| Macros personalizadas | Cadastro com parâmetros, variáveis e renumeração. | Reproduzido defeito de renumeração em linha compacta. |
| Programas anotados | Dois arquivos preservados como referência de conversão. | Regras @ED/@FX/@CR devem continuar respeitadas. |
| Documentação | Regras e histórico detalhados em dois Markdown. | Há passagens antigas contraditórias e faltam status resumido e backlog. |

## 3. Comparação com as telas aprovadas

| Visão aprovada | Situação atual |
| --- | --- |
| Biblioteca de projetos e revisões | Downloads de JSON existem; catálogo e histórico de revisões no app não encontrados. |
| Editor de retas e arcos com cotas | A vista 2D posiciona operações; não é um editor CAD geral. |
| Contornos das estratégias na tela | Fichas aparecem como marcador ou chip genérico. |
| Medidas vinculadas | Derivadas por ficha existem; vínculos geométricos gerais ainda não. |
| Planejamento | Operações ordenadas, ferramenta por bloco e parâmetros já existem. |
| Simulação completa | Há preview limitado; remoção de material e fixação requerem desenvolvimento. |
| Geração e exportação Macro B | Já existem e são o principal ativo atual. |
| Importar DXF/PDF/imagem | Não encontrado; importação atual de .NC serve ao preview. |
| Perfis de comando | Fanuc orienta o motor; Sinumerik é direção futura documentada. |
| Ficha de preparação | Não encontrada como entrega própria. |

## 4. Evidências dos testes

Ambiente: Node.js v24.19.0. Motor carregado em contexto isolado, sem alteração dos arquivos. Configuração da análise das fichas: ferramenta de 10 mm, Z de segurança 25 mm, base de rótulos 100 e inputs padrão. Os segmentos incluem o posicionamento inicial adicionado ao ensaio.

| Ficha | Linhas emitidas | Resultado do preview pelo interpretador |
| --- | ---: | --- |
| canalAbertoSimples | 20 | 64 segmentos; sem aviso do interpretador. |
| canalAbertoExpansao | 29 | 204 segmentos; sem aviso do interpretador. |
| canalRaiadoDesbaste | 43 | Limite de execução atingido; defaults de AP e F são zero e têm avisos. |
| canalRaiadoAcabamento | 35 | Limite de execução atingido; defaults de AP e F são zero e têm avisos. |
| escareadoHelicoidal | 18 | 4.384 segmentos; sem aviso do interpretador. |
| bolsaFinal | 28 | 451 segmentos; sem aviso do interpretador. |

Ausência de aviso não prova correção de usinagem. A simulação usa o interpretador do próprio projeto e não constitui referência independente.

SHA-256 da linha de base dos códigos e avisos das seis fichas: `7c2ab4e60335e6af70924c020575aecaadeffe5eefb8f0f1a42c900850c4de96`.

Procedimento do hash: carregar engine.js e estrategias.js; percorrer Object.entries(ESTRATEGIAS); formar inputs com os defaults; chamar interpretarEstrategia com `{seg:25}`, nb=100, diam=10; serializar com JSON.stringify a lista de objetos `{id,linhas,avisos}`; calcular SHA-256 UTF-8 sem quebra adicional. Esse hash descreve a versão atual, não uma prova de equivalência antes/depois de correção.

## 5. Problemas reproduzidos e pendências

### A. Passo Z zero — prioridade alta

No canalAbertoSimples, passoZ=0, e no escareadoHelicoidal, ap=0: a ficha emite código sem aviso específico e execNC atinge o limite de execução. A rotina geral de avisos também não inclui verificação de AP zero para esses casos. Os canais raiados avisam, mas igualmente emitem código com defaults zerados.

Local: fichas JSON, coletarWarns e geração/exportação nos HTMLs.

Proposta: registrar primeiro os casos; acrescentar avisos ausentes como mudança compatível com a política atual. Separadamente, decidir se erros críticos devem impedir exportação. Não mudar silenciosamente a regra atual de avisos informativos.

### B. Bolsa com Z inicial diferente de zero — prioridade alta

Entrada: calcpor=2, raioInt=100, xFin=92, zIni=10, zFin=28 e ferramenta 10.

Resultado: ângulo 23,9624889746 graus, mas xFinRef=87,5555555556, diferente de xFin=92. A expressão do ângulo usa a diferença entre profundidades; a expressão de xFinRef usa zFin absoluto. O template também utiliza Z absoluto no cálculo do X.

Local: estrategias_bolsa.json, derivadas e template.

A inconsistência entre o valor informado e o exibido foi reproduzida. A correção depende de esclarecer se raioInt é X na origem Z=0 ou X em zIni. As anotações do operador devem guiar essa decisão; não basta trocar uma fórmula isolada.

### C. Renumeração de macro compacta — prioridade alta

Entrada personalizada: `N10G0X0` seguida por `GOTO10`.

Saída com nb=100: `N10G0X0` seguida por `GOTO110`.

O rótulo não mudou, mas o salto mudou. A expressão regular exige fronteira de palavra depois dos dígitos e falha quando o comando G vem colado. O exemplo `N10#1=1` é renumerado corretamente.

Local: registrarCustom, engine.js.

Correção delimitada: reconhecer rótulos na posição apropriada mesmo em linhas compactas, preservando comentários e verificando múltiplos blocos. É uma boa primeira correção funcional por ter entrada, saída e aceitação inequívocas.

### D. Divisão por zero vira zero — prioridade alta

`avaliarExpr("10/0", {})` devolveu 0. O interpretador NC possui comportamento equivalente no código.

Isso pode mascarar uma geometria indefinida. Uma futura mudança deve diferenciar erro de cálculo de valor válido e conciliar o tratamento de avisos/exportação antes de alterar a semântica.

### E. Abrir projeto pode omitir operações — prioridade alta

Os dois HTMLs usam `.filter(b=>DEFS[b.tipo])` ao carregar. Um tipo desconhecido é descartado sem lista de operações removidas. Esse comportamento merece atenção para projetos antigos contendo nativas aposentadas.

Constatação por leitura de código; não houve ensaio de abertura pelo navegador. O carregamento também altera parte do estado antes de validar o conjunto inteiro.

### F. Limites do preview — prioridade média

G41/G42, compensações de comprimento, planos G18/G19 e outros estados não são modelados como na máquina. Ciclos de furação são simplificados; G53 fica fora da visualização. As funções volume das fichas usam segmentos e não expõem os avisos de execNC ao usuário nesse caminho.

O preview pode ser útil, mas sua aparência não deve sugerir cobertura que o interpretador não possui.

## 6. Conciliação com o plano anterior

1. Preservar a estratégia como dado JSON. O editor geométrico futuro deve alimentar esse modelo, sem transformar cada estratégia em uma operação fixa no JavaScript.
2. Preservar estrategias_canal.json e os programas anotados.
3. Manter os dois HTMLs até existir uma decisão explícita de consolidação.
4. Preservar abertura por duplo clique; o 3D depende de CDN hoje. Necessidade de funcionamento totalmente offline ainda deve ser decidida.
5. O plano inicial propôs bloquear entradas inválidas, mas a regra atual exige avisos sem bloqueio. Registrar a divergência e decidir por categoria de erro antes de implementar.
6. A bolsa retangular e a circular foram retiradas por decisão de escopo. Não reintroduzi-las só porque uma imagem conceitual mostrou bolsas genéricas.
7. O cabeçalho global declara zero no centro/face superior; a bolsa documenta referência própria. Origens por operação precisam de especificação antes do editor geral.
8. Sinumerik permanece no horizonte. As fichas atuais contêm templates Fanuc; a arquitetura de tradução precisa ser comprovada antes de prometer que basta trocar nomes de variáveis.
9. O diário contém um trecho dizendo que canalR permanece, embora o histórico posterior registre sua retirada. Atualizar essa passagem em uma futura revisão documental, preservando o histórico.
10. Não substituir o diário por novos documentos duplicados. Adicionar primeiro um STATUS curto que encaminhe às fontes existentes.

## 7. Sequência recomendada a partir deste repositório

| Ordem | Entrega | Critério de conclusão |
| --- | --- | --- |
| 1 | STATUS.md proposto abaixo | Revisado e incorporado sem alterar o motor. |
| 2 | Correção de rótulos compactos | N10G0X0 e GOTO10 tornam-se N110G0X0 e GOTO110; dois blocos não colidem; hashes das fichas preservados; conferir ambos os apps. |
| 3 | Casos de AP zero e cálculos inválidos | Avisos consistentes e política de erro definida; diferenças esperadas registradas. |
| 4 | Semântica da bolsa com Z inicial | Resultado informado e calculado convergem nos casos aprovados pelo Leonardo. |
| 5 | Carregamento de projetos | Nenhum bloco desaparece silenciosamente; arquivo inválido preserva o projeto anterior. |
| 6 | Regeneração das estratégias | Um comando reproduz estrategias.js a partir das famílias, com verificação automática. |
| 7 | Contornos 2D das fichas | Uma família passa de marcador genérico a desenho fiel aos parâmetros. |
| 8 | Editor paramétrico e importação DXF | Geometria confirmada alimenta estratégias, com casos conhecidos. |
| 9 | Interface completa e recursos avançados | Biblioteca, revisões, simulação volumétrica, PDF/imagem e ficha de preparação por módulos. |

A etapa 2 é a primeira correção funcional recomendada. O editor 2D será construído sobre a base estabilizada. Não há estimativa confiável de prazo total ou tokens para todos os recursos nesta fase.

## 8. Primeira mudança concreta para revisão

O DIARIO.md exige diff separado, revisão do Leonardo antes de aplicar e um arquivo por vez. Por isso esta entrega não aplica mudanças ao repositório. Abaixo está o diff proposto para adicionar apenas STATUS.md. A inclusão do documento não altera a regra de avisos nem autoriza correções de geometria.

```diff
diff --git a/STATUS.md b/STATUS.md
new file mode 100644
--- /dev/null
+++ b/STATUS.md
@@ -0,0 +1,43 @@
+# Estado atual — CNC Suite
+
+Atualizado em: 2026-09-08
+Base auditada: 18da56e21f6422b9d2133371a62db0e3ea2c7e9a (master)
+Etapa: auditoria inicial concluída; estabilização proposta.
+
+## Antes de trabalhar
+
+Ler CLAUDE.md e DIARIO.md. Este arquivo resume o estado e não substitui as regras.
+Preservar fichas JSON, programas anotados e as duas interfaces.
+Mudanças seguem diff separado, revisão do Leonardo e um arquivo por vez.
+
+## Base disponível
+
+- Motor compartilhado pelas duas interfaces HTML.
+- Nativas: face, furosL, furosC.
+- Seis estratégias em JSON, sincronizadas com estrategias.js.
+- Campos condicionais, derivadas, conferência e exportação .NC.
+- Projetos salvos e abertos como arquivos JSON.
+- Preview limitado de volumes e trajetórias; não é validação de máquina.
+
+## Auditoria desta versão
+
+- Sintaxe dos scripts internos dos dois HTMLs verificada em Node.js.
+- Seis fichas executadas e sincronismo JSON/JS confirmado.
+- Navegador e máquina não testados nesta auditoria.
+- AP zero: laço sem progresso reproduzido; avisos ausentes em dois casos.
+- Bolsa com Z inicial não zero: X final informado difere do calculado.
+- Macro N10G0X0 / GOTO10: renumeração divergente reproduzida.
+- Divisão por zero retorna zero no avaliador de fichas.
+- Abertura filtra tipos desconhecidos; precisa evitar perda silenciosa.
+
+## Decisões pendentes
+
+- Conciliar avisos informativos com tratamento de erros críticos.
+- Definir referência do X inicial da bolsa quando Z inicial não é zero.
+- Definir prioridade da evolução 2D após estabilizar a base.
+
+## Próxima entrega funcional proposta
+
+Corrigir rótulos compactos em registrarCustom, mediante diff revisado.
+Aceitação: N10G0X0 + GOTO10 com base 100 resulta em N110G0X0 + GOTO110.
+Conferir vários blocos, preservar hashes das seis fichas e testar nos dois apps.
```

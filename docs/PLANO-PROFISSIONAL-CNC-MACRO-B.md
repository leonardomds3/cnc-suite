# Plano de desenvolvimento — App CNC Macro B

Versão: 0.1 · Data: 08/09/2026 · Responsável pelo produto: Leonardo

## 1. Comece por aqui

Você define como o app deve funcionar na oficina. A IA organiza a documentação, implementa e testa. Você não precisa aprender programação para aprovar uma tela ou conferir se uma operação corresponde ao que pediu.

O primeiro passo é disponibilizar o repositório atual por link com acesso autorizado ou arquivo ZIP. Antes de escolher tecnologias ou reescrever qualquer coisa, a IA deve ler os arquivos Markdown, o diário e o código existente.

Este plano registra a visão aprovada na conversa. O repositório ainda não foi analisado nesta entrega. Portanto, arquitetura, esforço e estado de implementação permanecem pendentes de auditoria. As imagens são referência visual: cotas, códigos e campos ilustrativos não são especificações técnicas.

### Seus primeiros cinco passos

1. Envie o repositório atual ou um ZIP, sem senhas, tokens ou credenciais.
2. Peça a execução da etapa 0 deste plano.
3. Confira o resumo: o que existe, o que funciona e o que falta.
4. Informe o primeiro comando CNC e uma peça simples para servir de referência.
5. Acompanhe uma entrega pequena por vez, usando o ciclo da seção 5.

## 2. Visão do produto

Transformar uma geometria 2D confirmada em operações de usinagem e um programa Macro B parametrizado, com revisão, visualização e rastreabilidade.

| Área | Funcionalidades previstas |
| --- | --- |
| Projetos | Criar, abrir, duplicar, pesquisar, salvar e recuperar revisões; biblioteca de peças e modelos. |
| Desenho 2D | Retas, arcos, círculos e furos; cotas, origem, unidades, seleção e edição; importação DXF. |
| Interpretação assistida | Importar PDF ou imagem, propor geometria e exigir conferência de escala, cotas e entidades ambíguas. |
| Parâmetros | Nomear dimensões, definir vínculos, recalcular dependências e indicar conflitos. |
| Planejamento | Faceamento, contorno e furação; ferramentas, profundidades, passes, avanços, rotações, origem e perfil do comando. |
| Simulação | Primeiro trajetória; depois remoção de material. Escopo de verificações de ferramenta, fixação e máquina explicitamente identificado. |
| Programa | Gerar Macro B, revisar parâmetros e código, exportar .NC, salvar revisão e emitir ficha de preparação. |

### Regra central de medidas

No app, alterações atualizam as dimensões conforme os vínculos definidos. Isso não significa escalar toda a peça automaticamente: comprimento, posição dos furos e diâmetro podem ter relações distintas.

Exemplo de referência: trecho total de 100 mm, arco semicircular central de diâmetro 50 mm e raio 25 mm. As partes retas restantes medem 25 mm de cada lado. Se o diâmetro passar para 60 mm mantendo o total em 100 mm, passam a medir 20 mm cada. Se a intenção for escalar a peça inteira, isso deve ser uma operação explícita.

Na máquina, a edição manual exige que o operador confira e ajuste as outras medidas afetadas. O programa não deve prometer reproduzir automaticamente todos os vínculos do software. O que permanece como expressão no código e o que é calculado na exportação deve estar documentado.

## 3. Documentação profissional no repositório

Markdown é texto organizado em títulos, listas e tabelas. Cada arquivo terá uma finalidade. Antes de criá-los, a IA deve localizar equivalentes existentes e aproveitá-los, evitando duas fontes contraditórias.

| Arquivo proposto | Finalidade | Quando atualizar |
| --- | --- | --- |
| README.md | Apresentação, instalação, execução e mapa da documentação. | Quando mudar o uso ou a estrutura. |
| AGENTS.md | Regras de trabalho para a IA no repositório. | Quando mudar o processo. |
| docs/VISAO.md | Objetivo, público, fluxo e limites do produto. | Quando mudar o escopo aprovado. |
| docs/REQUISITOS.md | Funcionalidades identificadas e critérios de aceitação. | Quando um requisito for detalhado ou alterado. |
| docs/ARQUITETURA.md | Módulos, responsabilidades, dados e dependências. | Quando uma decisão estrutural for implementada. |
| docs/ROADMAP.md | Etapas e marcos, com dependências. | Quando prioridades mudarem. |
| docs/BACKLOG.md | Tarefas pequenas, ordenadas e verificáveis. | A cada ciclo de trabalho. |
| docs/STATUS.md | Estado atual, impedimentos e próxima tarefa. | Ao encerrar cada ciclo. |
| docs/DIARIO.md | Registro cronológico do que foi feito e verificado. | Ao encerrar cada ciclo. |
| docs/DECISOES.md | Decisões, motivos, alternativas e consequências. | Ao tomar decisão relevante. |
| docs/VALIDACAO-CNC.md | Casos de referência, perfil do comando e evidências. | A cada validação técnica. |
| CHANGELOG.md | Mudanças entregues por versão. | Ao preparar uma versão. |

O Git registra versões dos arquivos. Um commit é um ponto de recuperação identificado. Uma branch permite trabalhar em uma mudança separada. Um pull request apresenta a diferença para revisão. A IA conduz essas operações; você recebe uma explicação curta do impacto.

## 4. Etapas de construção

### Etapa 0 — Auditoria do projeto existente

**IA:** ler regras e diário; mapear código, dependências, testes, execução e pendências; reproduzir o estado atual quando possível; identificar material reutilizável e conflitos entre documentos.

**Você:** fornecer acesso e explicar quais telas ou fluxos já usa.

**Entrega:** inventário, diagnóstico, documentação conciliada e primeira tarefa recomendada. Nenhuma reescrita ampla sem justificativa concreta.

**Conclusão:** cada área está marcada como existente e verificada, existente e não verificada, incompleta ou ausente.

### Etapa 1 — Especificação e peça de referência

**IA:** converter a visão em requisitos numerados; definir dados do projeto e exemplos esperados.

**Você:** indicar comando e máquina-alvo, fornecer uma peça simples e, se possível, um programa conhecido e validado para comparação.

**Entrega:** primeiro escopo fechado: uma peça simples, uma operação, um perfil de comando e um caminho completo de geração.

**Conclusão:** origem, unidades, geometria, ferramenta, estratégia e resultado esperado estão definidos. Informações desconhecidas permanecem registradas como pendências.

### Etapa 2 — Projetos e interface funcional

**IA:** implementar navegação, criação, abertura, salvamento, revisões e tratamento de erros; seguir a identidade visual aprovada.

**Você:** realizar um roteiro curto de uso e avaliar legibilidade e sequência das ações.

**Conclusão:** salvar e reabrir preserva os dados; entradas inválidas são explicadas; operações destrutivas têm recuperação ou confirmação apropriada.

### Etapa 3 — Geometria e vínculos

**IA:** implementar entidades geométricas e parâmetros, fechamento de contorno, unidades, tolerâncias e atualização de dependências.

**Você:** conferir desenhos e resultados numéricos dos exemplos.

**Conclusão:** exemplo 100/50/25 reproduzido; alteração para diâmetro 60 retorna trechos de 20; diâmetro incompatível é rejeitado; vínculos circulares ou conflitantes são apontados. A interface e o cálculo usam a mesma geometria.

### Etapa 4 — Primeira geração Macro B

**IA:** implementar uma operação completa para o perfil selecionado, com parâmetros rastreáveis, trajetórias, aproximação, retração e exportação.

**Você:** conferir a lógica de usinagem e os parâmetros com o caso de referência.

**Conclusão:** cada parâmetro exportado tem origem identificada; saída determinística; geometria inválida ou configuração obrigatória ausente bloqueia geração; código comparado com referências técnicas do comando e casos conhecidos.

Este é o primeiro marco funcional: criar uma peça simples, parametrizar, salvar, reabrir, gerar e revisar um programa. Ele antecede importações complexas e simulação volumétrica.

### Etapa 5 — Visualização de trajetória e validação integrada

**IA:** mostrar percurso, sentido, movimentos rápidos e de corte, níveis Z e reprodução; conferir o programa efetivamente exportado, evitando validar apenas uma trajetória interna diferente.

**Você:** revisar a sequência visual e divergências em relação ao processo esperado.

**Conclusão:** trajetórias e código correspondem nos casos suportados; recursos não interpretados são identificados. Animação visual não equivale a validação completa da máquina.

### Etapa 6 — DXF e expansão das operações

**IA:** importar entidades suportadas com relatório de incompatibilidades; acrescentar faceamento, contorno, furação e múltiplas ferramentas de maneira incremental.

**Você:** fornecer exemplos reais, incluindo arquivos com falhas conhecidas.

**Conclusão:** escala e origem são conferidas; entidades não suportadas não são descartadas silenciosamente; cada operação tem casos de teste próprios e integrados.

### Etapa 7 — Simulação de remoção de material

**IA:** representar bruto, ferramenta e material removido; documentar limites e, quando implementadas, verificações envolvendo fixação e máquina.

**Você:** comparar o resultado com a peça e o processo pretendidos.

**Conclusão:** volumes e movimentos conferidos com casos conhecidos; nenhuma alegação de detecção de colisão além do escopo realmente implementado.

### Etapa 8 — PDF, imagens e biblioteca avançada

**IA:** construir interpretação assistida, confirmação de cotas, indicação de ambiguidades, modelos reutilizáveis e ficha de preparação completa.

**Você:** confirmar a interpretação antes da programação.

**Conclusão:** nenhuma dimensão inferida é tratada como confirmada; desenho sem escala ou informação suficiente solicita correção. Um desenho 2D sozinho não define ferramenta, material, fixação ou estratégia.

### Etapa 9 — Preparação para uso controlado

**IA:** consolidar documentação, recuperação de projetos, compatibilidade de versões, empacotamento, regressões e lista de limitações conhecidas.

**Você e responsável técnico:** conduzir a validação operacional segundo os procedimentos da máquina e da empresa, antes da utilização produtiva.

**Conclusão:** versão identificada, evidências registradas e escopo suportado explícito. Novos comandos CNC exigem validação própria.

## 5. Como será cada sessão

1. **Retomar:** a IA lê as regras, o STATUS e os documentos relevantes à tarefa.
2. **Delimitar:** descreve em poucas linhas a entrega e como será verificada.
3. **Executar:** implementa uma mudança coerente, preservando trabalho existente.
4. **Verificar:** executa testes necessários e demonstra o comportamento.
5. **Registrar:** atualiza status, diário e decisões afetadas; registra a mudança no Git conforme o fluxo do projeto.
6. **Apresentar:** informa o que mudou, como conferir, limitações e próximo passo.

Você aprova decisões de produto e responde dúvidas de usinagem. A IA resolve detalhes rotineiros de implementação, sem pedir confirmação a cada arquivo.

### Modelo de tarefa para docs/BACKLOG.md

```markdown
## CNC-001 — Recalcular arco central
Estado: a fazer
Objetivo: manter o contorno coerente ao editar o diâmetro.
Dependências: geometria de reta e arco disponível.
Entrada: comprimento 100 mm; diâmetro 50 mm.
Alteração: diâmetro para 60 mm, comprimento fixo.
Aceitação: raio 30 mm; trechos retos de 20 mm; contorno válido.
Erro esperado: diâmetro maior que o comprimento é recusado.
Evidência: teste numérico e conferência visual.
```

### Modelo para docs/STATUS.md

```markdown
# Estado atual
Atualizado em: AAAA-MM-DD
Etapa atual:
Última entrega verificada:
Versão ou commit:
O que funciona:
O que ainda não foi verificado:
Impedimentos:
Próxima tarefa e critério de conclusão:
Documentos necessários para retomar:
```

### Modelo de entrada no diário

```markdown
## AAAA-MM-DD — Identificador da tarefa
Objetivo:
Alterações:
Verificações e resultados:
Limitações ou falhas:
Decisões relacionadas:
Próximo passo:
Commit, quando existente:
```

### Conteúdo inicial proposto para AGENTS.md

Adaptar ao repositório após a auditoria; não substituir regras existentes sem conciliação.

```markdown
# Regras de trabalho
- Ler o STATUS e a documentação relevante antes de implementar.
- Preservar trabalho existente e evitar reescritas sem evidência.
- Manter cálculos geométricos separados da interface.
- Manter geração de código separada dos perfis de comando.
- Documentar unidades, tolerâncias e convenções de coordenadas.
- Não inventar suporte a comandos, ciclos ou variáveis CNC.
- Consultar documentação técnica aplicável ao implementar um perfil.
- Bloquear geração quando faltar informação obrigatória.
- Não tratar código gerado ou simulação como validação de máquina.
- Testar resultados geométricos e comportamentos críticos.
- Nunca registrar credenciais no repositório ou no diário.
- Atualizar STATUS e DIARIO ao concluir uma tarefa.
- Explicar resultados ao Leonardo com linguagem curta e direta.
```

## 6. Arquitetura proposta, sujeita à auditoria

Separar as responsabilidades: interface; armazenamento de projetos; geometria e vínculos; operações e trajetórias; gerador Macro B e perfis de comando; interpretação/simulação; importação e exportação.

Uma representação comum da peça e das operações deve alimentar a tela e a geração. A simulação deve incluir conferência da saída exportada. Projetos precisam guardar versão do formato, unidades, origem, geometria, vínculos, operações e perfil utilizado.

A escolha de linguagem, bibliotecas, aplicativo web ou desktop depende do que já existe, do dispositivo pretendido e dos requisitos de uso sem internet. Nenhuma troca de tecnologia está decidida neste plano.

## 7. Qualidade e validação

| Verificação | Evidência mínima |
| --- | --- |
| Geometria | Resultados numéricos conhecidos, limites e contornos inválidos. |
| Vínculos | Recalcular dependências, detectar conflito e impedir ciclos. |
| Projetos | Salvar e reabrir sem perda; identificar formato incompatível. |
| Geração | Comparação com programas de referência e sintaxe do perfil suportado. |
| Trajetória | Conferência de origem, unidades, arcos, níveis Z e movimentos. |
| Importação | Arquivos válidos e inválidos; escala e entidades omitidas identificadas. |
| Interface | Fluxo utilizável e mensagens claras para erros previsíveis. |
| Regressão | Uma mudança nova preserva os casos já aprovados. |

Cada entrega recebe um estado: planejada, implementada, verificada em software ou validada operacionalmente no escopo registrado. Esses estados não são equivalentes.

## 8. Continuidade, contexto e esforço

O trabalho será modular para reduzir risco, facilitar recuperação e manter entregas verificáveis. A continuidade dependerá dos arquivos e do Git, não da memória de uma conversa.

Não há estimativa confiável de tokens ou prazo antes de examinar o repositório. Depois da auditoria, cada módulo deve receber uma faixa de esforço e suas incertezas. Contexto de conversa, consumo e limites do plano são coisas diferentes; este roteiro não promete disponibilidade ilimitada.

Ao retomar, ler primeiro STATUS e regras, depois apenas os módulos necessários. Ao encerrar, registrar evidências e próxima tarefa. Evitar reler todo o repositório a cada pequena alteração.

## 9. Instrução pronta para a primeira execução

> Analise o repositório do meu app CNC Macro B. Leia primeiro as regras, arquivos Markdown e diário existentes. Use este plano como visão proposta e concilie com a documentação atual, preservando o histórico. Ainda não faça uma reescrita. Execute a etapa 0: identifique o que existe, o que foi verificado, o que falta e quais informações precisam de confirmação. Organize a documentação aproveitando arquivos equivalentes. Apresente um diagnóstico curto e indique a primeira entrega funcional pequena, com critério de aceitação. Explique tudo considerando que não tenho experiência em programação.

## 10. Pendências para a auditoria

- Acesso ao repositório e identificação da versão em uso.
- Comando CNC exato, opções disponíveis e documentação aplicável.
- Primeira peça e programa de referência, quando disponíveis.
- Dispositivo de uso e necessidade de funcionamento sem internet.
- Formatos reais de desenho e prioridade entre desenhar e importar.
- Limites iniciais: eixos, operações, ferramentas e materiais contemplados.

Essas pendências orientam o início; não é necessário responder tudo antes de enviar o repositório.

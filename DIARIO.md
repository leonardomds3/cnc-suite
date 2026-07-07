# Diário de bordo — CNC Suite

Este arquivo é a nossa memória entre sessões. Se você (Claude) está lendo isto
numa conversa nova, trate como se fôssemos a mesma dupla de sempre: o Leo e você,
retomando o trabalho de onde paramos. Não é relatório — é o caderno que fica na
bancada pra ninguém perder o fio.

---

## Como trabalhamos

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

Commits até aqui (do mais recente pro mais antigo):

- `6923fd7` — Extrai o motor de usinagem duplicado de montador_macro_cnc_2.html para engine.js
- `d07b49d` — Extrai o motor de usinagem para engine.js e corrige modal de macro
- `b127cd7` — Adiciona as duas aplicações CNC (Estúdio CNC e Montador Macro)
- `d641abb` — Traduz o CLAUDE.md para português
- `5bc715c` — Add CLAUDE.md with codebase guidance

---

## Onde paramos

Motor unificado em `engine.js` e **funcionando** nos dois apps. Remoto ligado.
Árvore de trabalho limpa — **nada pendente de commit**. Base arrumada, pronta pro
próximo passo grande.

---

## Para onde vamos

O próximo salto é transformar a **estratégia de usinagem** — o jeito como a
ferramenta percorre o perfil: direção do corte, stepover (passe lateral), passo Z,
entrada e saída — em **dados JSON editáveis pelo usuário**, que o `engine.js`
interpreta e o Three.js desenha.

Decisão já tomada sobre como começar:

- **Nível 1 primeiro:** a estratégia entra como **parâmetros dentro de padrões que
  o motor já conhece**. O usuário ajusta os números; o motor escolhe entre caminhos
  pré-definidos. Simples, previsível, testável.
- **Nível 2 só quando doer:** lógica de percurso livre (o usuário descrevendo
  estratégias que o motor não tem embutidas) fica pra quando houver **necessidade
  real**. Não se antecipa a essa complexidade.

A regra de ouro continua: começar pelo que é simples e sólido, e só subir de nível
quando o chão de fábrica pedir.

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

# Auditoria e reorganização estrutural — CNC Suite

> Para Claude Code (executor: Sonnet). Repositório `cnc-suite`, branch `master`.
> Fase seguinte à modularização do Montador (ver `INSTRUCAO-MODULARIZACAO.md`).
> Objetivo: dividir o app em processos e módulos com pastas, para manutenção
> fácil e evolução barata. **Sem mudar uma linha de código G gerado.**
>
> **Decisão do Leonardo nesta fase: o `estudio_cnc.html` é obsoleto e sai do
> projeto.** O Montador passa a ser a única interface.

---

## 0. Protocolo de economia de tokens

1. **Nunca leia um HTML inteiro.** Leia a faixa da etapa com `sed -n 'INI,FIMp'`.
2. **Nunca leia** `1-PESCADOR.NC` (274 KB), `DIARIO.md` (39 KB) nem
   `programas_anotados/`.
3. **Âncoras por `grep -n`**, não por número de linha memorizado.
4. **Edite com `str_replace`/patch**, nunca reescrevendo o arquivo inteiro.
5. **Uma etapa = um commit = um diff.** Não adiante etapa seguinte.
6. **Não narre o que leu.** Entregue diff + resultado do teste.
7. Node fica em `C:\Program Files\nodejs\node.exe`.

---

## 1. Auditoria

Números medidos no commit atual, não estimativas.

### 1.1 O estúdio sai — 1.283 linhas de graça

O repositório tem hoje 4.482 linhas de código. `estudio_cnc.html` são 1.283
delas — **29% do projeto**, sem nenhum consumidor.

Com ele saem também os problemas que só existiam por causa dele: 25 funções
duplicadas entre as duas interfaces, 18 delas byte a byte idênticas, e 11 que já
tinham divergido sozinhas. Nada disso precisa ser resolvido — basta apagar.

O arquivo não se perde: fica no histórico do git para sempre. Recuperar é
`git show <commit>:estudio_cnc.html`.

Referências a limpar (só quatro arquivos): `CLAUDE.md` (2 menções), `engine.js`
(comentário de cabeçalho), `DIARIO.md` (4 menções, histórico — deixar como está),
`INSTRUCAO-MODULARIZACAO.md` (histórico — deixar como está).

### 1.2 `engine.js` é um monólito de 875 linhas ⚠️ *agora é o achado principal*

Concentra sete responsabilidades num arquivo só:

| Faixa | Responsabilidade |
|---|---|
| 19–48 | helpers de formatação (`num`, `fnum`, `fx`, `noAcc`) |
| 50–225 | operações nativas (`DEFS`, `ORDEM`) |
| 226–339 | macros do usuário (`registrarCustom`) |
| 340–508 | interpretador de fichas JSON (`avaliarExpr`, `interpretarEstrategia`) |
| 509–591 | montagem do programa (`gerarPrograma`, `coletarWarns`) |
| 592–806 | simulador de G-code (`execNC`) |
| 807–875 | parâmetros de corte + helpers do modal |

Para mexer no interpretador de fichas hoje, é preciso navegar um arquivo que
também contém o simulador e a tabela de materiais. É a caixa de ferramentas em
que tudo está jogado junto: acha, mas perde tempo toda vez.

### 1.3 O script inline do Montador ainda tem 806 linhas

Cinco blocos, já separados por comentário — o que facilita a extração:

| Faixa | Bloco |
|---|---|
| 431–465 | UI — Paleta |
| 466–689 | UI — Pilha |
| 690–751 | Refresh geral |
| 752–1007 | Preview 3D (Three.js) — 255 linhas |
| 1008–1222 | Editor de macros personalizados |

### 1.4 Raiz com 19 arquivos soltos

Código, dados, documentação, amostras e testes no mesmo nível. Sem `.gitignore`.
`1-PESCADOR.NC` (274 KB) está duplicado: na raiz **e** em `programas_anotados/`.

### 1.5 `estrategias.js` regenerado à mão

Conferi: **hoje está em sincronia** com os três `.json` de família — 7 fichas,
conteúdo idêntico. Mas a regeneração é manual, documentada só num comentário de
cabeçalho. Risco latente, não bug atual.

### 1.6 O ponto de alavanca 🔑

`engine.js` **carrega em Node** com um stub mínimo de `document` — só `cfg()`
toca o DOM, lendo 6 campos fixos. Verificado:

```js
global.document = { getElementById: id => ({value:'', checked:false}) };
new Function(fs.readFileSync('engine.js','utf8'))();   // funciona
```

O teste de regressão pode rodar em **segundos no terminal**, em vez de minutos
clicando no navegador. É a primeira coisa a construir.

---

## 2. Regras invioláveis

- **Saída idêntica.** O G-code antes e depois de cada etapa deve ser byte a byte
  igual. Única métrica de sucesso.
- **Preservar** as fichas JSON e `programas_anotados/`.
- **Sem build system obrigatório, sem npm, sem framework.** Os `.js` de
  `ferramentas/` rodam sob demanda no Node, nunca em tempo de página.
- **Sem `localStorage`/`sessionStorage`.**
- **Scripts clássicos** (`<script src>`), não ES modules. Cada arquivo novo
  declara no cabeçalho de quem depende; a ordem de carga fica documentada no
  `CLAUDE.md`. *(ES modules são opção futura — exigiriam servidor sempre e
  reescrita de todos os arquivos; fora de escopo.)*
- Testes de navegador só via `http://localhost:8000`.

---

## 3. Estrutura-alvo

```
/
├─ montador_macro_cnc_2.html     ← única interface
├─ src/
│  ├─ core/          ← domínio puro, sem DOM (ex-engine.js)
│  │   formato.js · operacoes.js · macros.js · fichas.js
│  │   programa.js · simulador.js · corte.js
│  └─ ui/            ← tudo que toca o DOM
│      paleta.js · pilha.js · preview3d.js
│      modal-macro.js · cad2d.js · desenho2d.js
├─ estilos/
│   ui.css
├─ dados/
│   estrategias_canal.json · estrategias_escareado.json
│   estrategias_bolsa.json  ← fonte da verdade
│   estrategias.js          ← DERIVADO, gerado
├─ ferramentas/
│   build-estrategias.js · verificar.cjs
├─ amostras/
│   programas_anotados/
└─ docs/
```

Regra de decisão para arquivo novo: **toca o DOM?** Não → `src/core/`.
Sim → `src/ui/`. Duas pastas, sem terceira categoria.

---

## 4. Etapas

### Etapa 0 — rede de proteção ⚠️ *fazer primeiro, sem exceção*

Criar `ferramentas/verificar.cjs`: carrega `engine.js` + `estrategias.js` em Node
com stub de `document`, monta um projeto de referência fixo (3 blocos: operação
nativa + ficha JSON + macro custom), chama `gerarPrograma()` e imprime o SHA-256
da saída.

```bash
node ferramentas/verificar.cjs          # compara com o baseline
node ferramentas/verificar.cjs --salvar # grava ferramentas/baseline.txt
```

Sem argumento, sai com código 1 se divergir.

**Aceite:** roda em menos de 2 segundos e o hash bate com o G-code que o
navegador gera para o mesmo projeto. Confirme essa equivalência **uma vez**, no
navegador, antes de confiar no harness.

> Todas as etapas seguintes usam `node ferramentas/verificar.cjs` como teste
> principal. O navegador vira conferência visual, não prova de regressão.

---

### Etapa 1 — aposentar o estúdio

1. `git rm estudio_cnc.html`
2. Limpar as 2 menções em `CLAUDE.md` e o comentário em `engine.js` que diz
   "compartilhado por estudio_cnc.html e montador_macro_cnc_2.html".
3. **Não** editar `DIARIO.md` nem `INSTRUCAO-MODULARIZACAO.md` — são registro
   histórico e devem continuar refletindo o que era verdade na época.
4. Conferir se `ui.css` ficou com regra órfã que só o estúdio usava. Se sim,
   remover — mas **liste antes** o que vai apagar.

**Aceite:** `verificar.cjs` passa; o Montador abre sem 404 no console;
`grep -ril estudio` retorna só os dois arquivos de histórico.

---

### Etapa 2 — higiene de repositório

Sem alterar uma linha de lógica:

1. Criar as pastas da seção 3 e mover arquivos com `git mv` (preserva histórico).
2. Atualizar todo `<script src>` e `<link href>` no Montador.
3. Apagar `1-PESCADOR.NC` da raiz — a cópia em `amostras/programas_anotados/`
   fica.
4. Criar `.gitignore`: `*.NC` na raiz, `antes.NC`, `depois.NC`. O
   `ferramentas/baseline.txt` **vai** para o git.

**Aceite:** `verificar.cjs` passa; a página abre sem 404.

---

### Etapa 3 — build das estratégias

Criar `ferramentas/build-estrategias.js`: lê os `.json` de família de `dados/`,
concatena na ordem canal → escareado → bolsa, regrava `dados/estrategias.js` com
o cabeçalho de aviso.

Rodar e confirmar que a saída é **idêntica** ao `estrategias.js` atual — prova de
que o gerador reproduz o arquivo escrito à mão.

**Aceite:** `git diff dados/estrategias.js` vazio após rodar o build.

---

### Etapa 4 — quebrar `engine.js` em `src/core/` ⚠️ *o coração da fase*

Na ordem da tabela da seção 1.2, **de baixo para cima** (o que tem menos
dependentes sai primeiro):

`corte.js` → `simulador.js` → `programa.js` → `fichas.js` → `macros.js` →
`operacoes.js` → `formato.js`

Um arquivo por vez, rodando `verificar.cjs` entre cada um. Cada arquivo abre com
um cabeçalho de duas linhas: o que faz e de quem depende.

`engine.js` deixa de existir ao final. Se sobrar algo sem lugar, é sinal de que
falta um módulo — **pergunte antes de inventar**.

**Aceite:** `verificar.cjs` passa a cada extração; `node --check` limpo em todos.

---

### Etapa 5 — esvaziar o script inline do Montador

Extrair os blocos da tabela 1.3 para `src/ui/`, na ordem:

`preview3d.js` (255 linhas, o maior) → `modal-macro.js` → `pilha.js` →
`paleta.js`

O `refresh` geral (690–751) **fica no HTML** — é o maestro que chama os módulos,
não um módulo.

**Aceite:** `verificar.cjs` passa; script inline do Montador abaixo de 150
linhas; preview 3D, paleta, pilha e cadastro de macro funcionando no navegador.

---

## 5. Protocolo de teste

Por etapa, nesta ordem:

```bash
node --check <cada .js alterado ou novo>
node ferramentas/verificar.cjs            # hash deve bater
```

Depois, no navegador (`localhost:8000`): console sem erro.

Se `verificar.cjs` divergir: **reverta a etapa**, não conserte por cima.

---

## 6. Entrega por etapa

Sem preâmbulo, nesta ordem:

1. O diff (`git diff`), um arquivo por vez.
2. Saída do `node --check` e do `verificar.cjs`.
3. Uma linha: quantas linhas saíram do HTML / do `engine.js`.
4. Pergunta: seguir para a próxima etapa?

**Não commitar sem aprovação do Leonardo.** Ao final das seis etapas, atualizar
`CLAUDE.md` (estrutura de pastas, ordem de carga dos scripts, regra de decisão da
seção 3, fim do estúdio) e `STATUS.md` — em diff separado, por último.

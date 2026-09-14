# Instrução de trabalho — Modularização do `montador_macro_cnc_2.html`

> Para Claude Code (executor: Sonnet). Repositório `cnc-suite`, branch `master`.
> Objetivo: reduzir código, isolar funcionalidades e acabar com o empilhamento
> de wrappers. **Sem mudar uma linha de código G gerado.**

---

## 0. Protocolo de economia de tokens (LEIA PRIMEIRO)

Estas regras valem para **todas** as etapas. Violá-las é o erro mais caro aqui.

1. **Nunca leia `montador_macro_cnc_2.html` inteiro.** São 1590 linhas / ~110 KB.
   Leia apenas a faixa da etapa, com `sed -n 'INI,FIMp' arquivo`.
2. **Nunca leia `1-PESCADOR.NC`** (274 KB), `DIARIO.md` (39 KB) nem
   `programas_anotados/` — não são necessários para nenhuma etapa.
3. **Localize âncoras com `grep -n`, não com número de linha memorizado.**
   Os números deste documento valem no commit base; após a etapa 1 eles mudam.
4. **Edite com `str_replace`/patch, nunca reescrevendo o arquivo inteiro.**
   Reescrever 1590 linhas para mudar 6 é o desperdício clássico.
5. **Uma etapa = um commit = um diff.** Não adiante etapa seguinte.
6. **Não resuma o que leu de volta para o usuário.** Entregue o diff e o
   resultado do teste. Nada de relatório narrativo.
7. Se uma etapa exigir mais de ~2 leituras de faixa, pare e reporte — sinal de
   que a faixa foi mal delimitada.

---

## 1. Regras invioláveis do projeto

Herdadas de `CLAUDE.md` e `STATUS.md`. Não renegocie nenhuma.

- **Saída idêntica.** O G-code produzido antes e depois de cada etapa deve ser
  byte a byte igual. Esta é a única métrica de sucesso que importa.
- **Preservar** as fichas JSON (`estrategias_*.json`), o `estrategias.js`
  derivado, `programas_anotados/` e as duas interfaces HTML.
- **Sem build system, sem npm, sem framework.** HTML/CSS/JS puro.
- **Sem `localStorage`/`sessionStorage`.** Estado vai e volta por `.json`
  baixado/enviado.
- **Não tocar em `engine.js`** nesta frente de trabalho. Ele é o motor
  compartilhado e está auditado.
- Testes de navegador só via `http://localhost:8000` (`py -m http.server 8000`).
  `file://` é proibido pelo Leonardo.
- Interface ativa: **Montador**. `estudio_cnc.html` é preservado, mas só entra
  na etapa 1 (CSS) — não refatore o script dele.

> Nota sobre a skill `gerador-html-cnc`: a regra "arquivo único, CSS e JS
> inline" **não se aplica a este repositório**. Aqui já existem `engine.js` e
> `estrategias.js` externos e um servidor local, conforme `CLAUDE.md`. As demais
> regras da skill (tema âmbar, toast, avisos não bloqueantes, mobile-first,
> `DEFS`/`SEQ`/`cfg()`) continuam valendo.

---

## 2. Diagnóstico — o que está errado

O problema não é tamanho de arquivo, é **empilhamento**. Três funções centrais
foram redefinidas em camadas sucessivas, cada feature nova envolvendo a anterior:

| Função | Camadas | Linhas (base) |
|---|---|---|
| `refresh` | original → `refreshOriginal` → `refreshSemDesenho` | 763, 1323–1324, 1441–1442 |
| `renderPilha` | original → `renderPilhaOriginal` → `renderPilhaSemDesenho` | 598, 1310–1322, 1443 |
| `salvarDesenho2D` / `carregarDesenho2D` | original → `...SemCAD` | 1340–1348, 1575–1583 |

Somam-se a isso:

- **Cirurgia de DOM em runtime** (a partir da linha 1247): o HTML nasce em 5
  cards e o JS o reconstrói em shell/stages depois de carregado.
- **CSS duplicado**: 94 das 328 linhas de estilo do montador são idênticas às do
  `estudio_cnc.html`.

---

## 3. Etapas

Executar **na ordem**. Cada etapa tem âncora de busca, critério de aceite e
gatilho de parada.

### Etapa 1 — extrair `ui.css`

**Faixa:** montador linhas 10–350 (`<style>`…`</style>`); estúdio linhas 8–219.

1. Ler as duas faixas.
2. Criar `ui.css` com **apenas as regras comuns aos dois arquivos** (tokens
   `:root`, tipografia, `.btn`, `.card`, `.field`, `.warnrow`, toast, `<pre>` de
   código).
3. Em cada HTML, substituir as regras migradas por
   `<link rel="stylesheet" href="ui.css">` antes do `<style>` remanescente.
   O `<style>` que sobra guarda só o que é específico daquela interface.

**Aceite:** as duas páginas abrem em `localhost:8000` visualmente idênticas ao
antes. Diff mostra redução líquida de linhas.

---

### Etapa 2 — achatar os wrappers ⚠️ *a mais importante*

**Não pule e não combine com outra etapa.** Sem ela, extrair módulo é só mudar a
bagunça de lugar.

**Âncoras:** `grep -n "Original=\|SemDesenho=\|SemCAD=" montador_macro_cnc_2.html`

Ler as faixas: 596–700 (`renderPilha` original), 757–775 (`refresh` original),
1305–1330, 1438–1448, 1572–1585.

**Alvo:** uma definição única de cada função, com as camadas fundidas em ordem
de execução explícita.

```js
// ANTES: 3 definições, 2 wrappers, ordem implícita
// DEPOIS:
function refresh(){
  gerarCodigoEAvisos();   // corpo da versão original
  atualizarCabecalho();   // ex-camada "etapas"
  renderDesenhos();       // ex-camada "desenho 2D"
  atualizarAvisoDesenho();
  refresh3D();
}
```

Mesmo tratamento para `renderPilha` (3 camadas) e para o par
`salvarDesenho2D`/`carregarDesenho2D` (2 camadas).

**Regra de fusão:** o corpo de um wrapper roda **depois** do corpo que ele
envolvia. Preserve essa ordem ao achatar — inverter quebra o render.

**Aceite:**
- `grep -c "Original=\|SemDesenho=\|SemCAD=" montador_macro_cnc_2.html` → `0`
- Nenhuma reatribuição de função (`refresh=function`, `renderPilha=function`)
  sobra no arquivo.
- Teste comparativo da seção 4 passa.

---

### Etapa 3 — extrair `cad2d.js`

**Âncora inicial:** `/* CAD 2D local: entidades independentes do percurso CNC. */`
**Faixa (base):** 1447 até antes de `/* ---------- boot ---------- */`.

Mover para `cad2d.js` e expor uma superfície mínima:

```js
const CAD2D = { init, render, fit, salvar, carregar, entidades: () => CAD.entities };
```

Tudo que hoje é `cadClone`, `cadSnap`, `cadValid`, `cadCommit` etc. fica interno
ao módulo. O HTML carrega com `<script src="cad2d.js"></script>` depois de
`estrategias.js` e chama só os métodos da superfície.

**Aceite:** desenhar reta/retângulo/círculo/arco, undo/redo, zoom, salvar e
reabrir `.json` — tudo funcionando. `node --check cad2d.js` limpo.

---

### Etapa 4 — extrair `desenho2d.js`

**Âncora:** `const DESENHO_ID='retangulo-furos-v1'` até a âncora da etapa 3.

Mesmo padrão: superfície mínima `DESENHO2D = { render, aplicar, avisos, salvar, carregar, sincronizado }`.

**Ponto de atenção:** este módulo **escreve em `SEQ`** (via `aplicarDesenho`,
`operacoesVinculadas`). Mantenha esse acoplamento explícito e documentado no topo
do arquivo — não o esconda atrás de mais uma camada.

**Aceite:** confirmar um padrão de furos gera as operações vinculadas, e o aviso
de diâmetro divergente continua aparecendo.

---

### Etapa 5 — HTML nasce no layout final

**Âncora:** `const oldCards=[...document.querySelectorAll('.cols .card')]`
**Faixa (base):** 1246–1300.

Reescrever o `<body>` (linhas 352–466) já na estrutura shell/stages que o JS hoje
monta em runtime. Deletar o bloco de cirurgia de DOM. Manter `showStage()` e
`stageInfo` — a navegação entre etapas continua sendo JS.

**Aceite:** nenhum `createElement` de layout no boot; as seis etapas navegam
igual. Esta é a etapa de maior risco visual — compare lado a lado antes de
commitar.

---

## 4. Protocolo de teste (obrigatório por etapa)

O teste é comparativo, não descritivo. Antes de começar a etapa, gere o baseline;
depois, compare.

```bash
# baseline, uma vez antes da etapa
node --check <(sed -n '498,1588p' montador_macro_cnc_2.html)

# projeto de referência: 3 blocos cobrindo nativa + ficha + macro custom
# gerar .NC pelo navegador em localhost:8000, salvar como antes.NC
# repetir após a etapa como depois.NC
diff antes.NC depois.NC   # DEVE sair vazio
```

- `node --check` em todo `.js` novo ou alterado.
- Console do navegador sem erro nem aviso.
- Se `diff` não sair vazio: **reverta a etapa**, não tente consertar por cima.

---

## 5. Formato de entrega por etapa

Entregue exatamente isto, nesta ordem, sem preâmbulo:

1. O diff (`git diff`), um arquivo por vez.
2. Saída do `node --check` e do `diff antes.NC depois.NC`.
3. Uma linha: quantas linhas saíram do HTML.
4. Pergunta: seguir para a próxima etapa?

**Não commitar sem aprovação do Leonardo** (regra do `STATUS.md`). Ao aprovar,
commitar apenas os arquivos daquela etapa, mensagem em português, imperativo:
`extrai ui.css compartilhado entre montador e estudio`.

Ao final das cinco etapas, atualizar `CLAUDE.md` (seção de arquitetura, listando
os novos arquivos) e `STATUS.md` — em diff separado, por último.

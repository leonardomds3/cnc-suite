# CAD/CAM no navegador — do desenho às operações

> Para Claude Code (executor: Sonnet). Repositório `cnc-suite`, branch `master`.
> Fase seguinte à reorganização estrutural (ver `INSTRUCAO-ARQUITETURA.md`).
>
> **A imagem `docs/referencias/conceito-montador-macro-b.jpg` é especificação, não
> conceito.** Decisão do Leonardo: o app deve chegar no que ela mostra. Abra a
> imagem no início de cada etapa de interface e compare o resultado com ela.

---

## 0. Protocolo de economia de tokens

1. **Nunca leia um HTML inteiro.** Leia a faixa da etapa com `sed -n 'INI,FIMp'`.
2. **Nunca leia** `amostras/programas_anotados/` (274 KB) nem `DIARIO.md` (39 KB).
3. **Âncoras por `grep -n`**, não por número de linha memorizado.
4. **Edite com `str_replace`/patch**, nunca reescrevendo o arquivo inteiro.
5. **Uma etapa = um commit = um diff.** Não adiante etapa seguinte.
6. **Não narre o que leu.** Entregue diff + resultado do teste.
7. Node em `C:\Program Files\nodejs\node.exe`.
8. A imagem de referência é exceção à regra 1: abra-a sempre que a etapa mexer
   em layout.

---

## 1. Diagnóstico — por que parece protótipo

Não é acabamento. É que **o app tem dois sistemas de desenho que não conversam**.

### 1.1 O CAD desenha, mas não gera nada

`src/ui/cad2d.js` guarda geometria livre — reta, retângulo, círculo, arco — com
id próprio por entidade. E o painel de propriedades diz, em texto, o que ele é:

> "Geometria livre salva com o projeto. Ainda não gera percurso CNC."

Você desenha a peça e o desenho morre ali. Não vira operação, não vira programa.

### 1.2 O que gera operação não vem do desenho

`src/ui/desenho2d.js` é o único caminho que cria operação a partir de geometria —
mas de uma geometria própria, paramétrica (retângulo + matriz de furos), digitada
em campos, não desenhada. E gera **um tipo só**: `furosL`.

São dois universos paralelos. O que você desenha não vira peça; o que vira peça
você não desenha.

**É por isso que a usabilidade parece de protótipo — porque estruturalmente é.**
Nenhum ajuste de botão conserta um fluxo que não existe.

### 1.3 Mas o padrão certo já está provado

Repare no bloco que o `aplicarDesenho()` cria:

```js
{uid, tipo:'furosL', p:{...}, desenho2D:{origem:DESENHO_ID, fileira:i}}
```

Esse campo `desenho2D` é **uma referência de geometria dentro da operação**. É
exatamente o mecanismo que falta — só que cravado num caso único. A peça existe,
está no lugar errado e serve só uma medida.

### 1.4 O que existe hoje para montar em cima

| | |
|---|---|
| Operações nativas | `face`, `furosL`, `furosC` |
| Fichas JSON | 7 (canais, escareado helicoidal, bolsa final) |
| Entidades CAD | `line`, `rect`, `circle`, `arc` |
| Vínculo geometria→operação | só matriz de furos → `furosL` |

Faltam, da imagem: contorno, chanfro, e a seleção de geometria que alimenta todos.

---

## 2. A mudança de modelo

Hoje uma operação é **números digitados**:

```js
{tipo:'furosL', p:{x:-40, y:0, dia:10, n:4, passo:20, prof:12, ...}}
```

O alvo é uma operação **ancorada na geometria**:

```js
{tipo:'furosL', geo:[3,7,11,15], p:{prof:12, td:10, f:250, s:1800}}
//                 ↑ ids das entidades      ↑ só parâmetros de processo
```

Posição e diâmetro saem do desenho. O que resta no formulário é o que a máquina
precisa saber: ferramenta, profundidade, avanço, rotação.

É a diferença entre digitar a cota de cada furo e apontar para os furos no
desenho.

### Regra de projeto que torna isso seguro

**`geo` é opcional.** Bloco sem `geo` continua funcionando exatamente como hoje,
com os números digitados. Bloco com `geo` deriva do desenho.

Isso significa que:

- projetos `.json` antigos abrem sem conversão;
- o G-code do projeto de referência não muda, e `verificar.cjs` segue valendo;
- cada etapa é aditiva — nada quebra enquanto a nova via é construída.

Não negocie essa regra. É ela que permite crescer sem parar o app.

---

## 3. Regras invioláveis

- **A imagem é a especificação de layout.** Divergiu dela, é bug — a não ser que
  o Leonardo diga o contrário.
- **G-code de projeto sem `geo` não muda.** `verificar.cjs` deve passar em toda
  etapa.
- **Retrocompatibilidade de `.json`:** todo projeto salvo antes desta fase precisa
  abrir e gerar o mesmo programa.
- Sem build system obrigatório, sem npm, sem framework. Scripts clássicos.
- Sem `localStorage`/`sessionStorage`.
- Regra de arquivo novo: toca o DOM? Não → `src/core/`. Sim → `src/ui/`.
- Testes de navegador via `http://localhost:8000`.
- **Pare e pergunte** quando a imagem não decidir o caso. Não invente
  comportamento de CAD por conta própria.

---

## 4. Etapas

### Etapa 1 — seleção de geometria que funciona

*Usabilidade e fundação são a mesma coisa aqui: sem selecionar direito, não há
como apontar operação para geometria.*

Compare o painel **02 DESENHO 2D** da imagem com a tela atual. Diferenças a
implementar:

1. **Painel esquerdo agrupado por tipo, com contagem** — `Retas (6)`, `Arcos (2)`,
   `Furos (4)`, como na imagem. Clicar no grupo seleciona todas as entidades dele.
2. **Multisseleção**: clique simples troca a seleção; `Shift`+clique soma; clique
   no vazio limpa. Entidades selecionadas em amarelo (a imagem usa geometria
   branca, cotas ciano, seleção amarela).
3. **Ferramentas do painel** na ordem da imagem: Selecionar, Mover, Copiar,
   Aparar, Cota, Excluir. `Copiar` e `Aparar` podem ficar desabilitados com
   tooltip "em construção" — mas os botões existem e no lugar certo.
4. **Propriedades refletem a seleção**: uma entidade → campos editáveis; várias →
   contagem e os campos comuns; nenhuma → dica de uso.

**Aceite:** `verificar.cjs` passa; selecionar 4 círculos e ver "4 selecionados"
nas propriedades; o agrupamento por tipo bate com a imagem.

---

### Etapa 2 — um modelo de geometria só

A matriz de furos deixa de ser um universo paralelo e vira **um gerador de
entidades** no CAD.

1. `aplicarDesenho()` passa a emitir entidades `circle` em `CAD.entities`,
   marcadas com a origem (`{origem:DESENHO_ID, fileira:i}`), em vez de criar
   blocos `furosL` diretamente.
2. Reaplicar substitui as entidades daquela origem, preservando as desenhadas à
   mão.
3. O aviso "Ainda não gera percurso CNC" sai do painel de propriedades — deixa de
   ser verdade na etapa 3.

**Atenção:** nesta etapa a matriz de furos para de gerar operação. É regressão
temporária e proposital — a etapa 3 devolve, pela via nova. Avise o Leonardo no
resumo.

**Aceite:** `verificar.cjs` passa; confirmar a matriz cria círculos visíveis no
CAD; reabrir um `.json` antigo continua gerando o mesmo G-code.

---

### Etapa 3 — operação ancorada na geometria

Criar `src/core/features.js` — puro, sem DOM: recebe entidades e devolve os
parâmetros que uma operação precisa.

```js
FEATURES.furos(entidades)    // → [{x, y, dia}] a partir dos circles
FEATURES.contorno(entidades) // → cadeia fechada + sentido (etapa 4)
FEATURES.limites(entidades)  // → bounding box, para faceamento
```

Depois, o campo `geo` em `SEQ`:

- `furosL` com `geo` lê posição e diâmetro das entidades referenciadas; o
  formulário mostra só profundidade, ferramenta, avanço e rotação;
- sem `geo`, tudo como hoje.

O botão que fecha o ciclo: com círculos selecionados no desenho, **"Criar
furação"** monta o bloco já ancorado.

**Aceite:** desenhar 4 círculos → selecionar → criar furação → o programa sai com
os 4 furos nas coordenadas desenhadas. Mover um círculo e reaplicar atualiza o
G-code. `verificar.cjs` passa.

---

### Etapa 4 — entrada por valor: desenhar e cotar digitando

*Base: como o AutoCAD. O mouse dá a direção, o teclado dá a medida.*

**O princípio que torna isso barato.** Toda ferramenta do CAD já funciona igual:
junta N pontos e chama `cadNew(tipo, pontos)`. A entrada por valor não muda
ferramenta nenhuma — ela só produz um ponto sem clique:

```
ponto = ponto_anterior + direção_do_cursor × valor_digitado
```

Uma função só serve reta, retângulo, círculo e arco. Não escreva caso especial
por ferramenta; se precisou, o desenho está errado.

**4a — campo de entrada flutuante.** Com uma ferramenta ativa esperando ponto,
aparece um campo junto ao cursor. Digitar número + `Enter` coloca o ponto naquela
direção, naquela distância. `Tab` alterna entre comprimento e ângulo. `Esc`
cancela o ponto pendente.

**Regra sem exceção: toda ferramenta de desenho aceita as duas entradas** —
clique ou valor digitado. Se alguma só aceita clique ao final da etapa, a etapa
não terminou.

**4b — cota como entidade (a trena).** Novo tipo `dim` em `CAD_FIELDS`, guardando:
entidade referenciada, qual medida ela lê, e onde o texto fica. Move a entidade,
a cota acompanha e o valor atualiza sozinho.

O fluxo é o que o Leonardo descreveu: seleciona a reta, clica onde quer a cota,
direciona, e o valor aparece.

**4c — cota que manda (o gabarito).** Editar o valor da cota escreve de volta no
campo da entidade:

```
dim {ref:3, medida:'comprimento'}  →  escreve em  #3.x2
dim {ref:7, medida:'raio'}         →  escreve em  #7.r
```

**Sem solver.** Cada cota governa um campo de uma entidade — é por isso que isso
cabe aqui. Medida que precisa mexer em várias entidades ao mesmo tempo é assunto
dos vínculos (painel 03), que são expressões e usam o motor do `fichas.js`.
Se aparecer um caso que exige resolver várias medidas juntas, **pare e pergunte**;
não comece a escrever solver.

**Aceite:** desenhar uma reta digitando 150 e ela sair com 150; mover o ponto e a
cota acompanhar; editar a cota para 200 e a reta esticar; o mesmo ciclo com
raio de círculo. `verificar.cjs` passa.

---

### Etapa 5 — contorno e faceamento sobre o desenho

Com a via provada, mais dois tipos:

- **Faceamento** a partir de `FEATURES.limites()` — a área que a peça ocupa.
- **Contorno** a partir de uma cadeia fechada de retas/arcos, com escolha de lado
  (dentro/fora) e sentido.

Chanfro e escareado só depois que o contorno estiver de pé — ambos dependem dele.

**Aceite:** desenhar o retângulo com o rebaixo curvo da imagem, gerar contorno
externo, e o preview 3D mostrar o caminho acompanhando o desenho.

---

### Etapa 6 — os números da simulação

O painel **05** da imagem mostra tempo estimado, material removido e comprimento
de trajetória. O `execNC` (`src/core/simulador.js`) já devolve os segmentos do
caminho — falta somar.

- comprimento: soma dos segmentos;
- tempo: comprimento ÷ avanço, separando rápido de corte;
- material removido: aproximação por volume dos blocos (é estimativa, rotule como
  tal na tela).

**Aceite:** os três números aparecem e são coerentes com um programa conhecido.

---

## 5. Depois (direção, não especificação)

Não escreva código para estes antes de chegar neles — o desenho deles depende do
que as etapas 1–5 ensinarem:

- **Importação SVG/DXF.** Com um modelo de geometria só, importar vira mais um
  produtor de entidades. Barato depois da etapa 2, caro antes.
- **Medidas vinculadas (painel 03).** O `src/core/fichas.js` já resolve expressões
  sem `eval` — é o mesmo motor, um nível acima: vínculos no nível da peça.
- **Biblioteca de projetos (painel 01)** com miniaturas e versões.

---

## 6. Protocolo de teste

```bash
node --check <cada .js alterado ou novo>
node ferramentas/verificar.cjs            # hash deve bater
```

Mais, em toda etapa que mexe em geometria: abrir um `.json` salvo antes da fase e
conferir que o G-code sai igual.

No navegador (`localhost:8000`): console sem erro, e a tela comparada com a imagem.

Se `verificar.cjs` divergir: **reverta a etapa**, não conserte por cima.

---

## 7. Entrega por etapa

Sem preâmbulo:

1. O diff (`git diff`), um arquivo por vez.
2. Saída do `node --check` e do `verificar.cjs`.
3. Uma linha sobre o que mudou de comportamento para o usuário.
4. O que na imagem ainda não bate, se sobrou algo.
5. Pergunta: seguir para a próxima etapa?

**Não commitar sem aprovação do Leonardo.**

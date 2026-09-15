"use strict";
/* ============================================================
   VERIFICAR.CJS — rede de proteção da Etapa 0 (INSTRUCAO-ARQUITETURA.md)
   Carrega os módulos de src/core/ + dados/estrategias.js em Node (stub
   minimo de document via um $ global) num vm.Context compartilhado, monta
   um projeto de referencia fixo (operacao nativa + ficha JSON + macro
   custom), chama gerarPrograma() e compara o SHA-256 da saida com
   ferramentas/baseline.txt.

   node ferramentas/verificar.cjs            # compara com o baseline
   node ferramentas/verificar.cjs --salvar    # grava ferramentas/baseline.txt
   ============================================================ */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");

const RAIZ = path.join(__dirname, "..");
const BASELINE = path.join(__dirname, "baseline.txt");

/* Stub dos 6 campos fixos que cfg() (src/core/programa.js) lê via $() —
   o motor não toca no DOM fora disso. */
const CAMPOS = {
  "g-nome": { value: "PROJETO_TESTE" },
  "g-seg": { value: "25" },
  "g-bx": { value: "200" },
  "g-by": { value: "140" },
  "g-bz": { value: "50" },
  "g-g53": { checked: true },
};

const sandbox = {};
sandbox.$ = (id) => CAMPOS[id] || { value: "", checked: false };
const contexto = vm.createContext(sandbox);

function carregar(nomeArquivo) {
  const codigo = fs.readFileSync(path.join(RAIZ, nomeArquivo), "utf8");
  vm.runInContext(codigo, contexto, { filename: nomeArquivo });
}

carregar("src/core/formato.js");
carregar("src/core/simulador.js");
carregar("src/core/operacoes.js");
carregar("src/core/macros.js");
carregar("src/core/fichas.js");
carregar("src/core/features.js");
carregar("src/core/programa.js");
carregar("src/core/corte.js");
carregar("dados/estrategias.js");

/* Projeto de referência: 1 operação nativa + 1 ficha JSON + 1 macro
   custom, na mesma ordem em que addBloco() monta um bloco na UI
   (defaults de D.params + defaults de F_TROCA, depois overrides). */
const setup = `
  SEQ.length = 0;
  function novoBloco(tipo, overrides) {
    const D = DEFS[tipo];
    const p = {};
    D.params.forEach(f => p[f.k] = f.d);
    F_TROCA.forEach(f => p[f.k] = f.d);
    Object.assign(p, overrides || {});
    SEQ.push({ uid: UID++, tipo, aberto: true, p });
  }

  novoBloco("furosL", { t: 1, td: 8, ts: 3000, th: 1, tdd: 1 });
  novoBloco("canalAbertoSimples", { t: 2, td: 10, ts: 4000, th: 2, tdd: 2 });

  registrarCustom("cst1", {
    nome: "Macro de teste",
    sub: "verificar.cjs",
    corIdx: 0,
    params: [
      { k: "cx", l: "Centro X", d: 0, s: 1, u: "mm" },
      { k: "cy", l: "Centro Y", d: 0, s: 1, u: "mm" },
      { k: "ap", l: "Passo Z", d: 1, s: 0.1, u: "mm" },
      { k: "prof", l: "Profundidade", d: 10, s: 0.5, u: "mm" },
      { k: "fz", l: "F de mergulho", d: 150, s: 10, u: "mm/min" },
    ],
    codigo: CODIGO_MODELO,
    vars: {},
  });
  novoBloco("cst1", { t: 3, td: 6, ts: 5000, th: 3, tdd: 3 });

  globalThis.__PROGRAMA__ = gerarPrograma();
`;
vm.runInContext(setup, contexto, { filename: "verificar-setup.js" });

const programa = sandbox.__PROGRAMA__;
const hash = crypto.createHash("sha256").update(programa, "utf8").digest("hex");

if (process.argv.includes("--salvar")) {
  fs.writeFileSync(BASELINE, hash + "\n");
  console.log("Baseline salvo:", hash);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error("Baseline nao encontrado. Rode com --salvar primeiro.");
  process.exit(1);
}

const esperado = fs.readFileSync(BASELINE, "utf8").trim();
if (hash === esperado) {
  console.log("OK", hash);
  process.exit(0);
} else {
  console.error("DIVERGIU");
  console.error("esperado:", esperado);
  console.error("obtido:  ", hash);
  process.exit(1);
}

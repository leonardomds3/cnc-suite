"use strict";
/* ============================================================
   BUILD-ESTRATEGIAS.JS — regenera dados/estrategias.js a partir dos
   .json de familia (INSTRUCAO-ARQUITETURA.md, Etapa 3). Fonte da
   verdade: dados/estrategias_*.json. Le cada .json de familia, na
   ordem canal -> escareado -> bolsa, e concatena as fichas de
   "estrategias" de cada um dentro do template fixo (cabecalho +
   "versao"/"motor", identicos em todos os .json, + rodape de
   registro). Nunca edite dados/estrategias.js a mao: mude o .json da
   familia e rode este script.

   node ferramentas/build-estrategias.js
   ============================================================ */
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const DADOS = path.join(RAIZ, "dados");
const SAIDA = path.join(DADOS, "estrategias.js");

const ARQUIVOS_FAMILIA = [
  "estrategias_canal.json",
  "estrategias_escareado.json",
  "estrategias_bolsa.json",
];

const CABECALHO =
  '"use strict";\n' +
  "/* ============================================================\n" +
  "   ESTRATEGIAS.JS — ARQUIVO DERIVADO, NAO EDITE A MAO\n" +
  "   Fonte da verdade: os arquivos de familia estrategias_*.json\n" +
  "   (um por familia: estrategias_canal.json,\n" +
  "   estrategias_escareado.json, ...). Este arquivo e a UNIAO das\n" +
  "   estrategias de todos eles, embrulhada em script classico,\n" +
  "   porque fetch() de .json falha em file:// e os apps abrem por\n" +
  "   duplo clique.\n" +
  "   Quando qualquer .json de familia mudar, regenere este arquivo:\n" +
  '   cabecalho (ate a linha do "=") + objeto com "versao", "motor"\n' +
  '   (identico em todos os .json) e "estrategias" = uniao das\n' +
  "   estrategias de todos os arquivos de familia, na ordem canal,\n" +
  "   escareado, ... + rodape de registro.\n" +
  "   Futuramente isso vira um passo de build automatico.\n" +
  "   ============================================================ */\n";

const RODAPE =
  "/* boot: registra as fichas padrao como operacoes do DEFS */\n" +
  "Object.entries(ESTRATEGIAS_PADRAO.estrategias).forEach(([id, est]) => registrarEstrategia(id, est));\n";

/* Extrai o texto bruto (preserva a formatacao manual do .json) do
   valor de "estrategias": { ... }, por contagem de chaves — nao dá
   pra usar JSON.stringify aqui porque perderia o alinhamento em
   colunas que os arquivos de familia mantêm a mao. */
function extrairBlocoEstrategias(texto, nomeArquivo) {
  const chave = '"estrategias": {';
  const inicio = texto.indexOf(chave);
  if (inicio < 0) throw new Error(`"estrategias" nao encontrado em ${nomeArquivo}`);
  const idxAbre = inicio + chave.length - 1;
  let profundidade = 0;
  let i = idxAbre;
  for (; i < texto.length; i++) {
    if (texto[i] === "{") profundidade++;
    else if (texto[i] === "}") {
      profundidade--;
      if (profundidade === 0) break;
    }
  }
  if (profundidade !== 0) throw new Error(`chave de "estrategias" nao fechou em ${nomeArquivo}`);
  return texto.slice(idxAbre + 1, i).trim();
}

const jsons = ARQUIVOS_FAMILIA.map((nome) => ({
  nome,
  texto: fs.readFileSync(path.join(DADOS, nome), "utf8"),
}));

const dados = jsons.map(({ nome, texto }) => JSON.parse(texto));
const versao = dados[0].versao;
const motor = dados[0].motor;
dados.forEach((d, idx) => {
  if (d.versao !== versao) {
    throw new Error(`"versao" diverge em ${ARQUIVOS_FAMILIA[idx]}: esperado ${versao}, achou ${d.versao}`);
  }
  if (JSON.stringify(d.motor) !== JSON.stringify(motor)) {
    throw new Error(`"motor" diverge em ${ARQUIVOS_FAMILIA[idx]} — deve ser identico em todos os .json`);
  }
});

const cabecalhoObjeto = JSON.stringify({ versao, motor, estrategias: {} }, null, 2);
const marcaEstrategias = '"estrategias": {';
const prefixoObjeto = cabecalhoObjeto.slice(0, cabecalhoObjeto.indexOf(marcaEstrategias) + marcaEstrategias.length);

const blocos = jsons.map(({ nome, texto }) => extrairBlocoEstrategias(texto, nome));
const entradas = blocos.map((b) => "    " + b).join(",\n");

const saida =
  CABECALHO +
  "const ESTRATEGIAS_PADRAO =\n" +
  prefixoObjeto +
  "\n" +
  entradas +
  "\n  }\n}\n;\n" +
  RODAPE;

fs.writeFileSync(SAIDA, saida);
console.log("Gerado:", path.relative(RAIZ, SAIDA));

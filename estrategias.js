"use strict";
/* ============================================================
   ESTRATEGIAS.JS — ARQUIVO DERIVADO, NAO EDITE A MAO
   Fonte da verdade: os arquivos de familia estrategias_*.json
   (um por familia: estrategias_canal.json,
   estrategias_escareado.json, ...). Este arquivo e a UNIAO das
   estrategias de todos eles, embrulhada em script classico,
   porque fetch() de .json falha em file:// e os apps abrem por
   duplo clique.
   Quando qualquer .json de familia mudar, regenere este arquivo:
   cabecalho (ate a linha do "=") + objeto com "versao", "motor"
   (identico em todos os .json) e "estrategias" = uniao das
   estrategias de todos os arquivos de familia, na ordem canal,
   escareado, ... + rodape de registro.
   Futuramente isso vira um passo de build automatico.
   ============================================================ */
const ESTRATEGIAS_PADRAO =
{
  "versao": 1,
  "motor": {
    "fornecidos_pelo_motor": {
      "diam": "diametro da ferramenta ativa (vem do bloco/cfg, nunca e input da estrategia)",
      "nb": "base de rotulos N da operacao (i*100) - placeholders podem usar expressoes: {nb+10}, {nb+20}",
      "#26": "Z de seguranca global, ja definido no cabecalho - a estrategia so usa, nunca define"
    },
    "regras_de_interpretacao": [
      "1. Ler inputs do usuario",
      "2. Calcular derivadas na ordem declarada (podem usar inputs e derivadas anteriores)",
      "3. Avaliar avisos - exibir na lista amarela, NUNCA bloquear a geracao",
      "4. Resolver placeholders {chave} do template com fnum() - inputs entram no codigo APENAS como atribuicao de variavel; todo movimento usa expressoes [#n]",
      "5. Emitir as linhas do template na ordem"
    ]
  },
  "estrategias": {
    "canalAbertoSimples": {
      "nome": "Canal aberto - simples",
      "familia": "canal",
      "cor": "#4dd0e1",
      "descricao": "Canal passante (pontas abertas), largura ate Ofresa + 2x raio de expansao leve. Mergulho fora da peca, um contorno por nivel de Z: rasga o comprimento, abre para as duas paredes de uma vez e fecha o laco no ponto de partida.",
      "inputs": [
        { "k": "larg",   "l": "Largura do canal",        "d": 16,  "s": 0.5, "u": "mm" },
        { "k": "comp",   "l": "Comprimento do canal",    "d": 120, "s": 1,   "u": "mm" },
        { "k": "prof",   "l": "Profundidade",            "d": 10,  "s": 0.5, "u": "mm" },
        { "k": "passoZ", "l": "Passo Z (ap)",            "d": 1,   "s": 0.1, "u": "mm" },
        { "k": "folga",  "l": "Folga de aproximacao",    "d": 4,   "s": 1,   "u": "mm" },
        { "k": "f",      "l": "Avanco",                  "d": 800, "s": 50,  "u": "mm/min" },
        { "k": "cx",     "l": "Centro X",                "d": 0,   "s": 1,   "u": "mm" },
        { "k": "cy",     "l": "Centro Y",                "d": 0,   "s": 1,   "u": "mm" }
      ],
      "derivadas": {
        "rf":    "diam/2",
        "offY":  "(larg-diam)/2",
        "xAprox": "comp/2 + rf + folga"
      },
      "avisos": [
        { "se": "larg <= diam",       "msg": "LARGURA MENOR OU IGUAL AO DIAMETRO DA FRESA" },
        { "se": "offY > rf",          "msg": "EXPANSAO POR PAREDE MAIOR QUE O RAIO DA FRESA - USE CANAL COM EXPANSAO" },
        { "se": "passoZ > diam/2",    "msg": "PASSO Z MAIOR QUE MEIO DIAMETRO DA FRESA" }
      ],
      "template": [
        "#23={cx}(CENTRO X)",
        "#24={cy}(CENTRO Y)",
        "#1={passoZ}(PASSO Z)",
        "#2=0(Z ATUAL)",
        "#4={prof}(PROFUNDIDADE)",
        "#5={offY}(OFFSET Y = [LARG-DIAM]/2)",
        "#7={xAprox}(X APROX = MEIO COMP + RAIO + FOLGA)",
        "#10={f}(AVANCO)",
        "G0X[#23+#7]Y[#24+#5]",
        "G0Z2.",
        "N{nb+10}#2=#2+#1",
        "IF[#2GE#4]THEN#2=#4",
        "G0Z[0.5-#2]",
        "G1Z-[#2]F[#10/2](MERGULHO FORA DA PECA)",
        "G1X[#23-#7]F[#10]",
        "G1Y[#24-#5]",
        "G1X[#23+#7]",
        "G1Y[#24+#5]",
        "IF[#2LT#4]GOTO{nb+10}",
        "G0Z[#26]"
      ]
    },
    "canalAbertoExpansao": {
      "nome": "Canal aberto - com expansao",
      "familia": "canal",
      "cor": "#4dd0e1",
      "descricao": "Canal passante largo (largura >> Ofresa). Por nivel de Z: rasga o centro, depois abre a largura em voltas de ida e volta - cada volta encosta +passe numa parede indo e +passe na outra voltando, ate o clamp fechar na meia largura util. Direcao do rasgo alterna (#13) a cada nivel para nunca dar G0 dentro de material nao cortado.",
      "inputs": [
        { "k": "larg",         "l": "Largura do canal",     "d": 24,  "s": 0.5, "u": "mm" },
        { "k": "comp",         "l": "Comprimento do canal", "d": 120, "s": 1,   "u": "mm" },
        { "k": "prof",         "l": "Profundidade",         "d": 10,  "s": 0.5, "u": "mm" },
        { "k": "passoZ",       "l": "Passo Z (ap)",         "d": 1,   "s": 0.1, "u": "mm" },
        { "k": "passeLateral", "l": "Passe lateral por parede (ae)", "d": 2, "s": 0.5, "u": "mm" },
        { "k": "folga",        "l": "Folga de aproximacao", "d": 4,   "s": 1,   "u": "mm" },
        { "k": "f",            "l": "Avanco",               "d": 800, "s": 50,  "u": "mm/min" },
        { "k": "cx",           "l": "Centro X",             "d": 0,   "s": 1,   "u": "mm" },
        { "k": "cy",           "l": "Centro Y",             "d": 0,   "s": 1,   "u": "mm" }
      ],
      "derivadas": {
        "rf":     "diam/2",
        "offMax": "(larg-diam)/2",
        "xAprox": "comp/2 + rf + folga"
      },
      "avisos": [
        { "se": "larg <= diam",              "msg": "LARGURA MENOR OU IGUAL AO DIAMETRO DA FRESA" },
        { "se": "passeLateral > 0.95*diam",  "msg": "PASSE LATERAL MAIOR QUE 95 PORCENTO DO DIAMETRO" },
        { "se": "passeLateral >= offMax",    "msg": "UMA VOLTA SO JA ABRE TUDO - CANAL SIMPLES RESOLVE" },
        { "se": "passoZ > diam/2",           "msg": "PASSO Z MAIOR QUE MEIO DIAMETRO DA FRESA" }
      ],
      "template": [
        "#23={cx}(CENTRO X)",
        "#24={cy}(CENTRO Y)",
        "#1={passoZ}(PASSO Z)",
        "#2=0(Z ATUAL)",
        "#4={prof}(PROFUNDIDADE)",
        "#5={offMax}(OFFSET MAX = [LARG-DIAM]/2)",
        "#7={xAprox}(X APROX = MEIO COMP + RAIO + FOLGA)",
        "#10={f}(AVANCO)",
        "#12={passeLateral}(PASSE LATERAL POR PAREDE)",
        "#13=1(DIRECAO)",
        "G0X[#23+#7]Y[#24]",
        "G0Z2.",
        "N{nb+10}#2=#2+#1",
        "IF[#2GE#4]THEN#2=#4",
        "G0Z[0.5-#2]",
        "G1Z-[#2]F[#10/2](MERGULHO FORA DA PECA)",
        "G1X[#23-[#7*#13]]F[#10](RASGO CENTRAL)",
        "#15=0(OFFSET ATUAL)",
        "N{nb+20}#15=#15+#12",
        "IF[#15GE#5]THEN#15=#5",
        "G1Y[#24+#15]",
        "G1X[#23+[#7*#13]]",
        "G1Y[#24-#15]",
        "G1X[#23-[#7*#13]]",
        "IF[#15LT#5]GOTO{nb+20}",
        "G1Y[#24]",
        "#13=0-#13",
        "IF[#2LT#4]GOTO{nb+10}",
        "G0Z[#26]"
      ]
    },
    "escareadoHelicoidal": {
      "nome": "Escareado helicoidal",
      "familia": "escareado",
      "cor": "#6fe0ac",
      "descricao": "Escareado com angulo e diametro quaisquer, para quando nao ha ferramenta especifica. Interpolacao helicoidal G3: a cada volta o Z desce um incremento e o raio de trabalho encolhe TAN do angulo, formando o cone. Convertido do programa anotado do Leo (programas_anotados/escareado_helicoidal.NC).",
      "inputs": [
        { "k": "furoDiam", "l": "Diametro inicial do escareado", "d": 40,   "s": 0.5,  "u": "mm" },
        { "k": "ang",      "l": "Angulo com o eixo Z",           "d": 66.8, "s": 0.1,  "u": "graus" },
        { "k": "prof",     "l": "Profundidade final",            "d": 6,    "s": 0.1,  "u": "mm" },
        { "k": "ap",       "l": "Incremento Z (ap)",             "d": 0.1,  "s": 0.05, "u": "mm" },
        { "k": "zIni",     "l": "Z inicial",                     "d": 0,    "s": 0.1,  "u": "mm" },
        { "k": "f",        "l": "Avanco",                        "d": 800,  "s": 50,   "u": "mm/min" },
        { "k": "cx",       "l": "Centro X (origem)",             "d": 0,    "s": 1,    "u": "mm" },
        { "k": "cy",       "l": "Centro Y (origem)",             "d": 0,    "s": 1,    "u": "mm" }
      ],
      "derivadas": {
        "rt": "(furoDiam - diam)/2"
      },
      "avisos": [
        { "se": "furoDiam <= diam", "msg": "DIAMETRO DO ESCAREADO MENOR OU IGUAL AO DIAMETRO DA FERRAMENTA" },
        { "se": "ang >= 90",        "msg": "ANGULO DEVE SER MENOR QUE 90 GRAUS" },
        { "se": "ang <= 0",         "msg": "ANGULO DEVE SER MAIOR QUE 0 GRAUS" },
        { "se": "zIni >= prof",     "msg": "Z INICIAL MAIOR OU IGUAL A PROFUNDIDADE FINAL - NADA A USINAR" }
      ],
      "template": [
        "#23={cx}(CENTRO X)",
        "#24={cy}(CENTRO Y)",
        "#1={ap}(INCREMENTO Z)",
        "#2={zIni}(Z INICIAL)",
        "#7={ang}(ANGULO COM O EIXO Z)",
        "#4={prof}(PROFUNDIDADE FINAL)",
        "#5={rt}(RAIO DE TRABALHO = [FURO-FERRAMENTA]/2)",
        "#10={f}(AVANCO)",
        "G0X[#23]Y[#24]",
        "G0Z0.",
        "N{nb+10}#2=#2+#1",
        "#3=#2*TAN[#7]",
        "#6=#5-#3(RAIO NESTE PASSE)",
        "IF[#2GT#4]GOTO{nb+20}",
        "G1X[#6+#23]F[#10]",
        "G3I-[#6]J0Z-[#2]",
        "GOTO{nb+10}",
        "N{nb+20}G0Z[#26]"
      ]
    }
  }
}
;
/* boot: registra as fichas padrao como operacoes do DEFS */
Object.entries(ESTRATEGIAS_PADRAO.estrategias).forEach(([id, est]) => registrarEstrategia(id, est));

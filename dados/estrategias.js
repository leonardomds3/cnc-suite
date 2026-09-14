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
        { "se": "passoZ <= 0",          "msg": "PASSO Z (AP) DEVE SER MAIOR QUE ZERO - AJUSTE O CAMPO (O LACO NAO AVANCA ATE A PROFUNDIDADE)" },
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
    "canalRaiadoDesbaste": {
      "nome": "Canal raiado - desbaste",
      "familia": "canal",
      "cor": "#4dd0e1",
      "descricao": "Desbaste do canal de fundo raiado (raio R no fundo, ao longo do Y). Acima da prof das pontas (#11) o fundo e reto e o meio comprimento e fixo (#8); abaixo dela cada nivel segue o arco (#9 = SQRT[R2 - (R-falta)2]). Por nivel: mergulho em rampa ao longo do Y, depois expansao lateral em X com passe #12 ate o clamp na meia largura util (#5), como no canalAbertoExpansao. Direcao alterna (#13) a cada nivel. O mesmo IF do #11 seleciona AP e avanco da fase: apReta/fReta na parte reta (incremento fora da peca), apRaio/fRaio no fundo em U (mergulho direto no material). O ultimo passo da parte reta para exatamente no #11 (teto #16), para a transicao reta-raio ficar limpa. Deixa sobremetal lateral para a ficha de acabamento.",
      "inputs": [
        { "k": "cx",    "l": "Centro X",            "d": 0,   "s": 1,    "u": "mm" },
        { "k": "cy",    "l": "Centro Y",            "d": 0,   "s": 1,    "u": "mm" },
        { "k": "comp",  "l": "Comprimento (Y)",     "d": 110, "s": 1,    "u": "mm" },
        { "k": "larg",  "l": "Largura (X)",         "d": 20,  "s": 0.5,  "u": "mm" },
        { "k": "prof",  "l": "Prof. no centro",     "d": 12,  "s": 0.5,  "u": "mm" },
        { "k": "raio",  "l": "Raio do fundo",       "d": 115, "s": 1,    "u": "mm" },
        { "k": "profp", "l": "Prof. nas pontas",    "d": 6,   "s": 0.5,  "u": "mm" },
        { "k": "apReta", "l": "AP parte reta",      "d": 0,   "s": 0.1,  "u": "mm" },
        { "k": "apRaio", "l": "AP fundo raiado",    "d": 0,   "s": 0.1,  "u": "mm" },
        { "k": "ae",     "l": "Passe lateral (ae)", "d": 4,   "s": 0.5,  "u": "mm" },
        { "k": "fReta",  "l": "F parte reta",       "d": 0,   "s": 50,   "u": "mm/min" },
        { "k": "fRaio",  "l": "F fundo raiado",     "d": 0,   "s": 50,   "u": "mm/min" },
        { "k": "sobre", "l": "Sobremetal lateral",  "d": 0.5, "s": 0.1,  "u": "mm" }
      ],
      "derivadas": {
        "rf":           "diam/2",
        "meiaCompUtil": "comp/2 - rf",
        "offMax":       "(larg - 2*sobre)/2 - rf"
      },
      "avisos": [
        { "se": "diam > larg",                "msg": "FERRAMENTA MAIOR QUE A LARGURA DO CANAL" },
        { "se": "(larg-diam)/2 > 0.005",      "msg": "FRESA MAIS ESTREITA QUE O CANAL - FOLGA LATERAL FICA PARA O SOBREMETAL/ACABAMENTO" },
        { "se": "profp >= prof",              "msg": "PROF NAS PONTAS DEVE SER MENOR QUE A PROF NO CENTRO" },
        { "se": "raio < prof - profp",        "msg": "RAIO DO FUNDO MENOR QUE A QUEDA (PROF - PROF PONTAS): GEOMETRIA IMPOSSIVEL" },
        { "se": "raio*raio - (raio-(prof-profp))*(raio-(prof-profp)) > (comp/2)*(comp/2)", "msg": "O ARCO DO FUNDO E MAIS COMPRIDO QUE O CANAL: AUMENTE O COMPRIMENTO OU O RAIO" },
        { "se": "apReta <= 0", "msg": "AP DA PARTE RETA NAO DEFINIDO - AJUSTE O CAMPO (AP ZERO TRAVA O LACO DE Z NA MAQUINA)" },
        { "se": "apRaio <= 0", "msg": "AP DO FUNDO RAIADO NAO DEFINIDO - AJUSTE O CAMPO (AP ZERO TRAVA O LACO DE Z NA MAQUINA)" },
        { "se": "fReta <= 0",  "msg": "AVANCO DA PARTE RETA NAO DEFINIDO - AJUSTE O CAMPO" },
        { "se": "fRaio <= 0",  "msg": "AVANCO DO FUNDO RAIADO NAO DEFINIDO - AJUSTE O CAMPO" }
      ],
      "template": [
        "(DESBASTE - SOBREMETAL LATERAL {sobre})",
        "#23={cx}(CENTRO X)",
        "#24={cy}(CENTRO Y)",
        "#7={raio}(RAIO DO FUNDO)",
        "#8={meiaCompUtil}(MEIO COMPRIMENTO UTIL)",
        "IF[#8LT0.1]THEN#8=0.1",
        "#5={offMax}(MEIA LARGURA UTIL DO DESBASTE)",
        "IF[#5LT0]THEN#5=0",
        "#11={profp}(PROF DO FUNDO RETO NAS PONTAS - ONDE COMECA O RAIO)",
        "#1={apReta}(AP INICIAL - PARTE RETA)",
        "#2=0(Z ATUAL)",
        "#4={prof}(PROF NO CENTRO)",
        "#12={ae}(PASSE LATERAL)",
        "#10={fReta}(AVANCO INICIAL - PARTE RETA)",
        "#13=1(DIRECAO)",
        "G0X[#23]Y[#24+#8]",
        "G0Z2.",
        "N{nb+10}#16=#4(TETO DESTE PASSO)",
        "IF[#2LT#11]THEN#16=#11(NA RETA O TETO E A FRONTEIRA)",
        "#2=#2+#1",
        "IF[#2GT#16]THEN#2=#16(ULTIMO PASSO DA RETA ENCOSTA NO #11)",
        "IF[#2GE#4]THEN#2=#4",
        "#3=#4-#2(QUANTO FALTA)",
        "#17=#7-#3",
        "IF[#2LE#11]THEN#9=#8",
        "IF[#2LT#11]THEN#1={apReta}(AP DA PARTE RETA)",
        "IF[#2LE#11]THEN#10={fReta}(AVANCO DA PARTE RETA)",
        "IF[#2GT#11]THEN#9=SQRT[[#7*#7]-[#17*#17]](MEIO COMPRIMENTO NESTE NIVEL)",
        "IF[#2GE#11]THEN#1={apRaio}(AP DO RAIO)",
        "IF[#2GT#11]THEN#10={fRaio}(AVANCO DO RAIO)",
        "G1X[#23]Y[#24-[#9*#13]]Z-[#2]F[#10](MERGULHO EM RAMPA AO LONGO DO Y)",
        "#15=0(OFFSET X)",
        "N{nb+20}#15=#15+#12",
        "IF[#15GE#5]THEN#15=#5",
        "G1X[#23+#15]",
        "G1Y[#24+[#9*#13]]",
        "G1X[#23-#15]",
        "G1Y[#24-[#9*#13]]",
        "IF[#15LT#5]GOTO{nb+20}",
        "G1X[#23]",
        "#13=0-#13",
        "IF[#2LT#4]GOTO{nb+10}",
        "G0Z[#26]"
      ]
    },
    "canalRaiadoAcabamento": {
      "nome": "Canal raiado - acabamento",
      "familia": "canal",
      "cor": "#4dd0e1",
      "descricao": "Acabamento do canal de fundo raiado: um contorno de parede por nivel de Z, com offset #19 = (larg - diam)/2 calculado com o O da ferramenta ativa. Mesma matematica de arco do desbaste (#9 = #8 na reta, SQRT abaixo do #11). AP e avanco em duas fases pelo IF do #11: apReta/fReta na parte reta, apRaio/fRaio no fundo em U. O ultimo passo da parte reta para exatamente no #11 (teto #16), para a transicao reta-raio ficar limpa. Roda depois da ficha canalRaiadoDesbaste, na mesma geometria.",
      "inputs": [
        { "k": "cx",     "l": "Centro X",           "d": 0,   "s": 1,    "u": "mm" },
        { "k": "cy",     "l": "Centro Y",           "d": 0,   "s": 1,    "u": "mm" },
        { "k": "comp",   "l": "Comprimento (Y)",    "d": 110, "s": 1,    "u": "mm" },
        { "k": "larg",   "l": "Largura (X)",        "d": 20,  "s": 0.5,  "u": "mm" },
        { "k": "prof",   "l": "Prof. no centro",    "d": 12,  "s": 0.5,  "u": "mm" },
        { "k": "raio",   "l": "Raio do fundo",      "d": 115, "s": 1,    "u": "mm" },
        { "k": "profp",  "l": "Prof. nas pontas",   "d": 6,   "s": 0.5,  "u": "mm" },
        { "k": "apReta", "l": "AP parte reta",      "d": 0,   "s": 0.5,  "u": "mm" },
        { "k": "apRaio", "l": "AP fundo raiado",    "d": 0,   "s": 0.05, "u": "mm" },
        { "k": "fReta",  "l": "F parte reta",       "d": 0,   "s": 50,   "u": "mm/min" },
        { "k": "fRaio",  "l": "F fundo raiado",     "d": 0,   "s": 50,   "u": "mm/min" }
      ],
      "derivadas": {
        "rf":           "diam/2",
        "meiaCompUtil": "comp/2 - rf",
        "offAcab":      "(larg - diam)/2"
      },
      "avisos": [
        { "se": "diam > larg",   "msg": "FERRAMENTA MAIOR QUE A LARGURA DO CANAL" },
        { "se": "profp >= prof", "msg": "PROF NAS PONTAS DEVE SER MENOR QUE A PROF NO CENTRO" },
        { "se": "raio < prof - profp", "msg": "RAIO DO FUNDO MENOR QUE A QUEDA (PROF - PROF PONTAS): GEOMETRIA IMPOSSIVEL" },
        { "se": "raio*raio - (raio-(prof-profp))*(raio-(prof-profp)) > (comp/2)*(comp/2)", "msg": "O ARCO DO FUNDO E MAIS COMPRIDO QUE O CANAL: AUMENTE O COMPRIMENTO OU O RAIO" },
        { "se": "apReta <= 0", "msg": "AP DA PARTE RETA NAO DEFINIDO - AJUSTE O CAMPO (AP ZERO TRAVA O LACO DE Z NA MAQUINA)" },
        { "se": "apRaio <= 0", "msg": "AP DO FUNDO RAIADO NAO DEFINIDO - AJUSTE O CAMPO (AP ZERO TRAVA O LACO DE Z NA MAQUINA)" },
        { "se": "fReta <= 0",  "msg": "AVANCO DA PARTE RETA NAO DEFINIDO - AJUSTE O CAMPO" },
        { "se": "fRaio <= 0",  "msg": "AVANCO DO FUNDO RAIADO NAO DEFINIDO - AJUSTE O CAMPO" }
      ],
      "template": [
        "(ACABAMENTO - AP {apReta} NA RETA / AP {apRaio} NO RAIO)",
        "(A PROF DAS PONTAS #11 SEPARA OS DOIS AP)",
        "#23={cx}(CENTRO X)",
        "#24={cy}(CENTRO Y)",
        "#7={raio}(RAIO DO FUNDO)",
        "#8={meiaCompUtil}(MEIO COMPRIMENTO UTIL)",
        "IF[#8LT0.1]THEN#8=0.1",
        "#11={profp}(PROF DO FUNDO RETO NAS PONTAS - ONDE COMECA O RAIO)",
        "#4={prof}(PROF NO CENTRO)",
        "#19={offAcab}(OFFSET DO ACABAMENTO = [LARG-DIAM]/2)",
        "#2=0(Z ATUAL)",
        "G0X[#23]Y[#24+#8]",
        "G0Z2.",
        "N{nb+10}IF[#2LT#11]THEN#1={apReta}(AP DA PARTE RETA)",
        "IF[#2GE#11]THEN#1={apRaio}(AP DO RAIO)",
        "#16=#4(TETO DESTE PASSO)",
        "IF[#2LT#11]THEN#16=#11(NA RETA O TETO E A FRONTEIRA)",
        "#2=#2+#1",
        "IF[#2GT#16]THEN#2=#16(ULTIMO PASSO DA RETA ENCOSTA NO #11)",
        "IF[#2GT#4]THEN#2=#4",
        "#3=#4-#2(QUANTO FALTA)",
        "#17=#7-#3",
        "IF[#2LE#11]THEN#9=#8",
        "IF[#2LE#11]THEN#10={fReta}(AVANCO DA PARTE RETA)",
        "IF[#2GT#11]THEN#9=SQRT[[#7*#7]-[#17*#17]](MEIO COMPRIMENTO NESTE NIVEL)",
        "IF[#2GT#11]THEN#10={fRaio}(AVANCO DO RAIO)",
        "G0X[#23]Y[#24+#9]",
        "G1Z-[#2]F[#10]",
        "G1X[#23+#19]",
        "G1Y[#24-#9]",
        "G1X[#23-#19]",
        "G1Y[#24+#9]",
        "G1X[#23]",
        "IF[#2LT#4]GOTO{nb+10}",
        "G0Z[#26]"
      ]
    },
    "canalRaiadoConcentrico": {
      "nome": "Canal raiado - concentrico",
      "familia": "canal",
      "cor": "#4da3e1",
      "descricao": "Desbaste do canal de fundo raiado sobre peca com vazio concentrico pre-desbastado (modelo validado contra o CAM 1-PESCADOR.NC). Arco do fundo no plano XZ: raio R com centro X0 a (R - profCentro) ACIMA da juncao; a cada nivel o X util vem de SQRT[R2 - dist2] como no canalRaiadoDesbaste. Vazio esferico concentrico na juncao (O do furo como chega): a cada nivel e linha Y, o vazio vai ate SQRT[rFuro2 - z2 - y2] - o modelo esfera e o lado seguro mesmo se o vazio real for cilindrico. FASE 1 (enquanto a fresa + folga cabem no vazio da linha interna): mergulho vertical sobre o vazio e corte ate o arco, dois lados +X/-X, expansao em Y com passe e clamp. FASE 2: passe unico cruzando X0 com entrada em rampa da borda ao centro. Topo raso: fim do passe clampado no xSaida. Espelhamento G51.1 Y0 opcional para o canal oposto. Defaults do CAM de referencia (APKT25, AP 0.3, F2500).",
      "inputs": [
        { "k": "espelharY", "l": "Espelhar em Y (canal oposto)", "d": 0, "s": 1, "sel": [
          { "v": 0, "t": "Nao" },
          { "v": 1, "t": "Sim - G51.1 Y0" }
        ] },
        { "k": "raio",       "l": "Raio do arco do fundo",          "d": 215.9, "s": 0.5,  "u": "mm" },
        { "k": "profCentro", "l": "Prof. do arco no centro (X0)",   "d": 144.8, "s": 0.5,  "u": "mm" },
        { "k": "sobreArco",  "l": "Sobremetal no arco",             "d": 1,     "s": 0.1,  "u": "mm" },
        { "k": "diamFuro",   "l": "O do furo/vazio como chega",     "d": 220,   "s": 0.5,  "u": "mm" },
        { "k": "folga",      "l": "Folga de mergulho no vazio",     "d": 5,     "s": 0.5,  "u": "mm" },
        { "k": "cy",         "l": "Centro Y do canal",              "d": 33.02, "s": 0.5,  "u": "mm" },
        { "k": "larg",       "l": "Largura do canal (projeto)",     "d": 32.02, "s": 0.5,  "u": "mm" },
        { "k": "sobreLat",   "l": "Sobremetal lateral",             "d": 1,     "s": 0.1,  "u": "mm" },
        { "k": "ae",         "l": "Passe lateral (Y)",              "d": 5.1,   "s": 0.5,  "u": "mm" },
        { "k": "xSaida",     "l": "X de saida no topo (simetrico)", "d": 229.5, "s": 0.5,  "u": "mm" },
        { "k": "ap",         "l": "Incremento Z (ap)",              "d": 0.3,   "s": 0.05, "u": "mm" },
        { "k": "fCorte",     "l": "Avanco de corte",                "d": 2500,  "s": 50,   "u": "mm/min" },
        { "k": "fMerg",      "l": "Avanco de mergulho/rampa",       "d": 2500,  "s": 50,   "u": "mm/min" }
      ],
      "derivadas": {
        "rf":       "diam/2",
        "ra":       "raio - sobreArco",
        "hc":       "raio - profCentro",
        "rFuro":    "diamFuro/2",
        "rFuro2":   "rFuro*rFuro",
        "offMax":   "(larg - 2*sobreLat)/2 - rf",
        "yIda":     "cy - offMax",
        "limMerg":  "rf + folga",
        "limMerg2": "limMerg*limMerg",
        "profMax":  "SQRT(ra*ra - rf*rf) - hc",
        "zTroca":   "SQRT(rFuro2 - yIda*yIda - limMerg2)",
        "xFuroJun": "SQRT(rFuro2 - yIda*yIda)"
      },
      "avisos": [
        { "se": "ap <= 0",       "msg": "INCREMENTO AP NAO DEFINIDO - AJUSTE O CAMPO (AP ZERO = LOOP INFINITO NA MAQUINA)" },
        { "se": "fCorte <= 0",   "msg": "AVANCO DE CORTE NAO DEFINIDO - AJUSTE O CAMPO" },
        { "se": "fMerg <= 0",    "msg": "AVANCO DE MERGULHO NAO DEFINIDO - AJUSTE O CAMPO" },
        { "se": "xSaida <= 0",   "msg": "X DE SAIDA NAO DEFINIDO - AJUSTE O CAMPO" },
        { "se": "profCentro >= raio", "msg": "PROF NO CENTRO MAIOR OU IGUAL AO RAIO DO ARCO - GEOMETRIA IMPOSSIVEL" },
        { "se": "ra <= rf",      "msg": "FRESA MAIOR QUE O ARCO UTIL - GEOMETRIA IMPOSSIVEL" },
        { "se": "offMax < 0",    "msg": "FERRAMENTA MAIOR QUE A LARGURA UTIL DO CANAL (CLAMP EM 0 NO CODIGO)" },
        { "se": "yIda < 0",      "msg": "CANAL CRUZA O CENTRO Y - O MODELO ASSUME CANAL DE UM LADO SO" },
        { "se": "rFuro2 - yIda*yIda - limMerg2 <= 0", "msg": "MERGULHO NAO CABE NO VAZIO EM NENHUM NIVEL - OPERACAO INTEIRA EM FASE 2 (RAMPA)" },
        { "se": "profMax <= 0",  "msg": "PROF MAX UTILIZAVEL ZERO OU NEGATIVA - NADA A USINAR" }
      ],
      "saidas": [
        { "k": "hc",       "l": "Centro do arco acima da juncao",      "u": "mm" },
        { "k": "profMax",  "l": "Prof max utilizavel (quina no arco)", "u": "mm" },
        { "k": "zTroca",   "l": "Z da troca de fase (linha interna)",  "u": "mm" },
        { "k": "xFuroJun", "l": "Vazio na juncao (linha interna)",     "u": "mm" },
        { "k": "offMax",   "l": "Meia largura util",                   "u": "mm" },
        { "k": "yIda",     "l": "Linha interna (Y)",                   "u": "mm" }
      ],
      "template": [
        { "quando": "espelharY == 1", "l": "G51.1Y0.(ESPELHAMENTO CANAL OPOSTO)" },
        "(CANAL RAIADO CONCENTRICO - ARCO R{raio} COM CENTRO {hc} ACIMA DA JUNCAO / VAZIO ESFERICO O{diamFuro})",
        "#7={ra}(RAIO DO ARCO MENOS SOBREMETAL)",
        "#6={hc}(CENTRO DO ARCO ACIMA DA JUNCAO)",
        "#21={rFuro2}(RAIO DO VAZIO AO QUADRADO)",
        "#14={rf}(RAIO DA FRESA)",
        "#20={limMerg}(RAIO DA FRESA + FOLGA)",
        "#18={limMerg2}(LIMITE DO MERGULHO AO QUADRADO)",
        "#22={yIda}(LINHA INTERNA - MAIS PERTO DO CENTRO)",
        "#5={offMax}(MEIA LARGURA UTIL)",
        "IF[#5LT0]THEN#5=0",
        "#25=2*#5(LARGURA UTIL DA EXPANSAO)",
        "#9={xSaida}(X DE SAIDA NO TOPO)",
        "#1={ap}(INCREMENTO Z)",
        "#2=0(Z ATUAL)",
        "#10={fCorte}(AVANCO DE CORTE)",
        "#11={fMerg}(AVANCO DE MERGULHO/RAMPA)",
        "#12={ae}(PASSE LATERAL Y)",
        "#4=SQRT[[#7*#7]-[#14*#14]]-#6(PROF MAX UTILIZAVEL)",
        "N{nb+10}#2=#2+#1(LACO DE NIVEL)",
        "IF[#2GT#4]THEN#2=#4(ULTIMO PASSO ENCOSTA NO FUNDO)",
        "#17=#2+#6(DISTANCIA VERTICAL AO CENTRO DO ARCO)",
        "#8=SQRT[[#7*#7]-[#17*#17]]-#14(X FIM = ARESTA NO ARCO - RAIO DA FRESA)",
        "IF[#8GT#9]THEN#8=#9(CLAMP NA SAIDA - TOPO RASO)",
        "#16=#21-[#2*#2]-[#22*#22](VAZIO AO QUADRADO NA LINHA INTERNA)",
        "IF[#16LE#18]GOTO{nb+40}(SEM ESPACO PRO MERGULHO - FASE 2)",
        "#19=SQRT[#16]-#20(X DE MERGULHO SOBRE O VAZIO)",
        "#13=1(LADO +X)",
        "N{nb+20}G0X[#19*#13]Y[#22]",
        "G0Z[1.-#2]",
        "G1Z-[#2]F[#11](MERGULHO VERTICAL NO VAZIO)",
        "G1X[#8*#13]F[#10](CORTA ATE O ARCO)",
        "#15=0(EXPANSAO Y)",
        "N{nb+25}#15=#15+#12",
        "IF[#15GT#25]THEN#15=#25",
        "G1Y[#22+#15]",
        "G1X[#19*#13](VOLTA AO RECUO)",
        "IF[#15GE#25]GOTO{nb+28}",
        "#15=#15+#12",
        "IF[#15GT#25]THEN#15=#25",
        "G1Y[#22+#15]",
        "G1X[#8*#13](VAI AO ARCO)",
        "IF[#15LT#25]GOTO{nb+25}",
        "N{nb+28}G0Z[1.-#2]",
        "#13=0-#13",
        "IF[#13LT0]GOTO{nb+20}(FAZ O LADO -X)",
        "GOTO{nb+45}",
        "N{nb+40}G0X[#8]Y[#22](FASE 2 - PASSE UNICO)",
        "G0Z[#1-#2](NIVEL ANTERIOR)",
        "G1X0.Z-[#2]F[#11](RAMPA DA BORDA AO CENTRO)",
        "G1X-[#8]F[#10](COMPLETA O PASSE CRUZANDO X0)",
        "#15=0(EXPANSAO Y)",
        "#13=1",
        "N{nb+41}#15=#15+#12",
        "IF[#15GT#25]THEN#15=#25",
        "G1Y[#22+#15]",
        "G1X[#8*#13]",
        "#13=0-#13",
        "IF[#15LT#25]GOTO{nb+41}",
        "G0Z[1.-#2]",
        "N{nb+45}IF[#2LT#4]GOTO{nb+10}",
        "N{nb+50}G0Z[#26]",
        { "quando": "espelharY == 1", "l": "G50.1(CANCELA ESPELHAMENTO)" }
      ]
    },
    "escareadoHelicoidal": {
      "nome": "Escareado helicoidal",
      "familia": "escareado",
      "cor": "#6fe0ac",
      "descricao": "Escareado com angulo e diametro quaisquer, para quando nao ha ferramenta especifica. Interpolacao helicoidal G3: a cada volta o Z desce um incremento e o raio de trabalho encolhe TAN do angulo, formando o cone. Seletor 'Calcular por' com 3 modos, amarrados pela relacao (raioTopo - raioFundo) = prof x TAN(angulo): topo+angulo, fundo+angulo (topo reconstruido) ou dois diametros (angulo por ATAN). O template usa sempre as derivadas canonicas angEfetivo e rt. Convertido do programa anotado do Leo (programas_anotados/escareado_helicoidal.NC).",
      "inputs": [
        { "k": "calcpor", "l": "Calcular por", "d": 1, "s": 1, "sel": [
          { "v": 1, "t": "Diametro do topo + angulo" },
          { "v": 2, "t": "Diametro do fundo + angulo" },
          { "v": 3, "t": "Dois diametros (topo e fundo)" }
        ] },
        { "k": "diamTopo",  "l": "Diametro do topo",    "d": 40,   "s": 0.5,  "u": "mm",    "quando": "calcpor != 2" },
        { "k": "diamFundo", "l": "Diametro do fundo",   "d": 12,   "s": 0.5,  "u": "mm",    "quando": "calcpor != 1" },
        { "k": "ang",       "l": "Angulo com o eixo Z", "d": 66.8, "s": 0.1,  "u": "graus", "quando": "calcpor != 3" },
        { "k": "prof",      "l": "Profundidade final",  "d": 6,    "s": 0.1,  "u": "mm" },
        { "k": "ap",        "l": "Incremento Z (ap)",   "d": 0.1,  "s": 0.05, "u": "mm" },
        { "k": "zIni",      "l": "Z inicial",           "d": 0,    "s": 0.1,  "u": "mm" },
        { "k": "f",         "l": "Avanco",              "d": 800,  "s": 50,   "u": "mm/min" },
        { "k": "cx",        "l": "Centro X (origem)",   "d": 0,    "s": 1,    "u": "mm" },
        { "k": "cy",        "l": "Centro Y (origem)",   "d": 0,    "s": 1,    "u": "mm" }
      ],
      "derivadas": {
        "angEfetivo": [
          { "quando": "calcpor == 3", "expr": "ATAN(((diamTopo - diamFundo)/2)/prof)" },
          { "expr": "ang" }
        ],
        "diamTopoEfetivo": [
          { "quando": "calcpor == 2", "expr": "diamFundo + 2*prof*TAN(angEfetivo)" },
          { "expr": "diamTopo" }
        ],
        "rt": "(diamTopoEfetivo - diam)/2"
      },
      "avisos": [
        { "se": "ap <= 0",          "msg": "PASSO Z (AP) DEVE SER MAIOR QUE ZERO - AJUSTE O CAMPO (O LACO NAO AVANCA ATE A PROFUNDIDADE)" },
        { "se": "diamTopoEfetivo <= diam", "msg": "DIAMETRO DO ESCAREADO MENOR OU IGUAL AO DIAMETRO DA FERRAMENTA" },
        { "se": "angEfetivo >= 90",        "msg": "ANGULO DEVE SER MENOR QUE 90 GRAUS" },
        { "se": "ang <= 0",       "quando": "calcpor != 3", "msg": "ANGULO NAO DEFINIDO OU INVALIDO - AJUSTE O CAMPO" },
        { "se": "diamTopo <= 0",  "quando": "calcpor != 2", "msg": "DIAMETRO DO TOPO NAO DEFINIDO - AJUSTE O CAMPO" },
        { "se": "diamFundo <= 0", "quando": "calcpor != 1", "msg": "DIAMETRO DO FUNDO NAO DEFINIDO - AJUSTE O CAMPO" },
        { "se": "diamTopo <= diamFundo", "quando": "calcpor == 3", "msg": "DIAMETRO DO TOPO DEVE SER MAIOR QUE O DO FUNDO" },
        { "se": "prof <= 0",      "msg": "PROFUNDIDADE NAO DEFINIDA - AJUSTE O CAMPO" },
        { "se": "zIni >= prof",   "msg": "Z INICIAL MAIOR OU IGUAL A PROFUNDIDADE FINAL - NADA A USINAR" }
      ],
      "saidas": [
        { "k": "angEfetivo",      "l": "Angulo (calculado)",    "u": "graus", "quando": "calcpor == 3" },
        { "k": "diamTopoEfetivo", "l": "O do topo (calculado)", "u": "mm",    "quando": "calcpor == 2" },
        { "k": "rt",              "l": "Raio de trabalho",      "u": "mm" }
      ],
      "template": [
        "#23={cx}(CENTRO X)",
        "#24={cy}(CENTRO Y)",
        "#1={ap}(INCREMENTO Z)",
        "#2={zIni}(Z INICIAL)",
        "#7={angEfetivo}(ANGULO COM O EIXO Z)",
        "#4={prof}(PROFUNDIDADE FINAL)",
        "#5={rt}(RAIO DE TRABALHO = [TOPO-FERRAMENTA]/2)",
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
    },
    "bolsaFinal": {
      "nome": "Bolsa final",
      "familia": "bolsa",
      "cor": "#e0a86f",
      "descricao": "Acabamento da bolsa desbastada: parede em rampa. A cada passe o Z desce um incremento e o X da parede recua TAN do angulo (#3=#2*TAN[#7], #6=#5-#3), alternando os lados Y+/Y- da bolsa (laco N30/GOTO30 do programa validado). ZERAMENTO: X no valor do ultimo passe em X na profundidade final (a saida 'X final' e a referencia de zeramento), Y no centro, Z na juncao. Seletor 'Calcular por': angulo direto, ou X inicial/final e Z inicial/final (angulo por ATAN). Espelhamento G51.1 X0 opcional para a bolsa oposta. Convertido do programa anotado do Leo (programas_anotados/bolsa_final.NC).",
      "inputs": [
        { "k": "calcpor", "l": "Calcular por", "d": 1, "s": 1, "sel": [
          { "v": 1, "t": "Tenho o angulo" },
          { "v": 2, "t": "Tenho X e Z" }
        ] },
        { "k": "espelhar", "l": "Espelhamento (bolsa oposta)", "d": 0, "s": 1, "sel": [
          { "v": 0, "t": "Nao" },
          { "v": 1, "t": "Sim - G51.1 X0" }
        ] },
        { "k": "ang",      "l": "Angulo da parede",                     "d": 16,   "s": 0.1,  "u": "graus", "quando": "calcpor == 1" },
        { "k": "raioInt",  "l": "Raio do diametro interno (X inicial)", "d": 100,  "s": 0.5,  "u": "mm" },
        { "k": "xFin",     "l": "X final",                              "d": 92,   "s": 0.5,  "u": "mm",    "quando": "calcpor == 2" },
        { "k": "zIni",     "l": "Z inicial",                            "d": 0,    "s": 0.1,  "u": "mm" },
        { "k": "zFin",     "l": "Z final",                              "d": 28,   "s": 0.1,  "u": "mm" },
        { "k": "ap",       "l": "Incremento (AP)",                      "d": 0.25, "s": 0.05, "u": "mm" },
        { "k": "f",        "l": "Avanco",                               "d": 2000, "s": 50,   "u": "mm/min" },
        { "k": "meiaComp", "l": "Metade do comprimento da bolsa",       "d": 61,   "s": 0.5,  "u": "mm" }
      ],
      "derivadas": {
        "angEfetivo": [
          { "quando": "calcpor == 2", "expr": "ATAN((raioInt - xFin)/(zFin - zIni))" },
          { "expr": "ang" }
        ],
        "xFinRef": "raioInt - zFin*TAN(angEfetivo)",
        "xRecuo": "xFinRef - (20 + diam/2)"
      },
      "avisos": [
        { "se": "ap <= 0",       "msg": "INCREMENTO AP NAO DEFINIDO - AJUSTE O CAMPO (AP ZERO = LOOP INFINITO NA MAQUINA)" },
        { "se": "f <= 0",        "msg": "AVANCO NAO DEFINIDO - AJUSTE O CAMPO" },
        { "se": "xRecuo <= 0",   "msg": "X DE RECUO NEGATIVO - GEOMETRIA IMPOSSIVEL (X FINAL PEQUENO OU FERRAMENTA GRANDE DEMAIS)" },
        { "se": "meiaComp <= 0", "msg": "METADE DO COMPRIMENTO NAO DEFINIDA - AJUSTE O CAMPO" },
        { "se": "raioInt <= 0",  "msg": "RAIO INTERNO NAO DEFINIDO - AJUSTE O CAMPO" },
        { "se": "zFin <= zIni",  "msg": "Z FINAL MENOR OU IGUAL AO Z INICIAL - NADA A USINAR" },
        { "se": "ang <= 0",        "quando": "calcpor == 1", "msg": "ANGULO NAO DEFINIDO - AJUSTE O CAMPO" },
        { "se": "xFin <= 0",       "quando": "calcpor == 2", "msg": "X FINAL NAO DEFINIDO - AJUSTE O CAMPO" },
        { "se": "xFin >= raioInt", "quando": "calcpor == 2", "msg": "X FINAL DEVE SER MENOR QUE O RAIO INTERNO" },
        { "se": "angEfetivo >= 90", "msg": "ANGULO DEVE SER MENOR QUE 90 GRAUS" }
      ],
      "saidas": [
        { "k": "angEfetivo", "l": "Angulo (calculado)",                "u": "graus", "quando": "calcpor == 2" },
        { "k": "xFinRef",    "l": "X final (referencia de zeramento)", "u": "mm" },
        { "k": "xRecuo",     "l": "X de recuo (calculado)",            "u": "mm" }
      ],
      "template": [
        { "quando": "espelhar == 1", "l": "G51.1X0.(ESPELHAMENTO BOLSA OPOSTA)" },
        "#8={xRecuo}(X DE RECUO SEGURO - CALCULADO)",
        "#9={meiaComp}(METADE DO COMPRIMENTO DA BOLSA)",
        "#1={ap}(INCREMENTO AP)",
        "#2={zIni}(Z INICIAL)",
        "#7={angEfetivo}(ANGULO DA PAREDE)",
        "#4={zFin}(Z FINAL)",
        "#5={raioInt}(RAIO DO DIAMETRO INTERNO)",
        "#10={f}(AVANCO)",
        "(X FINAL = REFERENCIA DE ZERAMENTO NA PROFUNDIDADE FINAL: {xFinRef})",
        "G0X[#8]Y[#9](POSICIONAMENTO INICIAL)",
        "N{nb+10}#2=#1+#2",
        "#3=#2*TAN[#7](INCREMENTO DA RAMPA)",
        "#6=#5-#3(X DESTE PASSE)",
        "IF[#2GT#4]GOTO{nb+20}",
        "G0Z-[#2]",
        "G1X[#6]F[#10]",
        "G1Y-[#9]",
        "G1X[#8]",
        "#2=#1+#2",
        "#3=#2*TAN[#7]",
        "#6=#5-#3",
        "IF[#2GT#4]GOTO{nb+20}",
        "G0Z-[#2]",
        "G1X[#6]F[#10]",
        "G1Y[#9]",
        "G1X[#8]",
        "GOTO{nb+10}",
        "N{nb+20}G0Z[#26]",
        { "quando": "espelhar == 1", "l": "G50.1(CANCELA ESPELHAMENTO)" }
      ]
    }
  }
}
;
/* boot: registra as fichas padrao como operacoes do DEFS */
Object.entries(ESTRATEGIAS_PADRAO.estrategias).forEach(([id, est]) => registrarEstrategia(id, est));

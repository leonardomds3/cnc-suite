%<Escareado Helicoidal >
(=== OPERACAO: Escareado Helicoidal ===)
(PROPOSITO: Fazer escareados com angulos específicos e diâmetros onde não há ferramentas especificas para tal)
(CRITICO: o que nunca pode mudar, o coracao da operacao)
(EDITAVEL: os parametros que o usuario ajusta)
(FIXO: valores que ficam travados e por que)
O0001
T1

M6

G54

#23=0(CENTRO X) (@CR: X de Origem do programa — Vira campo critico)

#24=0(CENTRO Y) (@CR: Y de Origem do programa — Vira campo critico)

#26= 10.0 (@CR: Z de segurança — Vira campo critico)

S3000 M3

G0 X#23 Y#24

G43 Z#26 H1 D1

G0 Z0.0

#1=0.1 (@ED: Incremento (AP) — vira campo)

#2=0.0  (@ED: Z inicial — vira campo)

#7=66.8  (@ED: Ângulo — vira campo)

N10#2=#2+#1 (@FX: Calculo do incremento, nunca editar)

#3=#2*TAN[#7] (@FX: Calculo do angulo a ser usinado — Nunca editar)

#4=6.0  (@ED: Profundidade Final — vira campo)

#5=15.0 (@ED: Diâmetro inicial — vira campo, porém o calculo tem que ser feito de maneira automatica, assim que o diametro inicial da operação for informado e o diâmetro ferramenta for especificada).(calculo:  Diâmetro do furo - diâmetro da ferramenta / 2).

#6=#5-#3 (@FX: Calculo do diâmetro a cada passe da ferramenta para formar o cone — Nunca editar)

IF[#2 GT #4]GOTO20 (@FX: Macro — Nunca mexer)

G1  X#6 F800 (@CR: Deslocamento em raio — deve haver verificação com o #23) (Se o #23 (X origem) tiver algum valor, deve se somar ao deslocamento: Ex>> X[#6 + #23])

G3 I-#6 J0.0 Z-#2 (@FX: Interpolação Helicoidal — Nunca mexer)

GOTO10 (@FX:Retorno do Macro — Nunca mexer)

N20 G0 Z100.0

M05

M00

M30
%
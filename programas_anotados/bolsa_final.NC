<Bolsa_Final>(exemplo para construção de bolsa final) 
(PROPOSITO: Dá acabamento na bolsa desbastada )
(CRITICO: o que nunca pode mudar, o coracao da operacao)
(EDITAVEL: os parâmetros que o usuario ajusta)
(FIXO: valores travados)

(Zeramos o X com o valor do X final na profundidade final da bolsa, então o mesmo deve ser exibido no cabeçalho)
(X - Valor do ultimo passe em X) 
(Y - CENTRO) 
(Z - JUNCAO) 
T1 (FRESA8.)

M6 

G54

(G51.1 X0.0)(@ED = Espelhamento para bolsa oposta - Vira botão de escolha se sim ou se não) 

#26= 10.0 (@CR = Z de segurança — Vira campo critico)

S10000 M3 M8 

#8=85.0 (@CR = X de posicionamento fora da peca - vira campo)(considerar raio da ferramenta mais 20mm de seguranca)

#9=61.0(@CR = Metade do comprimento da bolsa - vira campo) (necessário informar o comprimento da bolsa e considerar o raio da ferramenta, para que não ultrapasse o comprimento desejado)

G0X[#8]Y[#9] (@FX = Posicionamento inicial - não vira campo)

G43 Z#26 H2 D2

#1=0.25 (@ED = Incremento (AP) — vira campo)

#2=0.0 (@ED = Z inicial — vira campo)

#7=16.(@ED: Ângulo — vira campo) (Seguir a mesma logica do calculo de ângulo do escareado helicoidal, caso não tivermos a informação do ângulo, usar o X final e o Z final em comparação com o X inicial e o Z inicial)(Exibir ângulo como conferência de validação)

N30#2=#1+#2 (@FX = Z inicial + Incremento - não vira campo)

#3=#2*TAN[#7](@FX = Incremento da rampa  ate o X final)(Calculo = Z inicial * Tangente do ângulo da bolsa)

#4=28.(@ED = Z final)

#5=100.(@ED = Raio do diâmetro interno) 

#6=#5-#3(@FX = X Inicial)(Calculo = Raio - O resultado do #3) 

IF[#2GT#4]GOTO40(@FX = Looping ate o Z final)

G0Z-[#2] 

G1X[#6]F2000 

G1Y-[#9] 

G1X[#8]

#2=#1+#2 

#3=#2*TAN[#7]

#6=#5-#3 

IF[#2GT#4]GOTO40(@FX = Looping ate o Z final)

G0Z-[#2] 

G1X[#6]F2000 

G1Y[#9]

G1X[#8]

GOTO30 

N40G0Z150.0

M05M9

(G50.1)

G53Y300

M30

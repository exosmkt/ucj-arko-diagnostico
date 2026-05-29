# Roteiro do vídeo — Desafio Dra. Carla (até 5 min)

**App no ar para demonstrar:** https://ucj.gabrielgouvea.com.br
**Estrutura:** Parte 1 (O Racional ~2:45) · Parte 2 (Os Bastidores ~2:00).
**Dica:** leia em ritmo natural. Texto entre [colchetes] = o que fazer na tela.

---

## ABERTURA (0:00–0:15)
[Tela: o app aberto em https://ucj.gabrielgouvea.com.br]

"A Dra. Carla trabalha de segunda a sábado, fatura alto, e mesmo assim nunca sabe quanto sobra.
Eu não respondi esse caso num chat — eu **construí uma ferramenta** que resolve ele. Vou te mostrar
o diagnóstico e, depois, como ela foi feita. Bora."

---

## PARTE 1 — O RACIONAL (0:15–3:00)

### O "aha" que abre tudo (0:15–0:50)
[Tela: painel "Auditado pela IA", apontar o R$ 44.824 calculado pelo código]

"Começo pelo erro mais grave, e o mais escondido. A DRE da clínica mostra um **prejuízo de
R$ 99.876**. Só que isso é mentira contábil: a **distribuição de lucros — R$ 144.700 — foi lançada
como se fosse despesa operacional**. Distribuição de lucros não é despesa, é a sócia tirando o
dinheiro dela. Quando você corrige isso, a conta vira: receita líquida menos as despesas de verdade
dá **R$ 44.824 de LUCRO** no trimestre. A clínica não está no vermelho — ela é lucrativa. A Carla
estava tomando decisão olhando um número falso."

### Erros na PJ (0:50–1:50)
[Tela: coluna "Erros na empresa"]

"Na empresa, além disso:
- **Despesas pessoais dentro do CNPJ**: festa de aniversário da filha, personal stylist e uma viagem
  a Paris de 'congresso de 1 dia e 6 de turismo'. Risco fiscal direto e distorce o resultado.
- **Os dermocosméticos**, que são revenda de produto, estão tributados como serviço — ela paga
  **imposto a mais** todo mês.
- **Nenhuma das sócias tem pró-labore** — risco com a Receita e com o INSS.
- E o **equipamento de laser de R$ 78 mil**, que é da empresa, foi pago no **cartão pessoal** dela e
  nem está no ativo da clínica. Confusão patrimonial clássica."

### Erros na PF (1:50–2:30)
[Tela: coluna "Erros na pessoa física"]

"Na pessoa física, o efeito disso aparece:
- O **cartão está a 85% do limite**, ainda com 9 parcelas do laser pela frente — laser que é da empresa.
- Ela tem **R$ 45 mil em cripto**, mas **não tem reserva de emergência** — e quer comprar um apê e se
  aposentar. A alocação briga com os objetivos.
- E tem **R$ 31 mil parados na Hotmart sem render nada**."

### As ações (2:30–3:00)
[Tela: "Plano de ação priorizado"]

"O plano, em ordem: **primeiro, separar PF de PJ** — parar de pagar coisa da clínica no cartão, e a
empresa registra o laser no ativo e ressarce ela. **Segundo**, tirar as despesas pessoais do CNPJ e
**instituir pró-labore**. **Terceiro**, no pessoal: baixar o cartão, sacar os R$ 31 mil parados,
montar reserva e reduzir a cripto. Só aí o sonho do apartamento de R$ 850 mil vira plano de verdade —
hoje, sem entrada formada, ele é inviável."

---

## PARTE 2 — OS BASTIDORES (3:00–4:50)

### Ferramenta + PACTO (3:00–3:45)
[Tela: rodapé 'powered by Gemma'; depois o arquivo lib/prompts.js]

"Agora o como. A ferramenta roda com o **Gemma 4, um modelo aberto e gratuito**, via OpenRouter —
zero custo de modelo. O prompt foi escrito na metodologia **PACTO**: **P**ersona, ela é uma consultora
financeira de elite; **A**ção, cruzar a DRE com o extrato; **C**ontexto, o caso da Carla com as contas
misturadas; **T**arefa, devolver um relatório em seções fixas; e o **O**, que é o mais importante —
**'proibido inventar dados, cite a linha e a data de cada documento'**. É essa regra que torna cada
achado auditável: olha que toda evidência aponta o documento de origem."

### As validações (3:45–4:35)
[Tela: painel "Auditado pela IA"]

"E é aqui que está o pulo do gato — as **validações**. Eu não confiei na primeira resposta da IA.
**Uma**: o app roda em dois passos — um Consultor gera o diagnóstico, e um **Auditor Cético** recebe
de volta o diagnóstico e os documentos com a missão de **desconfiar e recalcular**. A IA audita a si
mesma. **Duas**: eu descobri que o modelo errava conta — escrevia 44.124 no lugar de 44.824. Então a
aritmética não é feita pela IA: **o modelo extrai os números e o código faz a conta**. Por isso esse
valor aqui está marcado como 'calculado pelo código' — é exato, sempre. **Três**: se o modelo gratuito
cai, o sistema **troca de modelo sozinho** e a análise não quebra."

### Fechamento (4:35–4:50)
[Tela: topo do app, com o link visível]

"Resumindo: peguei um caso de planilha bagunçada e entreguei um **produto no ar**, com modelo
gratuito, que **audita os próprios números**. Tá tudo funcionando em ucj.gabrielgouvea.com.br.
Valeu!"

---

## COMO GRAVAR E SUBIR (passo a passo)

1. **Abra o app** em https://ucj.gabrielgouvea.com.br e clique em **"Usar caso de exemplo (Dra. Carla)"**
   **antes de gravar** — a análise leva ~1 min (modelo gratuito). Deixe o relatório já carregado.
   *(Se quiser mostrar a análise rodando ao vivo, lembre que leva ~1 min — fale por cima do loading.)*
2. **Gravar tela + voz (Mac):** QuickTime Player → *Arquivo → Nova Gravação de Tela*. Clique na setinha
   ao lado do botão de gravar e selecione o **microfone**. Grave a janela do navegador.
   *(Alternativas: Loom, ou CMD+Shift+5.)*
3. **Siga o roteiro** acima rolando a página conforme as marcações [Tela: …].
4. Mantenha **abaixo de 5 minutos**.
5. **Subir no YouTube:** youtube.com → *Enviar vídeo* → defina como **"Não listado"** → copie o link.
6. **Entregue o link** no formulário do desafio.

> Observação: a definição de PACTO usada (Persona/Ação/Contexto/Tarefa/Output) é a que você confirmou.

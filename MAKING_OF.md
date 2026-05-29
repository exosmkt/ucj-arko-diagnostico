# Making-of — Como o Arko Diagnóstico foi construído
### (Parte 2 do desafio: Os Bastidores — ferramenta, PACTO, prompt, validações)

> App no ar: **https://ucj.gabrielgouvea.com.br** · Código: github.com/exosmkt/ucj-arko-diagnostico

## 1. A decisão central: não entregar "um prompt", entregar uma ferramenta

A maioria responderia o caso da Dra. Carla colando os 3 PDFs num chat e copiando a resposta.
Eu construí um **produto real, deployado**, que qualquer médico/clínica poderia usar: sobe o
briefing + DRE + extrato e recebe um diagnóstico que **separa PF de PJ, encontra os erros e audita
os próprios números**. O desafio virou um MVP de consultoria assistida por IA.

## 2. Ferramenta e modelo

- **Modelo principal: Gemma-4 (31B) via OpenRouter — open e 100% gratuito.** A consultoria não
  depende de modelo proprietário/pago.
- **Fallback automático: Gemini 2.5 Flash (AI Studio).** Se o free tier do Gemma cair (429) durante
  uma análise, o sistema troca de modelo sozinho — a ferramenta não quebra. *(Decisão tomada depois de
  observar 429 intermitente no free tier — resiliência é requisito de um produto, não luxo.)*
- **Stack:** Node + Express, frontend SPA (Tailwind). Extração de PDF com **poppler (`pdftotext -layout`)**.
  Deploy via **Docker + Coolify** com SSL automático.

## 3. PACTO — como o prompt foi estruturado

Usei a metodologia **PACTO** nos dois prompts. Cada letra é uma diretriz:

| Letra | O que define | Como apliquei |
|------|--------------|----------------|
| **P — Persona** | quem a IA é | "Consultor Financeiro de Elite da Arko, especialista em finanças de médicos/clínicas" |
| **A — Agente/Ação** | o que ela faz | "Analise a DRE e o extrato e **CRUZE** as informações; separe PF de PJ" |
| **C — Contexto** | dados e cenário | "Caso Dra. Carla, sócia 70%, contas misturadas, paga coisa da clínica no cartão pessoal" |
| **T — Tarefa/Termos** | formato e limites | "Relatório em JSON com seções fixas: erros_pj, erros_pf, plano_acao, score, simulações…" |
| **O — Output/Restrições** | resultado + regras de segurança | **"PROIBIDO inventar dados. Todo número vem dos documentos — cite a linha e a data."** |

O **"O" do PACTO é o coração da confiabilidade**: a regra "proibido inventar, cite a fonte" é o que
transforma a IA de "gerador de texto convincente" em "analista auditável". No app, cada erro citado
traz o campo *Evidência* apontando o documento, a linha e o valor.

> Os prompts completos estão em [`lib/prompts.js`](lib/prompts.js).

## 4. Como foi *pensado*: o prompt é ancorado nos padrões reais de erro

O prompt não pede "ache erros" no vácuo. Ele carrega o **checklist de um consultor sênior** — os
lugares onde PF e PJ tipicamente se misturam de forma indevida:

- distribuição de lucros lançada como **despesa operacional** (distorce o resultado);
- **despesas pessoais** pagas pela PJ (viagens, festas, estética);
- **ativos da empresa pagos pela conta pessoal** do sócio;
- **revenda de produto tributada como serviço** no Simples;
- **ausência de pró-labore**; distribuição desproporcional;
- cartão estourado, excesso de cripto sem reserva, dinheiro ocioso, metas sem entrada.

Isso é conhecimento de domínio guiando o modelo — **não é gabarito**. A análise concreta (valores,
gravidade, recomendações) sai dos documentos. Por isso o app funciona com **qualquer** cliente, não
só com a Dra. Carla.

## 5. As validações (o diferencial)

Três camadas para a IA não me passar a perna:

**a) Pipeline de 2 passos — a IA audita a si mesma.**
1. *Consultor de Elite* gera o diagnóstico.
2. *Auditor Cético* recebe esse diagnóstico **+ os mesmos documentos** e é instruído a **desconfiar**:
   recalcula os números-chave, confere se cada achado tem lastro, aponta o que não bate. O app mostra
   isso no painel **"🛡 Auditado pela IA"**, com uma % de confiança.

**b) Cálculo determinístico — não confio a aritmética ao modelo.**
Modelos de linguagem erram conta (no teste, o Gemma escreveu *R$ 44.124* numa subtração cujo resultado
correto é *R$ 44.824*). Solução: **o modelo extrai os números; o código faz a conta.** O resultado
operacional real da clínica é calculado em JavaScript a partir dos operandos extraídos:

```
Receita Líquida − (Despesas − Distribuição de lucros)
R$ 257.054 − (R$ 356.930 − R$ 144.700) = R$ 44.824
```

Esse número aparece marcado como **"calculado pelo código"** — exato, independente do modelo.
*(É o "aha" do caso: a DRE mostra "prejuízo de R$ 99.876", mas isso é ficção contábil — a distribuição
de lucros foi lançada como despesa. A clínica, na verdade, dá lucro.)*

**c) Fallback de modelo** — descrito acima: garante que a análise sempre conclui.

## 6. Dashboard financeiro

Além do diagnóstico em texto, o app monta um **dashboard visual** (Chart.js) que dá à cliente o
panorama que ela nunca teve: um donut separando **despesas da clínica × despesas pessoais lançadas na
PJ** (e o total "escondido" em destaque), uma barra de **quanto cada sócia recebeu** vs. o % de cotas
(expõe a distribuição desproporcional), a **receita por fonte** e **para onde vai o dinheiro na PF**.
Os números do dashboard vêm da mesma extração auditada — não são estimativas.

## 7. Outras decisões técnicas (e os porquês)

- **PDF → texto (`pdftotext -layout`) em vez de imagem.** Testei as duas. O `-layout` preserva a tabela
  da DRE com os números exatos, gera payload minúsculo (menos rate-limit, mais rápido) e funciona em
  qualquer modelo. A rota de imagem (visão multimodal) ficou no código como opção, mas era mais pesada
  sem ganho de acurácia neste caso.
- **`temperature: 0.2`** — estamos lidando com números; queremos determinismo, não criatividade.
- **Saída forçada em JSON** — UI estável e comparável entre os dois passos.
- **Thinking ligado só na auditoria** — para a aritmética acontecer no raciocínio e a explicação sair
  limpa (one-liner), sem o modelo "pensar em voz alta" no campo de texto.
- **Chaves só como variáveis de ambiente** (nunca no código nem no git).

## 7. Resultado

Diagnóstico completo do caso da Dra. Carla — 6 erros na PJ, 5 na PF, plano de ação priorizado,
simulação do apartamento e projeção de aposentadoria — gerado por um modelo **aberto e gratuito**,
**auditado** pela própria IA e com o número-chave **calculado deterministicamente**. Tudo no ar,
acessível por qualquer pessoa, em https://ucj.gabrielgouvea.com.br.

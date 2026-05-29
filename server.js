import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateJSON } from "./lib/llm.js";
import { filesToText, filesToImageParts } from "./lib/pdf.js";
import { diagnosticoPrompt, auditoriaPrompt } from "./lib/prompts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;
const PDF_MODE = process.env.PDF_MODE || "text"; // "text" (padrão) | "image"

app.use(express.json({ limit: "25mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

const fmtBRL = (n) =>
  "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Validação determinística: a aritmética do número-chave NÃO é confiada ao LLM
 * (modelos erram conta). O modelo extrai os operandos; aqui o código calcula o
 * resultado operacional real (receita líquida − despesas SEM distribuição de lucros)
 * e injeta/sobrescreve o recálculo, marcando como calculado pelo servidor.
 */
function aplicarCalculoDeterministico(auditoria) {
  const op = auditoria?.operandos_dre;
  if (!op) return;
  const rl = Number(op.receita_liquida_trimestre);
  const td = Number(op.total_despesas_trimestre);
  const dist = Number(op.distribuicao_lucros_trimestre);
  if (![rl, td, dist].every(Number.isFinite)) return;

  const resultadoReal = rl - (td - dist);
  const entry = {
    item: "Resultado operacional real da clínica (trimestre) — calculado pelo servidor",
    valor_auditado: fmtBRL(resultadoReal),
    bate: true,
    calculado_pelo_servidor: true,
    explicacao: `${fmtBRL(rl)} − (${fmtBRL(td)} − ${fmtBRL(dist)}) = ${fmtBRL(resultadoReal)} (a distribuição de lucros não é despesa operacional)`,
  };
  if (!Array.isArray(auditoria.recalculos)) auditoria.recalculos = [];
  // remove eventual recálculo do mesmo item feito pelo LLM (que pode ter erro de conta)
  auditoria.recalculos = auditoria.recalculos.filter((r) => !/operacional|resultado.*real/i.test(r.item || ""));
  auditoria.recalculos.unshift(entry);
}

/**
 * Pipeline de 2 passos:
 *  1) Diagnóstico  (Consultor de Elite)  -> JSON estruturado
 *  2) Auditoria    (Auditor Cético)      -> valida/recalcula os números
 * Modelo principal: Gemma-4 (OpenRouter); fallback automático: Gemini 2.5 Flash.
 * Recebe { files: [{name, mimeType, data(base64 PDF)}] }
 */
app.post("/api/analyze", async (req, res) => {
  try {
    const files = req.body?.files || [];
    if (files.length < 1) return res.status(400).json({ error: "Envie pelo menos 1 documento (PDF)." });

    // Representação dos documentos
    const useImages = PDF_MODE === "image";
    const docsText = useImages ? "(documentos fornecidos como imagens)" : await filesToText(files);
    const parts = useImages ? await filesToImageParts(files) : null;

    // Passo 1 — Diagnóstico
    const d = await generateJSON({ prompt: diagnosticoPrompt(docsText), parts });

    // Passo 2 — Auditoria (re-alimenta documentos + relatório do passo 1)
    let auditoria = null;
    let modeloAud = null;
    try {
      const a = await generateJSON({
        prompt: auditoriaPrompt(JSON.stringify(d.json), docsText),
        parts,
        thinkingBudget: 4096, // usado só pelo fallback Gemini (Gemma ignora)
      });
      auditoria = a.json;
      modeloAud = a.modelo;
      aplicarCalculoDeterministico(auditoria);
    } catch (e) {
      auditoria = { veredito_geral: "Auditoria indisponível nesta execução.", erro: String(e.message) };
    }

    res.json({
      diagnostico: d.json,
      auditoria,
      meta: {
        modelo_diagnostico: d.modelo,
        modelo_auditoria: modeloAud,
        usou_fallback: d.fallback,
        modo_pdf: PDF_MODE,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => console.log(`Arko Diagnóstico rodando em :${PORT} (PDF_MODE=${PDF_MODE}, primary=${process.env.LLM_PRIMARY || "openrouter"})`));

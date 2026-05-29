// Camada de modelo com roteamento e resiliência.
//
// Principal: Gemma-4 (open, gratuito) via OpenRouter — o modelo "em destaque".
// Fallback automático: Gemini 2.5 Flash (AI Studio) — entra se o free tier do Gemma
// cair (429/erro), garantindo que a demo ao vivo nunca quebre.
// Entrada de documentos: TEXTO (pdftotext -layout) por padrão; imagens se PDF_MODE=image.

const OR_KEY = () => process.env.OPENROUTER_API_KEY;
const OR_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";
const GEMINI_KEY = () => process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const PRIMARY = process.env.LLM_PRIMARY || "openrouter";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function safeParse(text) {
  let t = (text || "").trim();
  if (t.startsWith("```")) t = t.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a !== -1 && b !== -1) return JSON.parse(t.slice(a, b + 1));
    throw new Error("Falha ao parsear JSON do modelo.");
  }
}

// --- OpenRouter (Gemma) -----------------------------------------------------
async function callOpenRouter({ prompt, parts }) {
  const key = OR_KEY();
  if (!key) throw new Error("OPENROUTER_API_KEY ausente.");

  // content: string (texto) ou array multimodal
  let content;
  if (parts && parts.length) {
    content = [{ type: "text", text: prompt }];
    for (const p of parts) {
      if (p.text) content.push({ type: "text", text: p.text });
      if (p.image) content.push({ type: "image_url", image_url: { url: `data:${p.image.mimeType};base64,${p.image.data}` } });
    }
  } else {
    content = prompt;
  }

  const body = { model: OR_MODEL, temperature: 0.2, messages: [{ role: "user", content }] };
  const maxRetries = 4;
  let lastErr;
  for (let i = 0; i <= maxRetries; i++) {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ucj.gabrielgouvea.com.br",
        "X-Title": "Arko Diagnostico",
      },
      body: JSON.stringify(body),
    });
    if (resp.status === 429 || resp.status >= 500) {
      lastErr = new Error(`OpenRouter ${resp.status}`);
      await sleep(2500 * (i + 1)); // backoff
      continue;
    }
    if (!resp.ok) throw new Error(`OpenRouter ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
    const data = await resp.json();
    const txt = data?.choices?.[0]?.message?.content || "";
    if (!txt) { lastErr = new Error("OpenRouter resposta vazia"); await sleep(2500 * (i + 1)); continue; }
    return { json: safeParse(txt), modelo: OR_MODEL };
  }
  throw lastErr || new Error("OpenRouter falhou após retries.");
}

// --- Gemini (fallback) ------------------------------------------------------
async function callGemini({ prompt, parts, thinkingBudget = 0 }) {
  const key = GEMINI_KEY();
  if (!key) throw new Error("GEMINI_API_KEY ausente.");

  const reqParts = [{ text: prompt }];
  if (parts && parts.length) {
    for (const p of parts) {
      if (p.text) reqParts.push({ text: p.text });
      if (p.image) reqParts.push({ inline_data: { mime_type: p.image.mimeType, data: p.image.data } });
    }
  }

  const body = {
    contents: [{ role: "user", parts: reqParts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      maxOutputTokens: 16384,
      thinkingConfig: { thinkingBudget },
    },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  const txt = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!txt) throw new Error(`Gemini vazio (finishReason=${data?.candidates?.[0]?.finishReason}).`);
  return { json: safeParse(txt), modelo: GEMINI_MODEL };
}

/**
 * Gera JSON usando o provider principal; se falhar, cai para o fallback.
 * @returns {Promise<{json:object, modelo:string, fallback:boolean}>}
 */
export async function generateJSON({ prompt, parts = null, thinkingBudget = 0 }) {
  const order = PRIMARY === "gemini" ? ["gemini", "openrouter"] : ["openrouter", "gemini"];
  let lastErr;
  for (let idx = 0; idx < order.length; idx++) {
    const provider = order[idx];
    try {
      if (provider === "openrouter") {
        const r = await callOpenRouter({ prompt, parts });
        return { ...r, fallback: idx > 0 };
      } else {
        const r = await callGemini({ prompt, parts, thinkingBudget });
        return { ...r, fallback: idx > 0 };
      }
    } catch (e) {
      lastErr = e;
      console.warn(`[llm] provider ${provider} falhou: ${e.message}${idx < order.length - 1 ? " -> fallback" : ""}`);
    }
  }
  throw lastErr || new Error("Todos os providers falharam.");
}

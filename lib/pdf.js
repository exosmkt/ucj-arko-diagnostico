// Extração de conteúdo de PDF via poppler (já presente no sistema/Docker).
//
// Decisão (validada empiricamente neste caso): usamos EXTRAÇÃO DE TEXTO com
// `pdftotext -layout` como representação padrão. O -layout preserva o alinhamento
// das tabelas (DRE), os números saem exatos, o payload é minúsculo (poucos KB) — o
// que reduz drasticamente rate-limit/latência no free tier — e funciona em qualquer
// modelo. A conversão para imagem (pdftoppm) fica disponível como alternativa
// (PDF_MODE=image) para modelos multimodais, mas é mais pesada sem ganho de acurácia.

import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const DPI = process.env.PDF_DPI || "150";

function runStdin(cmd, args, buffer) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let out = Buffer.alloc(0);
    let err = "";
    p.stdout.on("data", (d) => (out = Buffer.concat([out, d])));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve(out) : reject(new Error(`${cmd} ${c}: ${err}`))));
    p.stdin.write(buffer);
    p.stdin.end();
  });
}

/** PDF (buffer) -> texto com layout preservado. */
export async function extractText(buffer) {
  const out = await runStdin("pdftotext", ["-layout", "-", "-"], buffer);
  return out.toString("utf8").trim();
}

/** [{name,data(base64)}] -> bloco único de texto rotulado por documento. */
export async function filesToText(files) {
  const blocos = [];
  for (const f of files) {
    const buf = Buffer.from(f.data, "base64");
    let texto;
    try {
      texto = await extractText(buf);
    } catch (e) {
      texto = `(falha ao extrair texto: ${e.message})`;
    }
    blocos.push(`===== DOCUMENTO: ${f.name || "documento.pdf"} =====\n${texto}`);
  }
  return blocos.join("\n\n");
}

// --- Alternativa multimodal (opcional) -------------------------------------

async function pdfToPngs(buffer) {
  const dir = await mkdtemp(path.join(tmpdir(), "arko-"));
  try {
    await new Promise((resolve, reject) => {
      const p = spawn("pdftoppm", ["-png", "-r", String(DPI), "-", path.join(dir, "p")]);
      let err = "";
      p.stderr.on("data", (d) => (err += d.toString()));
      p.on("error", reject);
      p.on("close", (c) => (c === 0 ? resolve() : reject(new Error(`pdftoppm ${c}: ${err}`))));
      p.stdin.write(buffer);
      p.stdin.end();
    });
    const pngs = (await readdir(dir)).filter((f) => f.endsWith(".png")).sort();
    const out = [];
    for (const f of pngs) {
      const data = await readFile(path.join(dir, f));
      out.push({ mimeType: "image/png", data: data.toString("base64") });
    }
    return out;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** [{name,data}] -> parts multimodais (texto rótulo + imagens das páginas). */
export async function filesToImageParts(files) {
  const parts = [];
  for (const f of files) {
    parts.push({ text: `\n===== DOCUMENTO: ${f.name || "documento.pdf"} =====` });
    const pngs = await pdfToPngs(Buffer.from(f.data, "base64"));
    for (const png of pngs) parts.push({ image: png });
  }
  return parts;
}

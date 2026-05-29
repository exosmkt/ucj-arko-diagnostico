const $ = (id) => document.getElementById(id);
const EXAMPLE_FILES = ["Briefing_Dra_Carla.pdf", "DRE_Mendes_Dermatologia.pdf", "Extrato_PF_Dra_Carla.pdf"];
let selected = []; // [{name, mimeType, data(base64)}]

// ---------- seleção de arquivos ----------
const dz = $("dropzone");
const fileInput = $("fileInput");
dz.addEventListener("click", () => fileInput.click());
dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag"); });
dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
dz.addEventListener("drop", (e) => { e.preventDefault(); dz.classList.remove("drag"); handleFiles(e.dataTransfer.files); });
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

async function handleFiles(fileList) {
  const arr = [...fileList].filter((f) => f.type === "application/pdf");
  selected = [];
  for (const f of arr) selected.push({ name: f.name, mimeType: "application/pdf", data: await toBase64(f) });
  renderFileList();
}
function toBase64(file) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.readAsDataURL(file);
  });
}
function renderFileList() {
  $("fileList").innerHTML = selected.map((f) => `✓ ${f.name}`).join("<br>");
  $("analyzeBtn").disabled = selected.length === 0;
}

// ---------- exemplo ----------
$("exampleBtn").addEventListener("click", async () => {
  $("exampleBtn").textContent = "Carregando exemplo…";
  selected = [];
  for (const name of EXAMPLE_FILES) {
    const resp = await fetch("/exemplo/" + encodeURIComponent(name));
    const blob = await resp.blob();
    selected.push({ name, mimeType: "application/pdf", data: await toBase64(blob) });
  }
  renderFileList();
  $("exampleBtn").textContent = "▶ Usar caso de exemplo (Dra. Carla)";
  analyze();
});

$("analyzeBtn").addEventListener("click", analyze);

// ---------- análise ----------
async function analyze() {
  $("uploader").classList.add("hidden");
  $("error").classList.add("hidden");
  $("results").classList.add("hidden");
  $("loading").classList.remove("hidden");
  setStep("step1", "run"); setStep("step2", "wait");
  // anima o passo 2 após ~alguns segundos (heurística visual)
  const t2 = setTimeout(() => { setStep("step1", "done"); setStep("step2", "run"); }, 28000);

  try {
    const resp = await fetch("/api/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: selected }),
    });
    const data = await resp.json();
    clearTimeout(t2);
    if (!resp.ok) throw new Error(data.error || "Falha na análise.");
    setStep("step1", "done"); setStep("step2", "done");
    render(data);
  } catch (e) {
    clearTimeout(t2);
    $("loading").classList.add("hidden");
    $("uploader").classList.remove("hidden");
    $("error").classList.remove("hidden");
    $("error").innerHTML = `<b>Não foi possível concluir.</b><br>${e.message}`;
  }
}
function setStep(id, state) {
  const el = $(id); const ic = el.querySelector(".step-ic");
  if (state === "run") { el.classList.remove("text-slate-400"); el.classList.add("text-emerald-300"); ic.innerHTML = '<span class="inline-block w-3 h-3 border-2 border-emerald-300 border-t-transparent rounded-full spin"></span>'; }
  if (state === "done") { el.classList.remove("text-slate-400","text-emerald-300"); el.classList.add("text-slate-200"); ic.textContent = "✓"; ic.classList.add("text-emerald-400"); }
  if (state === "wait") { ic.textContent = "○"; }
}

// ---------- render ----------
const GRAV = { alta: "bg-red-500/15 text-red-300 border-red-500/30", media: "bg-amber-500/15 text-amber-300 border-amber-500/30", baixa: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function render(data) {
  const d = data.diagnostico || {};
  const a = data.auditoria || {};
  const m = data.meta || {};
  const score = d.score_saude_financeira || {};
  const nota = Number(score.nota) || 0;
  const scoreColor = nota < 40 ? "#f87171" : nota < 70 ? "#fbbf24" : "#34d399";

  const erroCard = (e) => `
    <div class="card rounded-xl p-4 fade-in">
      <div class="flex items-start justify-between gap-3 mb-2">
        <h4 class="font-semibold leading-snug">${esc(e.titulo)}</h4>
        <span class="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border ${GRAV[(e.gravidade||"baixa").toLowerCase()]||GRAV.baixa}">${esc(e.gravidade)}</span>
      </div>
      <p class="text-sm text-slate-400 mb-2"><span class="text-slate-500">📎 Evidência:</span> ${esc(e.evidencia)}</p>
      <p class="text-sm text-slate-400 mb-2"><span class="text-slate-500">⚠ Impacto:</span> ${esc(e.impacto)}</p>
      <p class="text-sm text-emerald-300/90"><span class="text-emerald-500">→ Recomendação:</span> ${esc(e.recomendacao)}</p>
    </div>`;

  const recalcRow = (r) => `
    <div class="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      <span class="${r.bate ? "text-emerald-400" : "text-amber-400"} mt-0.5">${r.bate ? "✓" : "≠"}</span>
      <div class="text-sm">
        <div class="font-medium ${r.calculado_pelo_servidor ? "text-cyan-300" : "text-slate-200"}">${esc(r.item)} ${r.calculado_pelo_servidor ? '<span class="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">calculado pelo código</span>' : ""}</div>
        <div class="text-slate-400">${esc(r.explicacao)}</div>
        ${r.valor_relatorio && !r.calculado_pelo_servidor ? `<div class="text-xs text-slate-500">relatório: ${esc(r.valor_relatorio)} · auditado: <b class="text-slate-300">${esc(r.valor_auditado)}</b></div>` : `<div class="text-xs text-slate-500">resultado: <b class="text-cyan-300">${esc(r.valor_auditado)}</b></div>`}
      </div>
    </div>`;

  const html = `
    <div class="flex items-center justify-between mb-6 flex-wrap gap-2">
      <h2 class="text-2xl font-extrabold">Diagnóstico financeiro</h2>
      <div class="text-xs text-slate-500 flex items-center gap-2">
        <span class="px-2 py-1 rounded bg-white/5 border border-white/10">modelo: ${esc(m.modelo_diagnostico||"-")}</span>
        ${m.usou_fallback ? '<span class="px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">fallback acionado</span>' : ""}
        <button onclick="location.reload()" class="px-2 py-1 rounded border border-slate-700 hover:border-slate-500">↺ nova análise</button>
      </div>
    </div>

    <!-- topo: score + resumo -->
    <div class="grid md:grid-cols-3 gap-4 mb-6">
      <div class="card rounded-2xl p-6 text-center fade-in">
        <div class="text-xs uppercase tracking-wide text-slate-500 mb-2">Saúde financeira</div>
        <div class="text-5xl font-extrabold" style="color:${scoreColor}">${nota}<span class="text-xl text-slate-600">/100</span></div>
        <div class="h-2 rounded-full bg-white/10 mt-3 overflow-hidden"><div style="width:${nota}%;background:${scoreColor}" class="h-full"></div></div>
        <p class="text-xs text-slate-400 mt-3">${esc(score.justificativa)}</p>
      </div>
      <div class="card rounded-2xl p-6 md:col-span-2 fade-in">
        <div class="text-xs uppercase tracking-wide text-slate-500 mb-2">Resumo executivo</div>
        <p class="text-slate-200 leading-relaxed">${esc(d.resumo_executivo)}</p>
      </div>
    </div>

    <!-- painel auditoria (destaque) -->
    <div class="card rounded-2xl p-6 mb-8 border-cyan-500/25 fade-in" style="background:linear-gradient(180deg,rgba(34,211,238,.06),rgba(255,255,255,.02))">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 class="text-lg font-bold flex items-center gap-2"><span class="text-cyan-400">🛡</span> Auditado pela IA <span class="text-xs font-normal text-slate-500">— a IA conferiu os próprios números</span></h3>
        <span class="text-sm">confiança no relatório: <b style="color:${(a.confianca||0)>=70?'#34d399':(a.confianca||0)>=40?'#fbbf24':'#f87171'}">${a.confianca ?? "—"}%</b></span>
      </div>
      <p class="text-sm text-slate-300 mb-4">${esc(a.veredito_geral)}</p>
      <div class="bg-black/20 rounded-xl p-4">${(a.recalculos||[]).map(recalcRow).join("") || '<span class="text-slate-500 text-sm">Sem recálculos.</span>'}</div>
      ${(a.correcoes||[]).length ? `<div class="mt-4 text-sm text-slate-400"><b class="text-slate-300">Correções sugeridas pelo auditor:</b><ul class="list-disc list-inside mt-1 space-y-1">${a.correcoes.map(c=>`<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
    </div>

    <!-- erros PJ / PF -->
    <div class="grid md:grid-cols-2 gap-6 mb-8">
      <div>
        <h3 class="font-bold mb-3 flex items-center gap-2"><span class="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-sm border border-emerald-500/30">PJ</span> Erros na empresa (${(d.erros_pj||[]).length})</h3>
        <div class="space-y-3">${(d.erros_pj||[]).map(erroCard).join("")}</div>
      </div>
      <div>
        <h3 class="font-bold mb-3 flex items-center gap-2"><span class="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-sm border border-cyan-500/30">PF</span> Erros na pessoa física (${(d.erros_pf||[]).length})</h3>
        <div class="space-y-3">${(d.erros_pf||[]).map(erroCard).join("")}</div>
      </div>
    </div>

    <!-- plano de ação -->
    <div class="mb-8">
      <h3 class="font-bold mb-3">🎯 Plano de ação priorizado</h3>
      <div class="space-y-2">
        ${(d.plano_acao||[]).map((p)=>`
          <div class="card rounded-xl p-4 flex gap-4 items-start fade-in">
            <div class="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950 font-bold flex items-center justify-center">${esc(p.prioridade)}</div>
            <div>
              <div class="font-semibold">${esc(p.acao)} <span class="text-xs ml-2 text-slate-500">${esc(p.prazo)}</span></div>
              <div class="text-sm text-slate-400">${esc(p.porque)}</div>
            </div>
          </div>`).join("")}
      </div>
    </div>

    <!-- simulações -->
    <div class="grid md:grid-cols-2 gap-6 mb-8">
      <div class="card rounded-2xl p-6 fade-in">
        <h3 class="font-bold mb-2">🏠 Apartamento dos sonhos</h3>
        <div class="text-sm ${d.simulacao_apartamento?.viavel_hoje ? "text-emerald-300":"text-amber-300"} mb-2">${d.simulacao_apartamento?.viavel_hoje ? "Viável hoje" : "Inviável hoje — precisa de ajustes"}</div>
        <p class="text-sm text-slate-400">Entrada estimada (20%): <b class="text-slate-200">${esc(d.simulacao_apartamento?.entrada_estimada_20pct)}</b></p>
        <p class="text-sm text-slate-400 mt-1">${esc(d.simulacao_apartamento?.lacuna)}</p>
        <p class="text-sm text-emerald-300/90 mt-2">→ ${esc(d.simulacao_apartamento?.caminho)}</p>
      </div>
      <div class="card rounded-2xl p-6 fade-in">
        <h3 class="font-bold mb-2">👵 Aposentadoria</h3>
        <p class="text-sm text-slate-400">${esc(d.projecao_aposentadoria?.situacao_atual)}</p>
        <p class="text-sm text-slate-400 mt-1">Aporte mensal sugerido: <b class="text-slate-200">${esc(d.projecao_aposentadoria?.sugestao_aporte_mensal)}</b></p>
        <p class="text-sm text-emerald-300/90 mt-2">${esc(d.projecao_aposentadoria?.observacao)}</p>
      </div>
    </div>

    <!-- números-chave -->
    ${(d.numeros_chave||[]).length ? `<div class="mb-4">
      <h3 class="font-bold mb-3">📊 Números-chave</h3>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        ${d.numeros_chave.map((n)=>`<div class="card rounded-xl p-4 fade-in"><div class="text-xs text-slate-500">${esc(n.rotulo)}</div><div class="text-lg font-bold">${esc(n.valor)}</div><div class="text-[11px] text-slate-600">${esc(n.fonte)}</div></div>`).join("")}
      </div></div>` : ""}
  `;

  $("loading").classList.add("hidden");
  $("results").innerHTML = html;
  $("results").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ================== CONFIGURAÇÃO ==================
// Troque pelos seus dados. O WhatsApp vai com DDI 55 + DDD + número, só dígitos.
const CONFIG = {
  nome: "Sebo do Antônio",
  whatsapp: "5531971282574",
  entrega: "Entrega grátis no Planalto e Itapoã",
};
// ==================================================

const livros = (window.LIVROS || []).slice();
const $ = (s) => document.querySelector(s);
const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const semAcento = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const idadeMin = (l) => parseInt(l.idade, 10) || 0;
const corIdade = (l) => { const m = idadeMin(l); return m <= 2 ? "c1" : m <= 5 ? "c2" : m <= 8 ? "c3" : "c4"; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const FAIXAS = [
  { id: "todas", nome: "Todas as idades", teste: () => true },
  { id: "0-3", nome: "0 a 3 anos", teste: (l) => idadeMin(l) <= 2 },
  { id: "3-5", nome: "3 a 5 anos", teste: (l) => idadeMin(l) >= 3 && idadeMin(l) <= 5 },
  { id: "6-8", nome: "6 a 8 anos", teste: (l) => idadeMin(l) >= 6 && idadeMin(l) <= 8 },
  { id: "9+", nome: "9 anos ou mais", teste: (l) => idadeMin(l) >= 9 },
];

const estado = {
  busca: "",
  faixa: "todas",
  ordem: "titulo",
  sacola: carregarSacola(),
};

function carregarSacola() {
  try {
    const salvos = JSON.parse(localStorage.getItem("sacola") || "[]");
    return salvos.filter((c) => livros.some((l) => l.codigo === c && !l.vendido));
  } catch { return []; }
}
function salvarSacola() { localStorage.setItem("sacola", JSON.stringify(estado.sacola)); }

// ---------- textos da loja ----------
document.title = `${CONFIG.nome} — livros infantis usados`;
$("#nomeLoja").textContent = CONFIG.nome;
$("#nomeRodape").textContent = CONFIG.nome;
$("#seloEntrega").textContent = CONFIG.entrega;
$("#linkZap").href = `https://wa.me/${CONFIG.whatsapp}`;
$("#qtdLivros").textContent = livros.filter((l) => !l.vendido).length;

// ---------- filtros ----------
$("#chipsIdade").innerHTML = FAIXAS.map(
  (f, i) => `<button class="chip chip-${i}" data-faixa="${f.id}" aria-pressed="${f.id === estado.faixa}">${f.nome}</button>`
).join("");
$("#chipsIdade").addEventListener("click", (e) => {
  const b = e.target.closest("[data-faixa]");
  if (!b) return;
  estado.faixa = b.dataset.faixa;
  document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === b));
  render();
});
$("#busca").addEventListener("input", (e) => { estado.busca = e.target.value; render(); });
$("#ordem").addEventListener("change", (e) => { estado.ordem = e.target.value; render(); });

function filtrados() {
  const q = semAcento(estado.busca).trim();
  const faixa = FAIXAS.find((f) => f.id === estado.faixa);
  const lista = livros.filter((l) => {
    if (!faixa.teste(l)) return false;
    if (!q) return true;
    return semAcento([l.titulo, l.autor, l.ilustrador, l.editora, l.descricao].join(" ")).includes(q);
  });
  const precoOu = (l, v) => (l.preco == null ? v : l.preco);
  const ord = {
    titulo: (a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"),
    menor: (a, b) => precoOu(a, Infinity) - precoOu(b, Infinity),
    maior: (a, b) => precoOu(b, -Infinity) - precoOu(a, -Infinity),
    idade: (a, b) => idadeMin(a) - idadeMin(b),
  }[estado.ordem];
  // vendidos sempre no fim
  return lista.sort((a, b) => (a.vendido - b.vendido) || ord(a, b));
}

// ---------- cards ----------
function htmlPreco(l) {
  const p = l.preco != null
    ? `<span class="preco">${brl(l.preco)}</span>`
    : `<span class="preco consultar">Preço a consultar</span>`;
  const n = l.precoNovo && l.preco != null && l.precoNovo > l.preco
    ? `<span class="preco-novo">novo: <s>${brl(l.precoNovo)}</s></span>` : "";
  return `<div class="precos">${p}${n}</div>`;
}
function htmlBotao(l) {
  if (l.vendido) return `<button class="btn-quero" disabled>Vendido</button>`;
  const na = estado.sacola.includes(l.codigo);
  return `<button class="btn-quero ${na ? "na-sacola" : ""}" data-quero="${l.codigo}">${na ? "✓ Na sacola" : "Quero este"}</button>`;
}

function render() {
  const lista = filtrados();
  $("#grade").innerHTML = lista.map((l) => `
    <article class="card ${l.vendido ? "vendido" : ""}">
      <button class="capa" data-ver="${l.codigo}" aria-label="Ver detalhes de ${esc(l.titulo)}">
        <img src="capas/${l.codigo}.jpg" alt="Capa de ${esc(l.titulo)}" loading="lazy" width="360" height="480">
        <span class="selo-idade ${corIdade(l)}">${esc(l.idade)}</span>
        ${l.vendido ? `<span class="faixa-vendido">VENDIDO</span>` : ""}
      </button>
      <div class="info">
        <h3 class="titulo">${esc(l.titulo)}</h3>
        <p class="autor">${esc(l.autor || "")}</p>
        ${htmlPreco(l)}
        ${htmlBotao(l)}
      </div>
    </article>`).join("");
  $("#vazio").hidden = lista.length > 0;
  $("#resultado").textContent = `${lista.length} ${lista.length === 1 ? "livro" : "livros"}`;
}

document.addEventListener("click", (e) => {
  const q = e.target.closest("[data-quero]");
  if (q) { alternar(q.dataset.quero); return; }
  const v = e.target.closest("[data-ver]");
  if (v) abrirDetalhe(v.dataset.ver);
});

// ---------- sacola ----------
function alternar(codigo) {
  const i = estado.sacola.indexOf(codigo);
  if (i >= 0) { estado.sacola.splice(i, 1); avisar("Removido da sacola"); }
  else { estado.sacola.push(codigo); avisar("Adicionado à sacola"); pular(); }
  salvarSacola();
  render();
  renderSacola();
  if ($("#detalhe").open) abrirDetalhe(codigo);
}
function pular() {
  const c = $("#contador");
  c.classList.remove("pulo"); void c.offsetWidth; c.classList.add("pulo");
}
function itensSacola() { return estado.sacola.map((c) => livros.find((l) => l.codigo === c)).filter(Boolean); }

function renderSacola() {
  const itens = itensSacola();
  $("#contador").textContent = itens.length;
  $("#sacolaVazia").hidden = itens.length > 0;
  $("#sacolaLista").innerHTML = itens.map((l) => `
    <li>
      <img src="capas/${l.codigo}.jpg" alt="">
      <div><div class="t">${esc(l.titulo)}</div><div class="p">${l.preco != null ? brl(l.preco) : "Preço a consultar"}</div></div>
      <button class="remover" data-quero="${l.codigo}">Remover</button>
    </li>`).join("");
  const total = itens.reduce((s, l) => s + (l.preco || 0), 0);
  $("#total").textContent = brl(total);
  $("#obsConsulta").hidden = !itens.some((l) => l.preco == null);
  $("#finalizar").disabled = itens.length === 0;
}

function abrirSacola() {
  $("#sacola").classList.add("aberta");
  $("#sacola").setAttribute("aria-hidden", "false");
  $("#fundo").hidden = false;
}
function fecharSacola() {
  $("#sacola").classList.remove("aberta");
  $("#sacola").setAttribute("aria-hidden", "true");
  $("#fundo").hidden = true;
}
$("#abrirSacola").addEventListener("click", abrirSacola);
$("#fecharSacola").addEventListener("click", fecharSacola);
$("#fundo").addEventListener("click", fecharSacola);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharSacola(); });

$("#finalizar").addEventListener("click", () => {
  const itens = itensSacola();
  if (!itens.length) return;
  const total = itens.reduce((s, l) => s + (l.preco || 0), 0);
  const linhas = itens.map((l) => `• ${l.titulo} (${l.codigo}) — ${l.preco != null ? brl(l.preco) : "a consultar"}`);
  const msg = [
    `Olá! Vi no site do ${CONFIG.nome} e quero estes livros:`,
    "",
    ...linhas,
    "",
    `Total: ${brl(total)}${itens.some((l) => l.preco == null) ? " (+ itens a consultar)" : ""}`,
    "",
    "Meu bairro é: ",
  ].join("\n");
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
});

// ---------- detalhe ----------
function abrirDetalhe(codigo) {
  const l = livros.find((x) => x.codigo === codigo);
  if (!l) return;
  const linha = (rot, val) => (val ? `<dt>${rot}</dt><dd>${esc(val)}</dd>` : "");
  $("#detalheConteudo").innerHTML = `
    <img src="capas/${l.codigo}.jpg" alt="Capa de ${esc(l.titulo)}">
    <div class="detalhe-txt">
      <h3>${esc(l.titulo)}</h3>
      ${l.descricao ? `<p class="descricao">${esc(l.descricao)}</p>` : ""}
      <dl>
        ${linha("Autor", l.autor)}
        ${linha("Ilustração", l.ilustrador)}
        ${linha("Editora", l.editora)}
        ${linha("Idade", l.idade)}
        ${linha("Estado", "Usado")}
        ${linha("Código", l.codigo)}
      </dl>
      ${htmlPreco(l)}
      ${htmlBotao(l)}
    </div>`;
  const d = $("#detalhe");
  if (!d.open) d.showModal();
}
$("#fecharDetalhe").addEventListener("click", () => $("#detalhe").close());
$("#detalhe").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

// ---------- aviso ----------
let tAviso;
function avisar(txt) {
  const a = $("#aviso");
  a.textContent = txt;
  a.classList.add("ver");
  clearTimeout(tAviso);
  tAviso = setTimeout(() => a.classList.remove("ver"), 1600);
}

render();
renderSacola();

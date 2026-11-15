/* Halaman design system: merender token dari JSON (body[data-token]), membangun sisi kiri dari <section data-grup>,
   mengisi "Lihat kode" dari pratinjau, menyalin nama token, ganti tema, skala slide. Tanpa pustaka. */
const akar = document.documentElement;
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* tema: sama dengan halaman lain (localStorage "pk-tema"); tanpa pilihan tersimpan ikut sistem */
const gelap = () => (akar.dataset.theme || (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light")) === "dark";
try { const t = JSON.parse(localStorage.getItem("pk-tema")); if (t) akar.dataset.theme = t; } catch (e) {}

/* kelompok warna menurut nama token; urutan di sini = urutan tampil */
const KELOMPOK = [
  ["Inti", null],
  ["Status dan skala bahaya", /^(f\d|ok|warn|bad|info|naik|turun|merah|biru)$/],
  ["Header dan logo", /^(logo|header)-/],
  ["Tint", /^tint-/],
  ["Keluarga bencana", /^kategori-/],
  ["Skala data", /^((api|air|emas|netral)-\d|skala-netral)/],
  ["Status resmi", /^status-/],
  ["Di atas navy", /-di-navy$/],
];
const kelompok = n => (KELOMPOK.find(([, re]) => re && re.test(n)) || KELOMPOK[0])[0];
const nilai = (v, g) => typeof v === "string" ? v : v[g ? "dark" : "light"] ?? Object.values(v)[0];

function pasang(tok) {   // token jadi variabel CSS di :root, mengikuti tema yang sedang tampil
  const g = gelap();
  for (const k of ["color", "spacing", "radius", "shadow", "size"])
    for (const t of tok[k]?.tokens || []) akar.style.setProperty("--" + t.name, nilai(t.value, g));
  for (const [n, v] of Object.entries(tok.type?.families || {})) akar.style.setProperty("--font-" + n, v);
}

function render(tok) {
  const g = gelap(), isi = {};
  const grup = {};
  for (const t of tok.color.tokens) (grup[kelompok(t.name)] ||= []).push(t);
  isi.warna = KELOMPOK.filter(([n]) => grup[n]).map(([n]) =>
    `<h3>${n}<small>${grup[n].length} token</small></h3><div class="ds-warna">` + grup[n].map(t =>
      `<button class="ds-sw" data-salin="var(--${esc(t.name)})" title="${esc(t.usage)}"><i style="background:${esc(nilai(t.value, g))}"></i><b>${esc(t.name)}</b><span>${esc(nilai(t.value, g))}</span></button>`).join("") + "</div>").join("");
  isi.huruf = tok.type.groups.map(gr => `<h3>${esc(gr.name)}<small>${esc(tok.type.families[gr.family])}</small></h3><div class="ds-baris">` + gr.styles.map(s =>
    `<div><div class="ds-ctoh" style="font-family:var(--font-${esc(gr.family)});font-size:${esc(s.fontSize)};line-height:${s.lineHeight};font-weight:${s.fontWeight};letter-spacing:${esc(s.letterSpacing || "normal")}">${esc(s.sample)}</div>` +
    `<div class="ds-ket"><b>${esc(s.name)}</b><span>${esc(s.fontSize)}, tinggi baris ${String(s.lineHeight).replace(".", ",")}, tebal ${s.fontWeight}</span><span>${esc(s.usage)}</span></div></div>`).join("") + "</div>").join("");
  const baris = (kunci, contoh) => (tok[kunci]?.tokens || []).length ? '<div class="ds-baris">' + tok[kunci].tokens.map(t =>
    `<div><div class="ds-ctoh">${contoh(nilai(t.value, g))}</div><div class="ds-ket"><b>${esc(t.name)}</b><span>${esc(nilai(t.value, g))}</span><span>${esc(t.usage)}</span></div></div>`).join("") + "</div>" : "";
  isi.jarak = baris("spacing", v => `<div class="ds-bilah" style="width:${esc(v)}"></div>`);
  isi.radius = baris("radius", v => `<div class="ds-kotak" style="border-radius:${esc(v)}"></div>`);
  isi.bayangan = baris("shadow", v => `<div class="ds-bayang" style="box-shadow:${esc(v)}"></div>`);
  isi.ukuran = baris("size", v => `<div class="ds-bilah" style="width:min(100%,${esc(v)})"></div>`);
  for (const el of $$("[data-ds]")) {
    el.innerHTML = isi[el.dataset.ds] || "";
    if (!isi[el.dataset.ds]) el.closest("[data-kosong-sembunyi]")?.setAttribute("hidden", "");
  }
  for (const el of $$("[data-hitung]")) el.textContent = (tok[el.dataset.hitung]?.tokens || tok.type.groups.flatMap(x => x.styles)).length;
}

/* sisi kiri: satu tautan per <section id data-grup>, judulnya h2 (atau h1) seksi itu */
function sisi() {
  const nav = $("#ds-nav"); let grup = "";
  const nama = s => s.dataset.nama || $("h2,h1", s).textContent;
  nav.innerHTML = $$(".ds-isi section[id]").map(s => {
    const kepala = s.dataset.grup !== grup ? `<span class="lbl">${esc(grup = s.dataset.grup)}</span>` : "";
    return `${kepala}<a href="#${s.id}">${esc(nama(s))}</a>`;
  }).join("") + '<p class="ds-kosong" hidden>Tidak ada yang cocok.</p>';
  const tautan = $$("a", nav), remah = $("#ds-remah");
  const tandai = id => { for (const a of tautan) a.setAttribute("aria-current", a.hash === "#" + id);
    const s = document.getElementById(id); remah.innerHTML = `${esc(s.dataset.grup)} <i>/</i> <b>${esc(nama(s))}</b>`; };
  const io = new IntersectionObserver(es => { const e = es.filter(x => x.isIntersecting)[0]; if (e) tandai(e.target.id); }, {rootMargin: "-125px 0px -65% 0px"});
  $$(".ds-isi section[id]").forEach(s => io.observe(s));
  tandai($$(".ds-isi section[id]")[0].id);
  nav.addEventListener("click", e => {   // ponsel: daftar isi ditutup dulu, baru gulir, supaya sasaran tidak bergeser
    const a = e.target.closest("a"); if (!a || !$(".ds").classList.contains("buka")) return;
    e.preventDefault(); $(".ds").classList.remove("buka"); $("#ds-menu").setAttribute("aria-expanded", "false");
    history.replaceState(null, "", a.hash); document.getElementById(a.hash.slice(1)).scrollIntoView({behavior: "instant"});
  });
  $("#ds-cari").addEventListener("input", e => {
    const q = e.target.value.trim().toLowerCase(); let ada = 0;
    for (const a of tautan) { const cocok = !q || (a.textContent + " " + document.getElementById(a.hash.slice(1)).textContent).toLowerCase().includes(q); a.hidden = !cocok; ada += cocok; }
    $$(".lbl", nav).forEach(l => { let n = l.nextElementSibling, tampil = false; while (n && n.tagName === "A") { tampil ||= !n.hidden; n = n.nextElementSibling; } l.hidden = !tampil; });
    $(".ds-kosong", nav).hidden = ada > 0;
  });
}

/* "Lihat kode": markup pratinjau apa adanya, supaya contoh dan kodenya tidak pernah berbeda */
function kode() {
  for (const pk of $$(".ds-pk")) {
    const p = $(".ds-pratinjau", pk); if (!p) continue;
    const d = document.createElement("details");
    d.innerHTML = "<summary>Lihat kode</summary><pre><code></code></pre>";
    $("code", d).textContent = p.innerHTML.trim().replace(/></g, ">\n<");
    pk.append(d);
  }
}

function toast(t) { const el = $("#ds-toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 1600); }

/* slide 960x540 diskalakan ke lebar wadahnya */
const ukur = new ResizeObserver(es => { for (const e of es) e.target.firstElementChild.style.transform = `scale(${e.contentRect.width / 960})`; });

async function mulai() {
  sisi(); kode();
  $$(".ds-slide").forEach(s => ukur.observe(s));
  const tok = await (await fetch(document.body.dataset.token)).json();
  const segar = () => { pasang(tok); render(tok); };
  segar();
  if (location.hash.length > 1) document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior: "instant"});   // token baru terpasang: tinggi halaman berubah
  matchMedia("(prefers-color-scheme:dark)").addEventListener("change", segar);
  $("#ds-tema").addEventListener("click", () => {
    akar.dataset.theme = gelap() ? "light" : "dark";
    try { localStorage.setItem("pk-tema", JSON.stringify(akar.dataset.theme)); } catch (e) {}
    segar();
  });
  $("#ds-menu").addEventListener("click", e => {
    const buka = $(".ds").classList.toggle("buka"); e.currentTarget.setAttribute("aria-expanded", buka);
    if (buka) scrollTo({top: 0, behavior: "instant"});   // daftar isi ada di puncak halaman
  });
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-salin]");
    if (b) navigator.clipboard?.writeText(b.dataset.salin).then(() => toast(b.dataset.salin + " disalin"), () => toast("Gagal menyalin"));
    const s = e.target.closest(".seg button");   // segmen di pratinjau bisa dicoba
    if (s) for (const x of $$("button", s.parentElement)) x.setAttribute("aria-pressed", x === s);
  });
}
mulai();
